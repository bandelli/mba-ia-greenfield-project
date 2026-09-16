import { Injectable } from '@nestjs/common';
import {
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import {
  CannotSubscribeOwnChannelException,
  ChannelNotFoundException,
} from '../common/exceptions/domain.exception';
import { Channel } from './entities/channel.entity';
import { Subscription } from './entities/subscription.entity';

export interface SubscriptionResult {
  subscribed: boolean;
  subscribersCount: number;
}

export interface FollowedChannelItem {
  id: string;
  nickname: string;
  name: string;
  // No channel-avatar data model exists anywhere in this project yet (same
  // class of gap as `views` staying hardcoded 0 in earlier phases) — always
  // `null` until a future phase introduces channel avatars.
  avatarUrl: string | null;
}

export interface FindMySubscriptionsResult {
  items: FollowedChannelItem[];
  total: number;
}

const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;
const PG_UNIQUE_VIOLATION = '23505';

function isPgUniqueViolation(err: unknown): boolean {
  return (
    err instanceof QueryFailedError &&
    (err as { code?: string }).code === PG_UNIQUE_VIOLATION
  );
}

// Owns the follow/unfollow toggle for channels (per social-interactions/TD-02,
// TD-03) — same idempotent "set state" contract as the reaction services,
// plus a self-subscribe guard specific to this domain.
@Injectable()
export class SubscriptionService {
  constructor(private readonly dataSource: DataSource) {}

  async setSubscription(
    userId: string,
    nickname: string,
    subscribed: boolean,
  ): Promise<SubscriptionResult> {
    return this.dataSource.transaction(async (manager) => {
      const channel = await manager.findOneBy(Channel, { nickname });
      if (!channel) {
        throw new ChannelNotFoundException();
      }
      if (channel.user_id === userId) {
        throw new CannotSubscribeOwnChannelException();
      }

      const subscriptionRepository = manager.getRepository(Subscription);
      const existing = await subscriptionRepository.findOne({
        where: { subscriber_user_id: userId, channel_id: channel.id },
      });

      const delta = await this.persistSubscription(
        manager,
        subscriptionRepository,
        existing,
        userId,
        channel.id,
        subscribed,
      );

      const subscribersCount = await this.applyCounterDelta(
        manager,
        channel.id,
        delta,
      );

      return { subscribed, subscribersCount };
    });
  }

  // Paginated listing of channels `userId` follows (per social-interactions/
  // TD-05, inheriting phase-04-video-channel-management/TD-05's offset/limit
  // convention). Ordered by most-recently-followed first — not specified by
  // the plan; chosen as the natural default, same judgment call already
  // made for reply ordering in SI-06.4/SI-06.6.
  async findMySubscriptions(
    userId: string,
    query: { limit?: number; offset?: number },
  ): Promise<FindMySubscriptionsResult> {
    const limit = query.limit ?? DEFAULT_LIMIT;
    const offset = query.offset ?? DEFAULT_OFFSET;

    const [subscriptions, total] = await this.dataSource
      .getRepository(Subscription)
      .findAndCount({
        where: { subscriber_user_id: userId },
        relations: ['channel'],
        order: { created_at: 'DESC' },
        skip: offset,
        take: limit,
      });

    return {
      items: subscriptions.map((subscription) => ({
        id: subscription.channel.id,
        nickname: subscription.channel.nickname,
        name: subscription.channel.name,
        avatarUrl: null,
      })),
      total,
    };
  }

  // Returns the net counter delta actually applied (-1, 0, or +1) — 0 for
  // both idempotent cases (already subscribed + subscribe again; already
  // unsubscribed + unsubscribe again).
  private async persistSubscription(
    manager: EntityManager,
    subscriptionRepository: Repository<Subscription>,
    existing: Subscription | null,
    userId: string,
    channelId: string,
    subscribed: boolean,
  ): Promise<number> {
    if (subscribed) {
      if (existing) {
        return 0; // idempotent no-op
      }

      // A unique-constraint violation aborts the enclosing transaction in
      // Postgres unless it happens inside a SAVEPOINT (per
      // .claude/rules/typeorm-queries.md).
      await manager.query('SAVEPOINT insert_subscription');
      try {
        await subscriptionRepository.save(
          subscriptionRepository.create({
            subscriber_user_id: userId,
            channel_id: channelId,
          }),
        );
        await manager.query('RELEASE SAVEPOINT insert_subscription');
        return 1;
      } catch (err) {
        await manager.query('ROLLBACK TO SAVEPOINT insert_subscription');
        if (!isPgUniqueViolation(err)) {
          throw err;
        }
        // A concurrent request for the same user already won the race —
        // idempotent no-op.
        return 0;
      }
    }

    if (!existing) {
      return 0; // idempotent no-op — nothing to remove
    }
    await subscriptionRepository.delete({ id: existing.id });
    return -1;
  }

  private async applyCounterDelta(
    manager: EntityManager,
    channelId: string,
    delta: number,
  ): Promise<number> {
    if (delta === 0) {
      const current = await manager.findOneByOrFail(Channel, {
        id: channelId,
      });
      return current.subscribers_count;
    }

    const result = await manager
      .createQueryBuilder()
      .update(Channel)
      .set({ subscribers_count: () => `subscribers_count + (${delta})` })
      .where('id = :id', { id: channelId })
      .returning(['subscribers_count'])
      .execute();
    const [row] = result.raw as { subscribers_count: number }[];
    return row.subscribers_count;
  }
}
