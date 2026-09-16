import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Video } from './video.entity';

export enum ReactionType {
  LIKE = 'like',
  DISLIKE = 'dislike',
}

// One reaction row per (user, video) pair — dedicated per-domain table, not a
// polymorphic association (per social-interactions/TD-02). `videos.likes_count`/
// `dislikes_count` are the denormalized atomic counters this table's
// insert/update/delete keep in sync (per social-interactions/TD-01).
@Entity('video_reactions')
@Index(['user_id', 'video_id'], { unique: true })
export class VideoReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid' })
  video_id: string;

  @Column({
    type: 'enum',
    enum: ReactionType,
    enumName: 'video_reactions_type_enum',
  })
  type: ReactionType;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Video)
  @JoinColumn({ name: 'video_id' })
  video: Video;
}
