import { DataSource, Repository } from 'typeorm';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';
import { VerificationToken } from '../../auth/entities/verification-token.entity';
import { Channel } from '../../channels/entities/channel.entity';
import {
  cleanAllTables,
  createTestDataSource,
} from '../../test/create-test-data-source';
import { User } from '../../users/entities/user.entity';
import {
  Video,
  VideoCategory,
  VideoStatus,
  VideoVisibility,
} from './video.entity';

const ALL_ENTITIES = [User, Channel, RefreshToken, VerificationToken, Video];

describe('Video entity (integration)', () => {
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let channelRepository: Repository<Channel>;
  let videoRepository: Repository<Video>;

  beforeAll(async () => {
    dataSource = createTestDataSource(ALL_ENTITIES);
    await dataSource.initialize();
    userRepository = dataSource.getRepository(User);
    channelRepository = dataSource.getRepository(Channel);
    videoRepository = dataSource.getRepository(Video);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await cleanAllTables(dataSource);
  });

  let counter = 0;
  async function createOwner(): Promise<{ user: User; channel: Channel }> {
    const n = ++counter;
    const user = await userRepository.save(
      userRepository.create({
        email: `video_owner_${n}@example.com`,
        password: 'hashed',
      }),
    );
    const channel = await channelRepository.save(
      channelRepository.create({
        name: `Channel ${n}`,
        nickname: `chan${n}`,
        user_id: user.id,
      }),
    );
    return { user, channel };
  }

  it('should default status to draft and processing_error to null', async () => {
    const { user, channel } = await createOwner();

    const video = await videoRepository.save(
      videoRepository.create({
        user_id: user.id,
        channel_id: channel.id,
        storage_key: 'videos/draft-key.mp4',
      }),
    );

    expect(video.status).toBe(VideoStatus.DRAFT);
    expect(video.processing_error).toBeNull();
  });

  it('should default thumbnail_key to null', async () => {
    const { user, channel } = await createOwner();

    const video = await videoRepository.save(
      videoRepository.create({
        user_id: user.id,
        channel_id: channel.id,
        storage_key: 'videos/draft-key.mp4',
      }),
    );

    expect(video.thumbnail_key).toBeNull();
  });

  it('should default category to other, visibility to public, and published_at to null', async () => {
    const { user, channel } = await createOwner();

    const video = await videoRepository.save(
      videoRepository.create({
        user_id: user.id,
        channel_id: channel.id,
        storage_key: 'videos/draft-key.mp4',
      }),
    );

    expect(video.category).toBe(VideoCategory.OTHER);
    expect(video.visibility).toBe(VideoVisibility.PUBLIC);
    expect(video.published_at).toBeNull();
  });

  it('should default views to 0', async () => {
    const { user, channel } = await createOwner();

    const video = await videoRepository.save(
      videoRepository.create({
        user_id: user.id,
        channel_id: channel.id,
        storage_key: 'videos/draft-key.mp4',
      }),
    );

    expect(video.views).toBe(0);
  });

  it('should default title and description to null', async () => {
    const { user, channel } = await createOwner();

    const video = await videoRepository.save(
      videoRepository.create({
        user_id: user.id,
        channel_id: channel.id,
        storage_key: 'videos/draft-key.mp4',
      }),
    );

    expect(video.title).toBeNull();
    expect(video.description).toBeNull();
  });

  it('should auto-generate a unique public_id at insert time', async () => {
    const { user, channel } = await createOwner();

    const video = await videoRepository.save(
      videoRepository.create({
        user_id: user.id,
        channel_id: channel.id,
        storage_key: 'videos/draft-key.mp4',
      }),
    );

    expect(video.public_id).toBeTruthy();
    expect(video.public_id.length).toBeGreaterThan(0);
  });

  it('should enforce unique public_id constraint', async () => {
    const { user, channel } = await createOwner();
    const fixedId = 'fixed-public-id-1234';

    await videoRepository.save(
      videoRepository.create({
        user_id: user.id,
        channel_id: channel.id,
        storage_key: 'videos/key-1.mp4',
        public_id: fixedId,
      }),
    );

    await expect(
      videoRepository.save(
        videoRepository.create({
          user_id: user.id,
          channel_id: channel.id,
          storage_key: 'videos/key-2.mp4',
          public_id: fixedId,
        }),
      ),
    ).rejects.toThrow();
  });

  it('should reject insert without user_id', async () => {
    const { channel } = await createOwner();

    await expect(
      videoRepository.save(
        videoRepository.create({
          channel_id: channel.id,
          storage_key: 'videos/key.mp4',
        } as Partial<Video>),
      ),
    ).rejects.toThrow();
  });

  it('should reject insert without channel_id', async () => {
    const { user } = await createOwner();

    await expect(
      videoRepository.save(
        videoRepository.create({
          user_id: user.id,
          storage_key: 'videos/key.mp4',
        } as Partial<Video>),
      ),
    ).rejects.toThrow();
  });

  it('should reject insert without storage_key', async () => {
    const { user, channel } = await createOwner();

    await expect(
      videoRepository.save(
        videoRepository.create({
          user_id: user.id,
          channel_id: channel.id,
        } as Partial<Video>),
      ),
    ).rejects.toThrow();
  });

  it('should transition status and persist processing_error on error', async () => {
    const { user, channel } = await createOwner();
    const video = await videoRepository.save(
      videoRepository.create({
        user_id: user.id,
        channel_id: channel.id,
        storage_key: 'videos/draft-key.mp4',
      }),
    );

    video.status = VideoStatus.ERROR;
    video.processing_error = 'ffprobe: unsupported codec';
    await videoRepository.save(video);

    const found = await videoRepository.findOneByOrFail({ id: video.id });
    expect(found.status).toBe(VideoStatus.ERROR);
    expect(found.processing_error).toBe('ffprobe: unsupported codec');
  });

  it('should persist thumbnail_key once processing succeeds', async () => {
    const { user, channel } = await createOwner();
    const video = await videoRepository.save(
      videoRepository.create({
        user_id: user.id,
        channel_id: channel.id,
        storage_key: 'videos/draft-key.mp4',
      }),
    );

    video.status = VideoStatus.READY;
    video.thumbnail_key = 'thumbnails/draft-key.png';
    await videoRepository.save(video);

    const found = await videoRepository.findOneByOrFail({ id: video.id });
    expect(found.status).toBe(VideoStatus.READY);
    expect(found.thumbnail_key).toBe('thumbnails/draft-key.png');
  });

  it('should load the related user and channel via the ManyToOne relations', async () => {
    const { user, channel } = await createOwner();
    const video = await videoRepository.save(
      videoRepository.create({
        user_id: user.id,
        channel_id: channel.id,
        storage_key: 'videos/draft-key.mp4',
      }),
    );

    const found = await videoRepository.findOne({
      where: { id: video.id },
      relations: ['user', 'channel'],
    });

    expect(found?.user.email).toBe(user.email);
    expect(found?.channel.nickname).toBe(channel.nickname);
  });
});
