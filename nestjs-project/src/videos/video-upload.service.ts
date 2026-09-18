import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UploadContentValidationFailedException,
  UploadInvalidFileTypeException,
} from '../common/exceptions/domain.exception';
import { ChannelsService } from '../channels/channels.service';
import { VideoProcessingService } from '../processing/video-processing.service';
import { QueueService } from '../queue/queue.service';
import { StorageService } from '../storage/storage.service';
import { Video } from './entities/video.entity';
import { VideoStatusService } from './video-status.service';
import { VIDEO_UPLOADED_QUEUE } from './videos.constants';

const VIDEO_MIME_PREFIX = 'video/';

// Business logic behind the tus upload hooks (per phase-03-videos/TD-06,
// TD-09, TD-10). Kept out of the middleware/tus wiring per
// .claude/rules/nestjs-layer-separation.md — infrastructure glue delegates
// domain decisions to a service.
@Injectable()
export class VideoUploadService {
  constructor(
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    private readonly channelsService: ChannelsService,
    private readonly storageService: StorageService,
    private readonly videoProcessingService: VideoProcessingService,
    private readonly videoStatusService: VideoStatusService,
    private readonly queueService: QueueService,
  ) {}

  // onUploadCreate fast-reject (per phase-03-videos/TD-09, Option C):
  // rejects a declared non-video type before the draft row is created,
  // then creates the draft with immediate ownership (per
  // phase-03-videos/TD-06 Revision, 2026-09-08).
  async createDraft(
    userId: string,
    storageKey: string,
    metadata: Record<string, string | null>,
  ): Promise<Video> {
    const filetype = metadata.filetype;
    if (
      typeof filetype !== 'string' ||
      !filetype.startsWith(VIDEO_MIME_PREFIX)
    ) {
      throw new UploadInvalidFileTypeException();
    }

    const channel = await this.channelsService.findByUserId(userId);

    return this.videoRepository.save(
      this.videoRepository.create({
        user_id: userId,
        channel_id: channel.id,
        storage_key: storageKey,
      }),
    );
  }

  // onUploadFinish authoritative check (per phase-03-videos/TD-09, Option
  // C): runs ffprobe against the fully-uploaded object; on failure, deletes
  // both the S3 object and the draft row. On pass, transitions the video to
  // `processing` and enqueues the job the worker consumes (per
  // phase-03-videos/TD-10).
  async finalizeUpload(storageKey: string): Promise<Video> {
    const video = await this.videoRepository.findOneByOrFail({
      storage_key: storageKey,
    });

    try {
      await this.videoProcessingService.extractMetadata(storageKey);
    } catch {
      await this.storageService.deleteObject(storageKey);
      await this.videoRepository.delete({ id: video.id });
      throw new UploadContentValidationFailedException();
    }

    await this.videoStatusService.markProcessing(video.id);
    await this.queueService.send(VIDEO_UPLOADED_QUEUE, { videoId: video.id });

    return video;
  }
}
