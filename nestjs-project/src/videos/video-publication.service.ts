import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  VideoMissingTitleException,
  VideoNotFoundException,
  VideoNotReadyException,
} from '../common/exceptions/domain.exception';
import { StorageService } from '../storage/storage.service';
import { UpdateVideoDto } from './dto/update-video.dto';
import { Video, VideoStatus } from './entities/video.entity';

// Owns every publish/edit transition of a video's ownership-facing lifecycle
// (title/description/category/visibility, draft -> publish) — deliberately
// separate from VideoStatusService, which owns only the processing lifecycle
// (per phase-04-video-channel-management/TD-02).
@Injectable()
export class VideoPublicationService {
  constructor(
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    private readonly storageService: StorageService,
  ) {}

  // Owner-only lookup by public_id, any status/visibility — unlike
  // VideosService.findOwnedReadyVideo (delivery-only, status: ready), the
  // edit surface must reach draft/processing/error videos too.
  private async findOwnedVideo(
    publicId: string,
    userId: string,
  ): Promise<Video> {
    const video = await this.videoRepository.findOne({
      where: { public_id: publicId, user_id: userId },
    });
    if (!video) {
      throw new VideoNotFoundException();
    }
    return video;
  }

  // Public wrapper for the edit screen's initial data load and ownership
  // check (per phase-04-video-channel-management SI-04.8b) — same
  // owner-only, any-status lookup `updateFields`/`publish` already use.
  async getOwnedVideo(publicId: string, userId: string): Promise<Video> {
    return this.findOwnedVideo(publicId, userId);
  }

  async updateFields(
    publicId: string,
    userId: string,
    dto: UpdateVideoDto,
  ): Promise<Video> {
    const video = await this.findOwnedVideo(publicId, userId);
    Object.assign(video, dto);
    return this.videoRepository.save(video);
  }

  async publish(
    publicId: string,
    userId: string,
    dto: UpdateVideoDto,
  ): Promise<Video> {
    const video = await this.findOwnedVideo(publicId, userId);
    if (video.status !== VideoStatus.READY) {
      throw new VideoNotReadyException();
    }
    Object.assign(video, dto);
    if (!video.title?.trim()) {
      throw new VideoMissingTitleException();
    }
    // Set once on first publish; a later re-publish (e.g. re-saving fields
    // on an already-published video) must not overwrite the original
    // timestamp (per the entity's own "never cleared afterwards" invariant).
    video.published_at ??= new Date();
    return this.videoRepository.save(video);
  }

  // Overwrites the object at the video's existing thumbnail_key (per
  // phase-04-video-channel-management/TD-03) — no orphan cleanup, since the
  // key itself never changes. Falls back to the worker's naming convention
  // (`thumbnails/{id}.png`, see worker/main.ts) only for a video that has
  // not been processed yet and therefore has no thumbnail_key.
  async replaceThumbnail(
    publicId: string,
    userId: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<Video> {
    const video = await this.findOwnedVideo(publicId, userId);
    const thumbnailKey = video.thumbnail_key ?? `thumbnails/${video.id}.png`;
    await this.storageService.putObject(thumbnailKey, buffer, contentType);
    if (video.thumbnail_key === thumbnailKey) {
      return video;
    }
    video.thumbnail_key = thumbnailKey;
    return this.videoRepository.save(video);
  }
}
