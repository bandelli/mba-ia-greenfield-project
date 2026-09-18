import { QueryFailedError } from 'typeorm';
import {
  CannotSubscribeOwnChannelException,
  ChannelNotFoundException,
} from '../common/exceptions/domain.exception';
import { Channel } from './entities/channel.entity';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionService } from './subscription.service';

function makeChannel(overrides: Partial<Channel> = {}): Channel {
  const channel = new Channel();
  channel.id = 'channel-id';
  channel.nickname = 'nick';
  channel.user_id = 'owner-id';
  channel.subscribers_count = 0;
  Object.assign(channel, overrides);
  return channel;
}

function makeSubscription(overrides: Partial<Subscription> = {}): Subscription {
  const subscription = new Subscription();
  subscription.id = 'subscription-id';
  subscription.subscriber_user_id = 'user-id';
  subscription.channel_id = 'channel-id';
  Object.assign(subscription, overrides);
  return subscription;
}

function makeSubscriptionRepository(
  overrides: Record<string, jest.Mock> = {},
): any {
  return {
    findOne: jest.fn(),
    create: jest.fn((data: unknown) => data),
    save: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  };
}

function makeQueryBuilder(row: { subscribers_count: number }): any {
  return {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ raw: [row] }),
  };
}

function makeManager(options: {
  channel?: Channel | null;
  subscriptionRepository: any;
  counterResult?: { subscribers_count: number };
}): any {
  const channel =
    options.channel === undefined ? makeChannel() : options.channel;
  return {
    findOneBy: jest.fn().mockResolvedValue(channel),
    getRepository: jest.fn().mockReturnValue(options.subscriptionRepository),
    query: jest.fn().mockResolvedValue(undefined),
    findOneByOrFail: jest.fn().mockResolvedValue(channel ?? makeChannel()),
    createQueryBuilder: jest
      .fn()
      .mockReturnValue(
        makeQueryBuilder(options.counterResult ?? { subscribers_count: 0 }),
      ),
  };
}

function makeDataSource(manager: any): any {
  return {
    transaction: jest.fn((cb: (m: any) => Promise<any>) => cb(manager)),
  };
}

function makeUniqueError(): QueryFailedError {
  const err = new QueryFailedError('INSERT', [], new Error()) as any;
  err.code = '23505';
  return err;
}

