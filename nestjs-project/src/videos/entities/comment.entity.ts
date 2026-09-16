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

// Adjacency list via `parent_comment_id` self-FK, capped at depth 1 —
// enforced in the service layer, not the schema (per
// social-interactions/TD-04, Option A). `likes_count`/`dislikes_count` are
// denormalized atomic counters kept in sync by `CommentReaction` writes (per
// social-interactions/TD-01).
@Entity('comments')
@Index(['video_id', 'parent_comment_id'])
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  video_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid', nullable: true })
  parent_comment_id: string | null;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'int', default: 0 })
  likes_count: number;

  @Column({ type: 'int', default: 0 })
  dislikes_count: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Video)
  @JoinColumn({ name: 'video_id' })
  video: Video;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Comment)
  @JoinColumn({ name: 'parent_comment_id' })
  parent_comment: Comment | null;
}
