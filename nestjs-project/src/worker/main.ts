import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { VideoProcessingService } from '../processing/video-processing.service';
import { QueueService } from '../queue/queue.service';
import { VideoStatusService } from '../videos/video-status.service';
import { VIDEO_UPLOADED_QUEUE } from '../videos/videos.constants';

interface VideoUploadedPayload {
  videoId: string;
}

async function bootstrap() {
  const logger = new Logger('VideoWorker');
  // Standalone application context — no HTTP server. Runs as a dedicated
  // process/container so FFmpeg's CPU/memory usage can never starve the
  // API's event loop (per phase-03-videos/TD-03).
  const app = await NestFactory.createApplicationContext(AppModule);

  const queueService = app.get(QueueService);
  const videoProcessingService = app.get(VideoProcessingService);
  const videoStatusService = app.get(VideoStatusService);

  await queueService.workWithMetadata<VideoUploadedPayload>(
    VIDEO_UPLOADED_QUEUE,
    async (job) => {
      const { videoId } = job.data;

      try {
        const storageKey = await videoStatusService.getStorageKey(videoId);
        const probe = await videoProcessingService.extractMetadata(storageKey);
        const thumbnailKey = `thumbnails/${videoId}.png`;
        await videoProcessingService.generateThumbnail(
          storageKey,
          thumbnailKey,
        );

        await videoStatusService.markReady(videoId, {
          thumbnailKey,
          durationSeconds: probe.format.duration ?? 0,
          metadata: {
            format: probe.format.format_name,
            bit_rate: probe.format.bit_rate,
            streams: probe.streams.map((stream) => ({
              codec_type: stream.codec_type,
              codec_name: stream.codec_name,
              width: stream.width,
              height: stream.height,
            })),
          },
        });

        logger.log(`video ${videoId} processed successfully`);
      } catch (error) {
        // Background job handler (per .claude/rules/nestjs-services.md):
        // rethrowing is required so pg-boss's retry/backoff/failed-state
        // machinery runs; catching here only persists the terminal error
        // once retries are exhausted (per phase-03-videos/TD-10).
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`video ${videoId} processing failed: ${message}`);

        if (job.retryCount >= job.retryLimit) {
          await videoStatusService.markError(videoId, message);
        }

        throw error;
      }
    },
  );

  logger.log(`listening on queue "${VIDEO_UPLOADED_QUEUE}"`);
}

void bootstrap();
