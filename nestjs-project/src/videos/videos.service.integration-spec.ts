import { DataSource, Repository } from 'typeorm';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { VerificationToken } from '../auth/entities/verification-token.entity';
import { Channel } from '../channels/entities/channel.entity';
import {
  cleanAllTables,
  createTestDataSource,
} from '../test/create-test-data-source';
import { User } from '../users/entities/user.entity';
import { VideoNotFoundException } from '../common/exceptions/domain.exception';
import {
  Video,
  VideoCategory,
  VideoStatus,
  VideoVisibility,
} from './entities/video.entity';
import { ReactionType, VideoReaction } from './entities/video-reaction.entity';
import { VideosService } from './videos.service';

const ALL_ENTITIES = [
  User,
  Channel,
  RefreshToken,
  VerificationToken,
  Video,
  VideoReaction,
];

describe('VideosService (integration)', () => {
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let channelRepository: Repository<Channel>;
  let videoRepository: Repository<Video>;
  let videoReactionRepository: Repository<VideoReaction>;
  let service: VideosService;

  beforeAll(async () => {
    dataSource = createTestDataSource(ALL_ENTITIES);
    await dataSource.initialize();
    userRepository = dataSource.getRepository(User);
    channelRepository = dataSource.getRepository(Channel);
    videoRepository = dataSource.getRepository(Video);
    videoReactionRepository = dataSource.getRepository(VideoReaction);

    service = new VideosService(videoRepository, videoReactionRepository);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await cleanAllTables(dataSource);
  });

  let counter = 0;
  async function createVideo(overrides: Partial<Video> = {}): Promise<Video> {
    const n = ++counter;
    const user = await userRepository.save(
      userRepository.create({
        email: `public_watch_owner_${n}@example.com`,
        password: 'hashed',
      }),
    );
    const channel = await channelRepository.save(
      channelRepository.create({
        name: `Public Watch Channel ${n}`,
        nickname: `publicwatch${n}`,
        user_id: user.id,
      }),
    );
    return videoRepository.save(
      videoRepository.create({
        user_id: user.id,
        channel_id: channel.id,
        storage_key: `videos/public-watch-${n}.mp4`,
        status: VideoStatus.READY,
        visibility: VideoVisibility.PUBLIC,
        title: `Video ${n}`,
        views: 5,
        published_at: new Date(),
        ...overrides,
      }),
    );
  }

  describe('findPublicVideo', () => {
    it('returns metadata with the channel joined for a ready+public video', async () => {
      const video = await createVideo({ visibility: VideoVisibility.PUBLIC });
      const channel = await channelRepository.findOneByOrFail({
        id: video.channel_id,
      });

      const result = await service.findPublicVideo(video.public_id);

      expect(result).toMatchObject({
        id: video.id,
        public_id: video.public_id,
        title: video.title,
        visibility: VideoVisibility.PUBLIC,
        channel: { nickname: channel.nickname, name: channel.name },
      });
    });

    it('includes the channel subscribersCount, defaulting to 0', async () => {
      const video = await createVideo();

      const result = await service.findPublicVideo(video.public_id);

      expect(result.channel.subscribersCount).toBe(0);
    });

    it('includes likesCount/dislikesCount and a null currentUserReaction for an anonymous caller', async () => {
      const video = await createVideo({ likes_count: 4, dislikes_count: 1 });

      const result = await service.findPublicVideo(video.public_id);

      expect(result.likesCount).toBe(4);
      expect(result.dislikesCount).toBe(1);
      expect(result.currentUserReaction).toBeNull();
    });

    it('reflects the real reaction for the authenticated caller', async () => {
      const video = await createVideo();
      const reactor = await userRepository.save(
        userRepository.create({
          email: `public_watch_reactor_${++counter}@example.com`,
          password: 'hashed',
        }),
      );
      await videoReactionRepository.save(
        videoReactionRepository.create({
          user_id: reactor.id,
          video_id: video.id,
          type: ReactionType.LIKE,
        }),
      );

      const result = await service.findPublicVideo(video.public_id, reactor.id);

      expect(result.currentUserReaction).toBe(ReactionType.LIKE);
    });

    it('returns metadata for a ready+unlisted video (direct-link access)', async () => {
      const video = await createVideo({
        visibility: VideoVisibility.UNLISTED,
      });

      const result = await service.findPublicVideo(video.public_id);

      expect(result.visibility).toBe(VideoVisibility.UNLISTED);
    });

    it('atomically increments views in the database on each successful call', async () => {
      const video = await createVideo({ views: 5 });

      const result = await service.findPublicVideo(video.public_id);

      expect(result.views).toBe(6);
      const reloaded = await videoRepository.findOneByOrFail({ id: video.id });
      expect(reloaded.views).toBe(6);
    });

    it('returns the true post-increment views count under concurrent calls', async () => {
      const video = await createVideo({ views: 5 });

      const [first, second] = await Promise.all([
        service.findPublicVideo(video.public_id),
        service.findPublicVideo(video.public_id),
      ]);

      expect([first.views, second.views].sort()).toEqual([6, 7]);
      const reloaded = await videoRepository.findOneByOrFail({ id: video.id });
      expect(reloaded.views).toBe(7);
    });

    it('throws VideoNotFoundException for a draft video', async () => {
      const video = await createVideo({ status: VideoStatus.DRAFT });

      await expect(service.findPublicVideo(video.public_id)).rejects.toThrow(
        VideoNotFoundException,
      );
    });

    it('throws VideoNotFoundException for a ready+public video that has not been published yet', async () => {
      const video = await createVideo({ published_at: null });

      await expect(service.findPublicVideo(video.public_id)).rejects.toThrow(
        VideoNotFoundException,
      );
    });

    it('throws VideoNotFoundException for an unknown public_id', async () => {
      await expect(service.findPublicVideo('does-not-exist')).rejects.toThrow(
        VideoNotFoundException,
      );
    });
  });

  describe('findSuggestedVideos', () => {
    it('returns only same-category, ready+public videos, excluding the anchor and unlisted/other-category/non-ready videos', async () => {
      const anchor = await createVideo({
        category: VideoCategory.MUSIC,
        published_at: new Date('2026-01-01'),
      });
      const sameCategoryPublic = await createVideo({
        category: VideoCategory.MUSIC,
        published_at: new Date('2026-01-02'),
      });
      await createVideo({
        category: VideoCategory.GAMING,
        published_at: new Date('2026-01-03'),
      });
      await createVideo({
        category: VideoCategory.MUSIC,
        visibility: VideoVisibility.UNLISTED,
        published_at: new Date('2026-01-04'),
      });
      await createVideo({
        category: VideoCategory.MUSIC,
        status: VideoStatus.DRAFT,
        published_at: new Date('2026-01-05'),
      });

      const result = await service.findSuggestedVideos(anchor.public_id);

      expect(result.map((v) => v.public_id)).toEqual([
        sameCategoryPublic.public_id,
      ]);
    });

    it('orders results by published_at descending', async () => {
      const anchor = await createVideo({
        category: VideoCategory.MUSIC,
        published_at: new Date('2026-01-01'),
      });
      const older = await createVideo({
        category: VideoCategory.MUSIC,
        published_at: new Date('2026-01-02'),
      });
      const newer = await createVideo({
        category: VideoCategory.MUSIC,
        published_at: new Date('2026-01-03'),
      });

      const result = await service.findSuggestedVideos(anchor.public_id);

      expect(result.map((v) => v.public_id)).toEqual([
        newer.public_id,
        older.public_id,
      ]);
    });

    it('limits the number of results returned', async () => {
      const anchor = await createVideo({
        category: VideoCategory.MUSIC,
        published_at: new Date('2026-01-01'),
      });
      for (let i = 0; i < 3; i++) {
        await createVideo({
          category: VideoCategory.MUSIC,
          published_at: new Date(`2026-01-0${i + 2}`),
        });
      }

      const result = await service.findSuggestedVideos(anchor.public_id, 2);

      expect(result).toHaveLength(2);
    });

    it('throws VideoNotFoundException when the anchor video is not found', async () => {
      await expect(
        service.findSuggestedVideos('does-not-exist'),
      ).rejects.toThrow(VideoNotFoundException);
    });
  });
});
