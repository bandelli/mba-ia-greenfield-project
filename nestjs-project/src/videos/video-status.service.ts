import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Video, VideoStatus } from './entities/video.entity';

// Owns every Video.status transition of the processing lifecycle
// (per phase-03-videos/TD-10): draft -> processing -> ready | error.
@Injectable()
export class VideoStatusService {
  constructor(
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
  ) {}

  async markProcessing(videoId: string): Promise<void> {
    await this.videoRepository.update(
      { id: videoId },
      { status: VideoStatus.PROCESSING, processing_error: null },
    );
  }

  async markReady(
    videoId: string,
    result: {
      thumbnailKey: string;
      durationSeconds: number;
      metadata: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.videoRepository.update(
      { id: videoId },
      {
        status: VideoStatus.READY,
        thumbnail_key: result.thumbnailKey,
        duration_seconds: result.durationSeconds,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- TypeORM's QueryDeepPartialEntity does not accept a plain Record<string, unknown> for jsonb columns.
        metadata: result.metadata as any,
        processing_error: null,
      },
    );
  }

  async markError(videoId: string, message: string): Promise<void> {
    await this.videoRepository.update(
      { id: videoId },
      { status: VideoStatus.ERROR, processing_error: message },
    );
  }

  // Read by the worker to locate the object-storage key it must download
  // and process (per phase-03-videos/TD-01, TD-04).
  async getStorageKey(videoId: string): Promise<string> {
    const video = await this.videoRepository.findOneByOrFail({
      id: videoId,
    });
    return video.storage_key;
  }
}
