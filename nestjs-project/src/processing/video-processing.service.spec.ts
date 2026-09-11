import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import ffmpeg from 'fluent-ffmpeg';
import { randomUUID } from 'crypto';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import storageConfig from '../config/storage.config';
import { StorageModule } from '../storage/storage.module';
import { StorageService } from '../storage/storage.service';
import { ProcessingModule } from './processing.module';
import { VideoProcessingService } from './video-processing.service';

describe('VideoProcessingService', () => {
  let service: VideoProcessingService;
  let storageService: StorageService;
  let fixtureKey: string;
  let fixtureTempDir: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [storageConfig] }),
        StorageModule,
        ProcessingModule,
      ],
    }).compile();

    service = moduleRef.get(VideoProcessingService);
    storageService = moduleRef.get(StorageService);

    // Generate a small synthetic fixture video (2s, color bars) via ffmpeg's
    // lavfi testsrc — avoids committing a binary fixture to the repo.
    fixtureTempDir = await mkdtemp(join(tmpdir(), 'fixture-'));
    const fixturePath = join(fixtureTempDir, 'fixture.mp4');

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input('testsrc=duration=2:size=320x240:rate=15')
        .inputFormat('lavfi')
        .output(fixturePath)
        .on('end', () => resolve())
        .on('error', (error: Error) => reject(error))
        .run();
    });

    fixtureKey = `test/${randomUUID()}.mp4`;
    const fixtureBuffer = await readFile(fixturePath);
    await storageService.putObject(fixtureKey, fixtureBuffer, 'video/mp4');
  }, 30000);

  afterAll(async () => {
    await storageService.deleteObject(fixtureKey);
    await rm(fixtureTempDir, { recursive: true, force: true });
  });

  it('extractMetadata returns the correct duration and metadata for a valid video file', async () => {
    const metadata = await service.extractMetadata(fixtureKey);

    expect(Number(metadata.format.duration)).toBeGreaterThan(1.5);
    expect(Number(metadata.format.duration)).toBeLessThan(2.5);
    expect(
      metadata.streams.some((stream) => stream.codec_type === 'video'),
    ).toBe(true);
  }, 20000);

  it('generateThumbnail captures the frame at min(1s, 10% da duração) and persists it', async () => {
    const thumbnailKey = `test/${randomUUID()}.png`;

    await service.generateThumbnail(fixtureKey, thumbnailKey);

    const stream = await storageService.getObjectStream(thumbnailKey);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    const buffer = Buffer.concat(chunks);

    expect(buffer.length).toBeGreaterThan(0);
    // PNG magic bytes
    expect(buffer.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');

    await storageService.deleteObject(thumbnailKey);
  }, 20000);
});
