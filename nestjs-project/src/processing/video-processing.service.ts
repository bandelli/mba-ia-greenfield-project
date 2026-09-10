import { Injectable } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import { randomUUID } from 'crypto';
import { createWriteStream } from 'fs';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { StorageService } from '../storage/storage.service';

const THUMBNAIL_FILENAME = 'thumbnail.png';

@Injectable()
export class VideoProcessingService {
  constructor(private readonly storageService: StorageService) {}

  async extractMetadata(key: string): Promise<ffmpeg.FfprobeData> {
    const localPath = await this.downloadToTempFile(key);
    try {
      return await this.probe(localPath);
    } finally {
      await rm(localPath, { force: true });
    }
  }

  async generateThumbnail(key: string, thumbnailKey: string): Promise<void> {
    const localPath = await this.downloadToTempFile(key);
    const tempDir = await mkdtemp(join(tmpdir(), 'thumb-'));

    try {
      const metadata = await this.probe(localPath);
      const duration = metadata.format.duration ?? 0;
      // per phase-03-videos/TD-04 Revision (2026-09-08): capture at
      // min(1s, 10% da duração) to avoid black leading/fade-in frames.
      const timestamp = Math.min(1, duration * 0.1);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(localPath)
          .on('end', () => resolve())
          .on('error', (error: Error) => reject(error))
          .screenshots({
            timestamps: [timestamp],
            filename: THUMBNAIL_FILENAME,
            folder: tempDir,
          });
      });

      const thumbnailBuffer = await readFile(join(tempDir, THUMBNAIL_FILENAME));
      await this.storageService.putObject(
        thumbnailKey,
        thumbnailBuffer,
        'image/png',
      );
    } finally {
      await rm(localPath, { force: true });
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  private async downloadToTempFile(key: string): Promise<string> {
    const stream = await this.storageService.getObjectStream(key);
    const localPath = join(tmpdir(), `video-${randomUUID()}`);
    await pipeline(stream, createWriteStream(localPath));
    return localPath;
  }

  private probe(localPath: string): Promise<ffmpeg.FfprobeData> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(localPath, (err, data) => {
        if (err) {
          reject(err as Error);
          return;
        }
        resolve(data);
      });
    });
  }
}
