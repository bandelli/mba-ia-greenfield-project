import { NestFactory } from '@nestjs/core';
import { VideoProcessingService } from '../processing/video-processing.service';
import { QueueService } from '../queue/queue.service';
import { VideoStatusService } from '../videos/video-status.service';

jest.mock('@nestjs/core', () => ({
  NestFactory: { createApplicationContext: jest.fn() },
}));

type WorkHandler = (job: {
  data: { videoId: string };
  retryCount: number;
  retryLimit: number;
}) => Promise<void>;

describe('worker/main bootstrap', () => {
  let workHandler: WorkHandler;
  const queueServiceMock = {
    workWithMetadata: jest.fn((_queue: string, handler: WorkHandler) => {
      workHandler = handler;
      return Promise.resolve();
    }),
  };
  const videoProcessingServiceMock = {
    extractMetadata: jest.fn(),
    generateThumbnail: jest.fn(),
  };
  const videoStatusServiceMock = {
    getStorageKey: jest.fn(),
    markReady: jest.fn(),
    markError: jest.fn(),
  };

  beforeAll(async () => {
    const appMock = {
      get: jest.fn((token: unknown) => {
        if (token === QueueService) return queueServiceMock;
        if (token === VideoProcessingService) return videoProcessingServiceMock;
        if (token === VideoStatusService) return videoStatusServiceMock;
        throw new Error(`unexpected token requested: ${String(token)}`);
      }),
    };
    (NestFactory.createApplicationContext as jest.Mock).mockResolvedValue(
      appMock,
    );

    // require() (not `import()`) — this project's Jest runs under the
    // CommonJS transform without --experimental-vm-modules, so a dynamic
    // `import()` throws at runtime (per the pg-boss ESM lesson from
    // SI-03.2's progress.md).
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- see comment above.
    require('./main');
    // let the top-level `void bootstrap()` promise chain settle before
    // assertions run.
    await new Promise((resolve) => setImmediate(resolve));
  });

  beforeEach(() => {
    // Deliberately NOT jest.clearAllMocks(): queueServiceMock.workWithMetadata
    // is only ever called once, during the beforeAll bootstrap above, and
    // the "registers a handler" test asserts on that one call — clearing it
    // per-test would wipe the only recorded invocation before that test runs.
    videoProcessingServiceMock.extractMetadata.mockClear();
    videoProcessingServiceMock.generateThumbnail.mockClear();
    videoStatusServiceMock.getStorageKey.mockClear();
    videoStatusServiceMock.markReady.mockClear();
    videoStatusServiceMock.markError.mockClear();
    videoStatusServiceMock.getStorageKey.mockResolvedValue(
      'videos/source-key.mp4',
    );
    videoProcessingServiceMock.extractMetadata.mockResolvedValue({
      format: { duration: 10, format_name: 'mov,mp4', bit_rate: '1000' },
      streams: [
        { codec_type: 'video', codec_name: 'h264', width: 320, height: 240 },
      ],
    });
    videoProcessingServiceMock.generateThumbnail.mockResolvedValue(undefined);
    videoStatusServiceMock.markReady.mockResolvedValue(undefined);
    videoStatusServiceMock.markError.mockResolvedValue(undefined);
  });

  it('registers a workWithMetadata handler on the video.uploaded queue', () => {
    expect(queueServiceMock.workWithMetadata).toHaveBeenCalledWith(
      'video.uploaded',
      expect.any(Function),
    );
  });

  it('extracts metadata/thumbnail and marks the video ready on success', async () => {
    await workHandler({
      data: { videoId: 'video-1' },
      retryCount: 0,
      retryLimit: 3,
    });

    expect(videoProcessingServiceMock.generateThumbnail).toHaveBeenCalledWith(
      'videos/source-key.mp4',
      'thumbnails/video-1.png',
    );
    expect(videoStatusServiceMock.markReady).toHaveBeenCalledWith('video-1', {
      thumbnailKey: 'thumbnails/video-1.png',
      durationSeconds: 10,

      metadata: expect.objectContaining({ format: 'mov,mp4' }),
    });
    expect(videoStatusServiceMock.markError).not.toHaveBeenCalled();
  });

  it('rethrows and does not mark error while retries remain', async () => {
    videoProcessingServiceMock.extractMetadata.mockRejectedValueOnce(
      new Error('transient storage error'),
    );

    await expect(
      workHandler({
        data: { videoId: 'video-2' },
        retryCount: 0,
        retryLimit: 3,
      }),
    ).rejects.toThrow('transient storage error');

    expect(videoStatusServiceMock.markError).not.toHaveBeenCalled();
  });

  it('marks the video as error once retries are exhausted', async () => {
    videoProcessingServiceMock.extractMetadata.mockRejectedValueOnce(
      new Error('unsupported codec'),
    );

    await expect(
      workHandler({
        data: { videoId: 'video-3' },
        retryCount: 3,
        retryLimit: 3,
      }),
    ).rejects.toThrow('unsupported codec');

    expect(videoStatusServiceMock.markError).toHaveBeenCalledWith(
      'video-3',
      'unsupported codec',
    );
  });
});
