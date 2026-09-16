import { DataSource, Repository } from 'typeorm';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { VerificationToken } from '../auth/entities/verification-token.entity';
import {
  CannotSubscribeOwnChannelException,
  ChannelNotFoundException,
} from '../common/exceptions/domain.exception';
import {
  cleanAllTables,
  createTestDataSource,
} from '../test/create-test-data-source';
import { User } from '../users/entities/user.entity';
import { Channel } from './entities/channel.entity';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionService } from './subscription.service';

const ALL_ENTITIES = [
  User,
  Channel,
  RefreshToken,
  VerificationToken,
  Subscription,
];

describe('SubscriptionService (integration)', () => {
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let channelRepository: Repository<Channel>;
  let subscriptionRepository: Repository<Subscription>;
  let service: SubscriptionService;

  beforeAll(async () => {
    dataSource = createTestDataSource(ALL_ENTITIES);
    await dataSource.initialize();
    userRepository = dataSource.getRepository(User);
    channelRepository = dataSource.getRepository(Channel);
    subscriptionRepository = dataSource.getRepository(Subscription);

    service = new SubscriptionService(dataSource);
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
        email: `sub_svc_user_${n}@example.com`,
        password: 'hashed',
      }),
    );
  }

  async function createChannel(): Promise<Channel> {
    const n = ++counter;
    const owner = await createUser();
    return channelRepository.save(
      channelRepository.create({
        name: `Channel ${n}`,
        nickname: `subsvcchan${n}`,
        user_id: owner.id,
      }),
    );
  }

  it('subscribes and increments subscribersCount', async () => {
    const subscriber = await createUser();
    const channel = await createChannel();

    const result = await service.setSubscription(
      subscriber.id,
      channel.nickname,
      true,
    );

    expect(result).toEqual({ subscribed: true, subscribersCount: 1 });
    const reloaded = await channelRepository.findOneByOrFail({
      id: channel.id,
    });
    expect(reloaded.subscribers_count).toBe(1);
  });

  it('is idempotent when subscribing twice sequentially', async () => {
    const subscriber = await createUser();
    const channel = await createChannel();

    await service.setSubscription(subscriber.id, channel.nickname, true);
    const result = await service.setSubscription(
      subscriber.id,
      channel.nickname,
      true,
    );

    expect(result.subscribersCount).toBe(1);
    const count = await subscriptionRepository.count({
      where: { subscriber_user_id: subscriber.id, channel_id: channel.id },
    });
    expect(count).toBe(1);
  });

  it('unsubscribes and decrements subscribersCount', async () => {
    const subscriber = await createUser();
    const channel = await createChannel();
    await service.setSubscription(subscriber.id, channel.nickname, true);

    const result = await service.setSubscription(
      subscriber.id,
      channel.nickname,
      false,
    );

    expect(result).toEqual({ subscribed: false, subscribersCount: 0 });
    const count = await subscriptionRepository.count({
      where: { subscriber_user_id: subscriber.id, channel_id: channel.id },
    });
    expect(count).toBe(0);
  });

  it('is idempotent when unsubscribing without ever having subscribed', async () => {
    const subscriber = await createUser();
    const channel = await createChannel();

    const result = await service.setSubscription(
      subscriber.id,
      channel.nickname,
      false,
    );

    expect(result).toEqual({ subscribed: false, subscribersCount: 0 });
  });

  it('rejects the channel owner subscribing to their own channel', async () => {
    const owner = await createUser();
    const channel = await channelRepository.save(
      channelRepository.create({
        name: 'Own Channel',
        nickname: `subsvcowner${++counter}`,
        user_id: owner.id,
      }),
    );

    await expect(
      service.setSubscription(owner.id, channel.nickname, true),
    ).rejects.toThrow(CannotSubscribeOwnChannelException);
    const reloaded = await channelRepository.findOneByOrFail({
      id: channel.id,
    });
    expect(reloaded.subscribers_count).toBe(0);
  });

  it('throws ChannelNotFoundException for an unknown nickname', async () => {
    const subscriber = await createUser();

    await expect(
      service.setSubscription(subscriber.id, 'no-such-channel', true),
    ).rejects.toThrow(ChannelNotFoundException);
  });

  it('never creates more than one subscription row under concurrent identical requests', async () => {
    const subscriber = await createUser();
    const channel = await createChannel();

    await Promise.all([
      service.setSubscription(subscriber.id, channel.nickname, true),
      service.setSubscription(subscriber.id, channel.nickname, true),
    ]);

    const count = await subscriptionRepository.count({
      where: { subscriber_user_id: subscriber.id, channel_id: channel.id },
    });
    expect(count).toBe(1);
    const reloaded = await channelRepository.findOneByOrFail({
      id: channel.id,
    });
    expect(reloaded.subscribers_count).toBe(1);
  });

  describe('findMySubscriptions', () => {
    it('returns the channels the user follows, with total', async () => {
      const subscriber = await createUser();
      const channelA = await createChannel();
      const channelB = await createChannel();
      await service.setSubscription(subscriber.id, channelA.nickname, true);
      await service.setSubscription(subscriber.id, channelB.nickname, true);

      const result = await service.findMySubscriptions(subscriber.id, {});

      expect(result.total).toBe(2);
      expect(result.items.map((c) => c.nickname).sort()).toEqual(
        [channelA.nickname, channelB.nickname].sort(),
      );
      expect(result.items[0].avatarUrl).toBeNull();
    });

    it('paginates via limit', async () => {
      const subscriber = await createUser();
      for (let i = 0; i < 3; i++) {
        const channel = await createChannel();
        await service.setSubscription(subscriber.id, channel.nickname, true);
      }

      const result = await service.findMySubscriptions(subscriber.id, {
        limit: 1,
      });

      expect(result.total).toBe(3);
      expect(result.items).toHaveLength(1);
    });

    it('does not include channels the user does not follow', async () => {
      const subscriber = await createUser();
      await createChannel();

      const result = await service.findMySubscriptions(subscriber.id, {});

      expect(result).toEqual({ items: [], total: 0 });
    });
  });
});
