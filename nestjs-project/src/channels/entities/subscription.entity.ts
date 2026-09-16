import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Channel } from './channel.entity';

// One row per (subscriber, channel) pair — dedicated per-domain table, same
// convention as VideoReaction/CommentReaction (per social-interactions/TD-02).
// `channels.subscribers_count` is the denormalized atomic counter this
// table's insert/delete keeps in sync (per social-interactions/TD-01).
@Entity('subscriptions')
@Index(['subscriber_user_id', 'channel_id'], { unique: true })
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  subscriber_user_id: string;

  @Column({ type: 'uuid' })
  channel_id: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'subscriber_user_id' })
  subscriber: User;

  @ManyToOne(() => Channel)
  @JoinColumn({ name: 'channel_id' })
  channel: Channel;
}
