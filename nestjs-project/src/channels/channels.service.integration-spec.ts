import { DataSource, Repository } from 'typeorm';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { VerificationToken } from '../auth/entities/verification-token.entity';
import {
  cleanAllTables,
  createTestDataSource,
} from '../test/create-test-data-source';
import { User } from '../users/entities/user.entity';
import {
  Video,
  VideoCategory,
  VideoStatus,
  VideoVisibility,
} from '../videos/entities/video.entity';
import { ChannelsService } from './channels.service';
import { Channel } from './entities/channel.entity';

const ALL_ENTITIES = [User, Channel, RefreshToken, VerificationToken, Video];

describe('ChannelsService (integration)', () => {
  let dataSource: DataSource;
  let channelsService: ChannelsService;
  let userRepository: Repository<User>;
  let channelRepository: Repository<Channel>;
  let videoRepository: Repository<Video>;

  beforeAll(async () => {
    dataSource = createTestDataSource(ALL_ENTITIES);
    await dataSource.initialize();
    userRepository = dataSource.getRepository(User);
    channelRepository = dataSource.getRepository(Channel);
    videoRepository = dataSource.getRepository(Video);
    channelsService = new ChannelsService(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await cleanAllTables(dataSource);
  });

  let userCounter = 0;
  async function createUser(): Promise<User> {
    return userRepository.save(
      userRepository.create({
        email: `ch_svc_${++userCounter}@example.com`,
        password: 'hashed',
      }),
    );
  }

  describe('createChannel', () => {
    it('persists a channel derived from email', async () => {
      const user = await createUser();

      const channel = await channelsService.createChannel(
        user.id,
        'mynick@example.com',
      );

      expect(channel.id).toBeDefined();
      expect(channel.nickname).toBe('mynick');
      expect(channel.name).toBe('mynick');
      expect(channel.user_id).toBe(user.id);

      const persisted = await channelRepository.findOneBy({ user_id: user.id });
      expect(persisted).not.toBeNull();
      expect(persisted!.nickname).toBe('mynick');
    });

    it('derives nickname from email prefix', async () => {
      const user = await createUser();

      const channel = await channelsService.createChannel(
        user.id,
        'John.Doe+tag@example.com',
      );

      expect(channel.nickname).toBe('johndoetag');
    });

    it('resolves nickname collision by appending a suffix', async () => {
      const user1 = await createUser();
      const user2 = await createUser();

      await channelsService.createChannel(user1.id, 'shared@example.com');
      const channel2 = await channelsService.createChannel(
        user2.id,
        'shared@example.com',
      );

      expect(channel2.nickname).toMatch(/^shared_[a-z0-9]{3}$/);

      const channels = await channelRepository.find();
      expect(channels).toHaveLength(2);
    });
  });

  describe('findByUserId', () => {
    it('returns the channel owned by the given user', async () => {
      const user = await createUser();
      await channelsService.createChannel(user.id, 'findme@example.com');

      const channel = await channelsService.findByUserId(user.id);

      expect(channel.user_id).toBe(user.id);
      expect(channel.nickname).toBe('findme');
    });

    it('rejects when the user has no channel', async () => {
      await expect(
        channelsService.findByUserId('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow();
    });
  });

  async function createChannelWithVideos(
    email: string,
  ): Promise<{ user: User; channel: Channel }> {
    const user = await createUser();
    const channel = await channelsService.createChannel(user.id, email);
    return { user, channel };
  }

  async function createVideo(
    channel: Channel,
    overrides: Partial<Video> = {},
  ): Promise<Video> {
    return videoRepository.save(
      videoRepository.create({
        user_id: channel.user_id,
        channel_id: channel.id,
        storage_key: `videos/${channel.id}-${Math.random()}.mp4`,
        ...overrides,
      }),
    );
  }

  describe('findVideosForOwner', () => {
    it('returns every status and visibility for the own channel, paginated', async () => {
      const { user, channel } =
        await createChannelWithVideos('owner1@example.com');
      await createVideo(channel, { status: VideoStatus.DRAFT });
      await createVideo(channel, {
        status: VideoStatus.READY,
        visibility: VideoVisibility.UNLISTED,
      });
      await createVideo(channel, {
        status: VideoStatus.READY,
        visibility: VideoVisibility.PUBLIC,
        published_at: new Date(),
      });

      const result = await channelsService.findVideosForOwner(user.id, {});

      expect(result.total).toBe(3);
      expect(result.items).toHaveLength(3);
      expect(result.items.every((item) => item.views === 0)).toBe(true);
    });

    it('filters by visibility', async () => {
      const { user, channel } =
        await createChannelWithVideos('owner2@example.com');
      await createVideo(channel, { visibility: VideoVisibility.UNLISTED });
      await createVideo(channel, { visibility: VideoVisibility.PUBLIC });

      const result = await channelsService.findVideosForOwner(user.id, {
        visibility: VideoVisibility.PUBLIC,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].visibility).toBe(VideoVisibility.PUBLIC);
    });

    it('filters by title substring search', async () => {
      const { user, channel } =
        await createChannelWithVideos('owner3@example.com');
      await createVideo(channel, { title: 'How to bake bread' });
      await createVideo(channel, { title: 'Guitar lessons' });

      const result = await channelsService.findVideosForOwner(user.id, {
        search: 'bread',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('How to bake bread');
    });

    it('paginates results', async () => {
      const { user, channel } =
        await createChannelWithVideos('owner4@example.com');
      for (let i = 0; i < 3; i++) {
        await createVideo(channel);
      }

      const result = await channelsService.findVideosForOwner(user.id, {
        page: 2,
        limit: 2,
      });

      expect(result.total).toBe(3);
      expect(result.items).toHaveLength(1);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(2);
    });
  });

  describe('findPublicVideos', () => {
    it('excludes draft, unlisted, and unpublished videos', async () => {
      const { channel } = await createChannelWithVideos('public1@example.com');
      await createVideo(channel, { status: VideoStatus.DRAFT });
      await createVideo(channel, {
        status: VideoStatus.READY,
        visibility: VideoVisibility.UNLISTED,
        published_at: new Date(),
      });
      await createVideo(channel, {
        status: VideoStatus.READY,
        visibility: VideoVisibility.PUBLIC,
        published_at: null,
      });
      const published = await createVideo(channel, {
        status: VideoStatus.READY,
        visibility: VideoVisibility.PUBLIC,
        published_at: new Date(),
        category: VideoCategory.MUSIC,
      });

      const result = await channelsService.findPublicVideos(
        channel.nickname,
        {},
      );

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe(published.id);
    });

    it('throws ChannelNotFoundException for an unknown nickname', async () => {
      await expect(
        channelsService.findPublicVideos('no-such-channel', {}),
      ).rejects.toThrow();
    });
  });
});
