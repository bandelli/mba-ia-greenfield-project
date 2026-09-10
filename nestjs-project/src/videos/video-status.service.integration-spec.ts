import { DataSource, Repository } from 'typeorm';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { VerificationToken } from '../auth/entities/verification-token.entity';
import { Channel } from '../channels/entities/channel.entity';
import {
  cleanAllTables,
  createTestDataSource,
} from '../test/create-test-data-source';
import { User } from '../users/entities/user.entity';
import { Video, VideoStatus } from './entities/video.entity';
import { VideoStatusService } from './video-status.service';

const ALL_ENTITIES = [User, Channel, RefreshToken, VerificationToken, Video];

describe('VideoStatusService (integration)', () => {
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let channelRepository: Repository<Channel>;
  let videoRepository: Repository<Video>;
  let service: VideoStatusService;

  beforeAll(async () => {
    dataSource = createTestDataSource(ALL_ENTITIES);
    await dataSource.initialize();
    userRepository = dataSource.getRepository(User);
    channelRepository = dataSource.getRepository(Channel);
    videoRepository = dataSource.getRepository(Video);
    service = new VideoStatusService(videoRepository);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await cleanAllTables(dataSource);
  });

  async function createVideo(): Promise<Video> {
    const user = await userRepository.save(
      userRepository.create({
        email: `status_owner_${Date.now()}_${Math.random()}@example.com`,
        password: 'hashed',
      }),
    );
    const channel = await channelRepository.save(
      channelRepository.create({
        name: 'Chan',
        nickname: `chan_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        user_id: user.id,
      }),
    );
    return videoRepository.save(
      videoRepository.create({
        user_id: user.id,
        channel_id: channel.id,
        storage_key: 'videos/status-key.mp4',
      }),
    );
  }

  it('markProcessing() transitions status to processing', async () => {
    const video = await createVideo();

    await service.markProcessing(video.id);

    const found = await videoRepository.findOneByOrFail({ id: video.id });
    expect(found.status).toBe(VideoStatus.PROCESSING);
  });

  it('markReady() transitions status to ready, persists thumbnail_key/duration/metadata and clears processing_error', async () => {
    const video = await createVideo();
    await videoRepository.update(
      { id: video.id },
      { status: VideoStatus.ERROR, processing_error: 'stale error' },
    );

    await service.markReady(video.id, {
      thumbnailKey: 'thumbnails/status-key.png',
      durationSeconds: 12.5,
      metadata: { codec: 'h264', width: 320, height: 240 },
    });

    const found = await videoRepository.findOneByOrFail({ id: video.id });
    expect(found.status).toBe(VideoStatus.READY);
    expect(found.thumbnail_key).toBe('thumbnails/status-key.png');
    expect(found.duration_seconds).toBe(12.5);
    expect(found.metadata).toEqual({ codec: 'h264', width: 320, height: 240 });
    expect(found.processing_error).toBeNull();
  });

  it('getStorageKey() returns the video storage_key', async () => {
    const video = await createVideo();

    const key = await service.getStorageKey(video.id);

    expect(key).toBe('videos/status-key.mp4');
  });

  it('markError() transitions status to error and persists the failure message', async () => {
    const video = await createVideo();

    await service.markError(video.id, 'ffprobe: unsupported codec');

    const found = await videoRepository.findOneByOrFail({ id: video.id });
    expect(found.status).toBe(VideoStatus.ERROR);
    expect(found.processing_error).toBe('ffprobe: unsupported codec');
  });
});
