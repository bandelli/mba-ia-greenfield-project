import { DataSource, Repository } from 'typeorm';
import { Channel } from '../channels/entities/channel.entity';
import { VideoNotFoundException } from '../common/exceptions/domain.exception';
import {
  cleanAllTables,
  createTestDataSource,
  ALL_APP_ENTITIES,
} from '../test/create-test-data-source';
import { User } from '../users/entities/user.entity';
import { Video, VideoStatus, VideoVisibility } from './entities/video.entity';
import { ReactionType, VideoReaction } from './entities/video-reaction.entity';
import { VideoReactionService } from './video-reaction.service';
import { VideosService } from './videos.service';

describe('VideoReactionService (integration)', () => {
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let channelRepository: Repository<Channel>;
  let videoRepository: Repository<Video>;
  let videoReactionRepository: Repository<VideoReaction>;
  let service: VideoReactionService;

  beforeAll(async () => {
    dataSource = createTestDataSource(ALL_APP_ENTITIES);
    await dataSource.initialize();
    userRepository = dataSource.getRepository(User);
    channelRepository = dataSource.getRepository(Channel);
    videoRepository = dataSource.getRepository(Video);
    videoReactionRepository = dataSource.getRepository(VideoReaction);

    const videosService = new VideosService(
      videoRepository,
      videoReactionRepository,
    );
    service = new VideoReactionService(dataSource, videosService);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await cleanAllTables(dataSource);
  });

  let counter = 0;
  async function createUser(): Promise<User> {
    const n = ++counter;
    return userRepository.save(
      userRepository.create({
        email: `reaction_svc_user_${n}@example.com`,
        password: 'hashed',
      }),
    );
  }

  async function createPublicVideo(): Promise<Video> {
    const n = ++counter;
    const owner = await createUser();
    const channel = await channelRepository.save(
      channelRepository.create({
        name: `Channel ${n}`,
        nickname: `reactsvcchan${n}`,
        user_id: owner.id,
      }),
    );
    return videoRepository.save(
      videoRepository.create({
        user_id: owner.id,
        channel_id: channel.id,
        storage_key: `videos/reaction-svc-${n}.mp4`,
        status: VideoStatus.READY,
        visibility: VideoVisibility.PUBLIC,
        published_at: new Date(),
      }),
    );
  }

  it('increments likes_count when a new like is set', async () => {
    const user = await createUser();
    const video = await createPublicVideo();

    const result = await service.setReaction(
      user.id,
      video.public_id,
      ReactionType.LIKE,
    );

    expect(result).toEqual({
      type: ReactionType.LIKE,
      likesCount: 1,
      dislikesCount: 0,
    });
    const reloaded = await videoRepository.findOneByOrFail({ id: video.id });
    expect(reloaded.likes_count).toBe(1);
  });

  it('is idempotent when the same reaction is set twice sequentially', async () => {
    const user = await createUser();
    const video = await createPublicVideo();

    await service.setReaction(user.id, video.public_id, ReactionType.LIKE);
    const result = await service.setReaction(
      user.id,
      video.public_id,
      ReactionType.LIKE,
    );

    expect(result.likesCount).toBe(1);
    const count = await videoReactionRepository.count({
      where: { user_id: user.id, video_id: video.id },
    });
    expect(count).toBe(1);
  });

  it('flips like to dislike, moving both counters in one step', async () => {
    const user = await createUser();
    const video = await createPublicVideo();
    await service.setReaction(user.id, video.public_id, ReactionType.LIKE);

    const result = await service.setReaction(
      user.id,
      video.public_id,
      ReactionType.DISLIKE,
    );

    expect(result).toEqual({
      type: ReactionType.DISLIKE,
      likesCount: 0,
      dislikesCount: 1,
    });
    const reactions = await videoReactionRepository.find({
      where: { user_id: user.id, video_id: video.id },
    });
    expect(reactions).toHaveLength(1);
    expect(reactions[0].type).toBe(ReactionType.DISLIKE);
  });

  it('removes the reaction and decrements the counter when type is null', async () => {
    const user = await createUser();
    const video = await createPublicVideo();
    await service.setReaction(user.id, video.public_id, ReactionType.LIKE);

    const result = await service.setReaction(user.id, video.public_id, null);

    expect(result).toEqual({
      type: null,
      likesCount: 0,
      dislikesCount: 0,
    });
    const count = await videoReactionRepository.count({
      where: { user_id: user.id, video_id: video.id },
    });
    expect(count).toBe(0);
  });

  it('never creates more than one reaction row under concurrent identical requests', async () => {
    const user = await createUser();
    const video = await createPublicVideo();

    const results = await Promise.all([
      service.setReaction(user.id, video.public_id, ReactionType.LIKE),
      service.setReaction(user.id, video.public_id, ReactionType.LIKE),
    ]);

    for (const result of results) {
      expect(result.type).toBe(ReactionType.LIKE);
    }
    const count = await videoReactionRepository.count({
      where: { user_id: user.id, video_id: video.id },
    });
    expect(count).toBe(1);
    const reloaded = await videoRepository.findOneByOrFail({ id: video.id });
    expect(reloaded.likes_count).toBe(1);
  });

  it('enforces the unique (user_id, video_id) constraint and leaves consistent counters under concurrent differing requests', async () => {
    const user = await createUser();
    const video = await createPublicVideo();

    await Promise.all([
      service.setReaction(user.id, video.public_id, ReactionType.LIKE),
      service.setReaction(user.id, video.public_id, ReactionType.DISLIKE),
    ]);

    const reactions = await videoReactionRepository.find({
      where: { user_id: user.id, video_id: video.id },
    });
    expect(reactions).toHaveLength(1);

    const reloaded = await videoRepository.findOneByOrFail({ id: video.id });
    const finalType = reactions[0].type;
    if (finalType === ReactionType.LIKE) {
      expect(reloaded.likes_count).toBe(1);
      expect(reloaded.dislikes_count).toBe(0);
    } else {
      expect(reloaded.likes_count).toBe(0);
      expect(reloaded.dislikes_count).toBe(1);
    }
  });

  it('throws VideoNotFoundException for a publicId that does not resolve to a public video', async () => {
    const user = await createUser();

    await expect(
      service.setReaction(user.id, 'does-not-exist', ReactionType.LIKE),
    ).rejects.toThrow(VideoNotFoundException);
  });
});