describe('SubscriptionService', () => {
  describe('setSubscription', () => {
    it('throws ChannelNotFoundException when the channel does not exist', async () => {
      const manager = makeManager({
        channel: null,
        subscriptionRepository: makeSubscriptionRepository(),
      });
      const service = new SubscriptionService(makeDataSource(manager));

      await expect(
        service.setSubscription('user-id', 'missing', true),
      ).rejects.toThrow(ChannelNotFoundException);
    });

    it('throws CannotSubscribeOwnChannelException when the caller owns the channel', async () => {
      const manager = makeManager({
        channel: makeChannel({ user_id: 'owner-id' }),
        subscriptionRepository: makeSubscriptionRepository(),
      });
      const service = new SubscriptionService(makeDataSource(manager));

      await expect(
        service.setSubscription('owner-id', 'nick', true),
      ).rejects.toThrow(CannotSubscribeOwnChannelException);
    });

    it('subscribes and increments the counter when not already subscribed', async () => {
      const subscriptionRepository = makeSubscriptionRepository({
        findOne: jest.fn().mockResolvedValue(null),
      });
      const manager = makeManager({
        subscriptionRepository,
        counterResult: { subscribers_count: 1 },
      });
      const service = new SubscriptionService(makeDataSource(manager));

      const result = await service.setSubscription('user-id', 'nick', true);

      expect(subscriptionRepository.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ subscribed: true, subscribersCount: 1 });
    });

    it('is idempotent when already subscribed and subscribing again', async () => {
      const subscriptionRepository = makeSubscriptionRepository({
        findOne: jest.fn().mockResolvedValue(makeSubscription()),
      });
      const manager = makeManager({
        subscriptionRepository,
        channel: makeChannel({ subscribers_count: 5 }),
      });
      const service = new SubscriptionService(makeDataSource(manager));

      const result = await service.setSubscription('user-id', 'nick', true);

      expect(subscriptionRepository.save).not.toHaveBeenCalled();
      expect(manager.createQueryBuilder).not.toHaveBeenCalled();
      expect(result).toEqual({ subscribed: true, subscribersCount: 5 });
    });

    it('unsubscribes and decrements the counter when currently subscribed', async () => {
      const existing = makeSubscription();
      const subscriptionRepository = makeSubscriptionRepository({
        findOne: jest.fn().mockResolvedValue(existing),
      });
      const manager = makeManager({
        subscriptionRepository,
        counterResult: { subscribers_count: 0 },
      });
      const service = new SubscriptionService(makeDataSource(manager));

      const result = await service.setSubscription('user-id', 'nick', false);

      expect(subscriptionRepository.delete).toHaveBeenCalledWith({
        id: existing.id,
      });
      expect(result).toEqual({ subscribed: false, subscribersCount: 0 });
    });

    it('is idempotent when not subscribed and unsubscribing again', async () => {
      const subscriptionRepository = makeSubscriptionRepository({
        findOne: jest.fn().mockResolvedValue(null),
      });
      const manager = makeManager({
        subscriptionRepository,
        channel: makeChannel({ subscribers_count: 0 }),
      });
      const service = new SubscriptionService(makeDataSource(manager));

      const result = await service.setSubscription('user-id', 'nick', false);

      expect(subscriptionRepository.delete).not.toHaveBeenCalled();
      expect(result).toEqual({ subscribed: false, subscribersCount: 0 });
    });

    it('recovers idempotently from a concurrent insert race via a SAVEPOINT', async () => {
      const subscriptionRepository = makeSubscriptionRepository({
        findOne: jest.fn().mockResolvedValue(null),
        save: jest.fn().mockRejectedValue(makeUniqueError()),
      });
      const manager = makeManager({
        subscriptionRepository,
        channel: makeChannel({ subscribers_count: 1 }),
      });
      const service = new SubscriptionService(makeDataSource(manager));

      const result = await service.setSubscription('user-id', 'nick', true);

      expect(manager.query).toHaveBeenCalledWith(
        'SAVEPOINT insert_subscription',
      );
      expect(manager.query).toHaveBeenCalledWith(
        'ROLLBACK TO SAVEPOINT insert_subscription',
      );
      expect(result).toEqual({ subscribed: true, subscribersCount: 1 });
    });
  });

  describe('findMySubscriptions', () => {
    function makePlainDataSource(findAndCount: jest.Mock): any {
      return {
        getRepository: jest.fn().mockReturnValue({ findAndCount }),
      };
    }

    it('applies default limit/offset when the query omits them', async () => {
      const findAndCount = jest.fn().mockResolvedValue([[], 0]);
      const service = new SubscriptionService(
        makePlainDataSource(findAndCount),
      );

      await service.findMySubscriptions('user-id', {});

      expect(findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it('passes through explicit limit/offset', async () => {
      const findAndCount = jest.fn().mockResolvedValue([[], 0]);
      const service = new SubscriptionService(
        makePlainDataSource(findAndCount),
      );

      await service.findMySubscriptions('user-id', { limit: 5, offset: 10 });

      expect(findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
    });

    it('maps each subscription to its channel, with avatarUrl always null', async () => {
      const findAndCount = jest.fn().mockResolvedValue([
        [
          {
            channel: { id: 'ch1', nickname: 'nick1', name: 'Channel One' },
          },
        ],
        1,
      ]);
      const service = new SubscriptionService(
        makePlainDataSource(findAndCount),
      );

      const result = await service.findMySubscriptions('user-id', {});

      expect(result).toEqual({
        items: [
          {
            id: 'ch1',
            nickname: 'nick1',
            name: 'Channel One',
            avatarUrl: null,
          },
        ],
        total: 1,
      });
    });
  });
});
