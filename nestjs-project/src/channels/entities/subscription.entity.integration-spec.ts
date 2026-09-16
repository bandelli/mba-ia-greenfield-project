import { DataSource, Repository } from 'typeorm';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';
import { VerificationToken } from '../../auth/entities/verification-token.entity';
import {
  cleanAllTables,
  createTestDataSource,
} from '../../test/create-test-data-source';
import { User } from '../../users/entities/user.entity';
import { Channel } from './channel.entity';
import { Subscription } from './subscription.entity';

const ALL_ENTITIES = [
  User,
  Channel,
  RefreshToken,
  VerificationToken,
  Subscription,
];

describe('Subscription entity (integration)', () => {
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let channelRepository: Repository<Channel>;
  let subscriptionRepository: Repository<Subscription>;

  beforeAll(async () => {
    dataSource = createTestDataSource(ALL_ENTITIES);
    await dataSource.initialize();
    userRepository = dataSource.getRepository(User);
    channelRepository = dataSource.getRepository(Channel);
    subscriptionRepository = dataSource.getRepository(Subscription);
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
        email: `sub_user_${n}@example.com`,
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
        nickname: `subchan${n}`,
        user_id: owner.id,
      }),
    );
  }

  it('should persist a subscription for a (subscriber, channel) pair', async () => {
    const subscriber = await createUser();
    const channel = await createChannel();

    const subscription = await subscriptionRepository.save(
      subscriptionRepository.create({
        subscriber_user_id: subscriber.id,
        channel_id: channel.id,
      }),
    );

    expect(subscription.id).toBeTruthy();
    expect(subscription.created_at).toBeTruthy();
  });

  it('should enforce unique (subscriber_user_id, channel_id) constraint', async () => {
    const subscriber = await createUser();
    const channel = await createChannel();

    await subscriptionRepository.save(
      subscriptionRepository.create({
        subscriber_user_id: subscriber.id,
        channel_id: channel.id,
      }),
    );

    await expect(
      subscriptionRepository.save(
        subscriptionRepository.create({
          subscriber_user_id: subscriber.id,
          channel_id: channel.id,
        }),
      ),
    ).rejects.toThrow();
  });

  it('should allow the same subscriber to subscribe to different channels', async () => {
    const subscriber = await createUser();
    const channel1 = await createChannel();
    const channel2 = await createChannel();

    await subscriptionRepository.save(
      subscriptionRepository.create({
        subscriber_user_id: subscriber.id,
        channel_id: channel1.id,
      }),
    );
    await subscriptionRepository.save(
      subscriptionRepository.create({
        subscriber_user_id: subscriber.id,
        channel_id: channel2.id,
      }),
    );

    const count = await subscriptionRepository.count({
      where: { subscriber_user_id: subscriber.id },
    });
    expect(count).toBe(2);
  });

  it('should reject insert with a non-existent subscriber_user_id (FK violation)', async () => {
    const channel = await createChannel();

    await expect(
      subscriptionRepository.save(
        subscriptionRepository.create({
          subscriber_user_id: '00000000-0000-0000-0000-000000000000',
          channel_id: channel.id,
        }),
      ),
    ).rejects.toThrow();
  });

  it('should reject insert with a non-existent channel_id (FK violation)', async () => {
    const subscriber = await createUser();

    await expect(
      subscriptionRepository.save(
        subscriptionRepository.create({
          subscriber_user_id: subscriber.id,
          channel_id: '00000000-0000-0000-0000-000000000000',
        }),
      ),
    ).rejects.toThrow();
  });

  it('should load the related subscriber and channel via the ManyToOne relations', async () => {
    const subscriber = await createUser();
    const channel = await createChannel();
    const subscription = await subscriptionRepository.save(
      subscriptionRepository.create({
        subscriber_user_id: subscriber.id,
        channel_id: channel.id,
      }),
    );

    const found = await subscriptionRepository.findOne({
      where: { id: subscription.id },
      relations: ['subscriber', 'channel'],
    });

    expect(found?.subscriber.email).toBe(subscriber.email);
    expect(found?.channel.nickname).toBe(channel.nickname);
  });
});
