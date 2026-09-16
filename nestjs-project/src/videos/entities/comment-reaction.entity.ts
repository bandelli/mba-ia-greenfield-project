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
import { Comment } from './comment.entity';
import { ReactionType } from './video-reaction.entity';

// Same shape as `VideoReaction`, scoped to a comment instead of a video —
// dedicated per-domain table, not a polymorphic association (per
// social-interactions/TD-02).
@Entity('comment_reactions')
@Index(['user_id', 'comment_id'], { unique: true })
export class CommentReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid' })
  comment_id: string;

  @Column({
    type: 'enum',
    enum: ReactionType,
    enumName: 'comment_reactions_type_enum',
  })
  type: ReactionType;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Comment)
  @JoinColumn({ name: 'comment_id' })
  comment: Comment;
}
