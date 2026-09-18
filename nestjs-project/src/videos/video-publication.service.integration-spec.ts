import { randomUUID } from 'crypto';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { DataSource, Repository } from 'typeorm';
import { Channel } from '../channels/entities/channel.entity';
import storageConfig from '../config/storage.config';
import { StorageModule } from '../storage/storage.module';
import { StorageService } from '../storage/storage.service';
import {
  cleanAllTables,
  createTestDataSource,
  ALL_APP_ENTITIES,
} from '../test/create-test-data-source';
import { User } from '../users/entities/user.entity';
import { Video, VideoStatus } from './entities/video.entity';
import { VideoPublicationService } from './video-publication.service';

describe('VideoPublicationService.replaceThumbnail (integration)', () => {
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let channelRepository: Repository<Channel>;
  let videoRepository: Repository<Video>;
  let storageService: StorageService;
  let service: VideoPublicationService;

  beforeAll(async () => {
    dataSource = createTestDataSource(ALL_APP_ENTITIES);
    await dataSource.initialize();
    userRepository = dataSource.getRepository(User);
    channelRepository = dataSource.getRepository(Channel);
    videoRepository = dataSource.getRepository(Video);

    const moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [storageConfig] }),
        StorageModule,
      ],
    }).compile();
    storageService = moduleFixture.get(StorageService);

    service = new VideoPublicationService(videoRepository, storageService);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await cleanAllTables(dataSource);
  });

  let counter = 0;
  async function createOwnedVideo(
    thumbnailKey: string | null,
  ): Promise<{ user: User; video: Video }> {
    const n = ++counter;
    const user = await userRepository.save(
      userRepository.create({
        email: `thumb_owner_${n}@example.com`,
        password: 'hashed',
      }),
    );
    const channel = await channelRepository.save(
      channelRepository.create({
        name: `Thumb Channel ${n}`,
        nickname: `thumbchan${n}`,
        user_id: user.id,
      }),
    );
    const video = await videoRepository.save(
      videoRepository.create({
        user_id: user.id,
        channel_id: channel.id,
        storage_key: `videos/thumb-${n}.mp4`,
        status: VideoStatus.READY,
        thumbnail_key: thumbnailKey,
      }),
    );
    return { user, video };
  }

  async function readAll(stream: NodeJS.ReadableStream): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks).toString('utf-8');
  }

  it('overwrites the object at the existing thumbnail_key, keeping the key unchanged', async () => {
    const existingKey = `thumbnails/integration-${randomUUID()}.png`;
    await storageService.putObject(
      existingKey,
      Buffer.from('original thumbnail'),
      'image/png',
    );
    const { user, video } = await createOwnedVideo(existingKey);

    try {
      const result = await service.replaceThumbnail(
        video.public_id,
        user.id,
        Buffer.from('overwritten thumbnail'),
        'image/png',
      );

      expect(result.thumbnail_key).toBe(existingKey);
      const content = await readAll(
        await storageService.getObjectStream(existingKey),
      );
      expect(content).toBe('overwritten thumbnail');
    } finally {
      await storageService.deleteObject(existingKey);
    }
  });

  it('falls back to the worker naming convention and persists it when thumbnail_key is null', async () => {
    const { user, video } = await createOwnedVideo(null);
    const expectedKey = `thumbnails/${video.id}.png`;

    try {
      const result = await service.replaceThumbnail(
        video.public_id,
        user.id,
        Buffer.from('freshly uploaded thumbnail'),
        'image/png',
      );

      expect(result.thumbnail_key).toBe(expectedKey);
      const content = await readAll(
        await storageService.getObjectStream(expectedKey),
      );
      expect(content).toBe('freshly uploaded thumbnail');

      const persisted = await videoRepository.findOneByOrFail({
        id: video.id,
      });
      expect(persisted.thumbnail_key).toBe(expectedKey);
    } finally {
      await storageService.deleteObject(expectedKey);
    }
  });
});
