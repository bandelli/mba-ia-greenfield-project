import { DataSource, Repository } from 'typeorm';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';
import { VerificationToken } from '../../auth/entities/verification-token.entity';
import { Channel } from '../../channels/entities/channel.entity';
import {
  cleanAllTables,
  createTestDataSource,
} from '../../test/create-test-data-source';
import { User } from '../../users/entities/user.entity';
import { Video } from './video.entity';
import { ReactionType, VideoReaction } from './video-reaction.entity';

const ALL_ENTITIES = [
  User,
  Channel,
  RefreshToken,
  VerificationToken,
  Video,
  VideoReaction,
];

describe('VideoReaction entity (integration)', () => {
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let channelRepository: Repository<Channel>;
  let videoRepository: Repository<Video>;
  let videoReactionRepository: Repository<VideoReaction>;

  beforeAll(async () => {
    dataSource = createTestDataSource(ALL_ENTITIES);
    await dataSource.initialize();
    userRepository = dataSource.getRepository(User);
    channelRepository = dataSource.getRepository(Channel);
    videoRepository = dataSource.getRepository(Video);
    videoReactionRepository = dataSource.getRepository(VideoReaction);
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
        email: `video_reaction_user_${n}@example.com`,
        password: 'hashed',
      }),
    );
  }

  async function createVideo(): Promise<Video> {
    const n = ++counter;
    const owner = await createUser();
    const channel = await channelRepository.save(
      channelRepository.create({
        name: `Channel ${n}`,
        nickname: `vreactchan${n}`,
        user_id: owner.id,
      }),
    );
    return videoRepository.save(
      videoRepository.create({
        user_id: owner.id,
        channel_id: channel.id,
        storage_key: `videos/video-reaction-${n}.mp4`,
      }),
    );
  }

  it('should persist a reaction and default type correctly', async () => {
    const user = await createUser();
    const video = await createVideo();

    const reaction = await videoReactionRepository.save(
      videoReactionRepository.create({
        user_id: user.id,
        video_id: video.id,
        type: ReactionType.LIKE,
      }),
    );

    expect(reaction.id).toBeTruthy();
    expect(reaction.type).toBe(ReactionType.LIKE);
  });

  it('should enforce unique (user_id, video_id) constraint', async () => {
    const user = await createUser();
    const video = await createVideo();

    await videoReactionRepository.save(
      videoReactionRepository.create({
        user_id: user.id,
        video_id: video.id,
        type: ReactionType.LIKE,
      }),
    );

    await expect(
      videoReactionRepository.save(
        videoReactionRepository.create({
          user_id: user.id,
          video_id: video.id,
          type: ReactionType.DISLIKE,
        }),
      ),
    ).rejects.toThrow();
  });

  it('should allow the same user to react to different videos', async () => {
    const user = await createUser();
    const video1 = await createVideo();
    const video2 = await createVideo();

    await videoReactionRepository.save(
      videoReactionRepository.create({
        user_id: user.id,
        video_id: video1.id,
        type: ReactionType.LIKE,
      }),
    );
    await videoReactionRepository.save(
      videoReactionRepository.create({
        user_id: user.id,
        video_id: video2.id,
        type: ReactionType.LIKE,
      }),
    );

    const count = await videoReactionRepository.count({
      where: { user_id: user.id },
    });
    expect(count).toBe(2);
  });

  it('should reject insert with a non-existent user_id (FK violation)', async () => {
    const video = await createVideo();

    await expect(
      videoReactionRepository.save(
        videoReactionRepository.create({
          user_id: '00000000-0000-0000-0000-000000000000',
          video_id: video.id,
          type: ReactionType.LIKE,
        }),
      ),
    ).rejects.toThrow();
  });

  it('should reject insert with a non-existent video_id (FK violation)', async () => {
    const user = await createUser();

    await expect(
      videoReactionRepository.save(
        videoReactionRepository.create({
          user_id: user.id,
          video_id: '00000000-0000-0000-0000-000000000000',
          type: ReactionType.LIKE,
        }),
      ),
    ).rejects.toThrow();
  });

  it('should load the related user and video via the ManyToOne relations', async () => {
    const user = await createUser();
    const video = await createVideo();
    const reaction = await videoReactionRepository.save(
      videoReactionRepository.create({
        user_id: user.id,
        video_id: video.id,
        type: ReactionType.LIKE,
      }),
    );

    const found = await videoReactionRepository.findOne({
      where: { id: reaction.id },
      relations: ['user', 'video'],
    });

    expect(found?.user.email).toBe(user.email);
    expect(found?.video.storage_key).toBe(video.storage_key);
  });
});
