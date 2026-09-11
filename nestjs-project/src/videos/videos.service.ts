import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VideoNotFoundException } from '../common/exceptions/domain.exception';
import { Video, VideoStatus } from './entities/video.entity';

// Owns read access to a video for delivery (streaming/download) — separate
// from VideoStatusService, which owns status transitions
// (per phase-03-videos/TD-07, TD-10).
@Injectable()
export class VideosService {
  constructor(
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
  ) {}

  // Owner-only, `ready`-only lookup keyed by the public identifier (per
  // phase-03-videos/TD-05) — a draft/processing/error video, a video owned
  // by someone else, or an unknown public_id are all indistinguishable 404s
  // (per phase-03-videos/TD-10; visibility beyond owner is Phase 04 scope).
  async findOwnedReadyVideo(publicId: string, userId: string): Promise<Video> {
    const video = await this.videoRepository.findOne({
      where: {
        public_id: publicId,
        user_id: userId,
        status: VideoStatus.READY,
      },
    });
    if (!video) {
      throw new VideoNotFoundException();
    }
    return video;
  }
}
