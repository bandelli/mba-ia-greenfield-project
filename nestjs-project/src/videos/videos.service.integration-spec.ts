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
import { VideosService } from './videos.service';

const ALL_ENTITIES = [User, Channel, RefreshToken, VerificationToken, Video];

describe('VideosService (integration)', () => {
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let channelRepository: Repository<Channel>;
  let videoRepository: Repository<Video>;
  let service: VideosService;

  beforeAll(async () => {
    dataSource = createTestDataSource(ALL_ENTITIES);
    await dataSource.initialize();
    userRepository = dataSource.getRepository(User);
    channelRepository = dataSource.getRepository(Channel);
    videoRepository = dataSource.getRepository(Video);

    service = new VideosService(videoRepository);
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

    it('throws VideoNotFoundException for a draft video', async () => {
      const video = await createVideo({ status: VideoStatus.DRAFT });

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
