import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { nanoid } from 'nanoid';
import { Channel } from '../../channels/entities/channel.entity';
import { User } from '../../users/entities/user.entity';

export enum VideoStatus {
  DRAFT = 'draft',
  PROCESSING = 'processing',
  READY = 'ready',
  ERROR = 'error',
}

@Entity('videos')
export class Video {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Short opaque, non-enumerable public identifier for the watch URL
  // (per phase-03-videos/TD-05) — generated at insert time, decoupled
  // from the internal uuid primary key.
  @Column({ type: 'varchar', length: 21, unique: true })
  public_id: string;

  // Stamped in onUploadCreate at draft creation, before any byte of the
  // file transfers (per phase-03-videos/TD-06 Revision, 2026-09-08).
  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid' })
  channel_id: string;

  // Object-storage key of the uploaded video file, assigned when the tus
  // upload session is created (per phase-03-videos/TD-01, TD-06) — read by
  // the worker to process the video and by the delivery endpoints (TD-07)
  // to issue presigned URLs.
  @Column({ type: 'varchar' })
  storage_key: string;

  // Object-storage key of the generated thumbnail; populated by the worker
  // once processing succeeds (per phase-03-videos/TD-04).
  @Column({ type: 'varchar', nullable: true })
  thumbnail_key: string | null;

  // Duration (seconds) extracted via ffprobe; populated by the worker once
  // processing succeeds (per phase-03-videos/TD-04).
  @Column({ type: 'double precision', nullable: true })
  duration_seconds: number | null;

  // Raw ffprobe metadata (codec, resolution, bitrate, ...); populated by
  // the worker once processing succeeds (per phase-03-videos/TD-04).
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  // draft -> processing -> ready | error (per phase-03-videos/TD-10).
  @Column({
    type: 'enum',
    enum: VideoStatus,
    enumName: 'videos_status_enum',
    default: VideoStatus.DRAFT,
  })
  status: VideoStatus;

  // Last processing failure's message; populated only when status = error,
  // cleared whenever status is anything else (per phase-03-videos/TD-10).
  @Column({ type: 'text', nullable: true })
  processing_error: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Channel)
  @JoinColumn({ name: 'channel_id' })
  channel: Channel;

  @BeforeInsert()
  generatePublicId(): void {
    if (!this.public_id) {
      this.public_id = nanoid();
    }
  }
}
