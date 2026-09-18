import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { Channel } from '../src/channels/entities/channel.entity';
import { DomainExceptionFilter } from '../src/common/filters/domain-exception.filter';
import { ValidationExceptionFilter } from '../src/common/filters/validation-exception.filter';
import { StorageService } from '../src/storage/storage.service';
import { cleanAllTables } from '../src/test/create-test-data-source';
import { User } from '../src/users/entities/user.entity';
import { Video, VideoStatus } from '../src/videos/entities/video.entity';

describe('Video delivery (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let channelRepository: Repository<Channel>;
  let videoRepository: Repository<Video>;
  let storageService: StorageService;
  let throttlerStorage: ThrottlerStorageService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(
      new DomainExceptionFilter(),
      new ValidationExceptionFilter(),
    );
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    userRepository = dataSource.getRepository(User);
    channelRepository = dataSource.getRepository(Channel);
    videoRepository = dataSource.getRepository(Video);
    storageService = moduleFixture.get(StorageService);
    throttlerStorage =
      moduleFixture.get<ThrottlerStorageService>(ThrottlerStorage);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanAllTables(dataSource);
    throttlerStorage.storage.clear();
  });

  async function registerConfirmAndLogin(email: string): Promise<string> {
    const password = 'password123';
    const authService = app.get(AuthService);

    const mailServiceInstance = (authService as any).mailService;
    let capturedToken = '';
    jest
      .spyOn(mailServiceInstance, 'sendConfirmationEmail')
      .mockImplementationOnce((..._args: unknown[]) => {
        capturedToken = _args[2] as string;
        return Promise.resolve();
      });

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password });
    await request(app.getHttpServer())
      .get('/auth/confirm-email')
      .query({ token: capturedToken });
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password });

    return res.body.access_token as string;
  }

  async function createOwnedVideo(
    email: string,
    status: VideoStatus,
    thumbnailKey?: string | null,
  ): Promise<{ token: string; video: Video }> {
    const token = await registerConfirmAndLogin(email);
    const user = await userRepository.findOneByOrFail({ email });
    const channel = await channelRepository.findOneByOrFail({
      user_id: user.id,
    });
    const video = await videoRepository.save(
      videoRepository.create({
        user_id: user.id,
        channel_id: channel.id,
        storage_key: `videos/${email}.mp4`,
        status,
        thumbnail_key: thumbnailKey ?? null,
      }),
    );
    return { token, video };
  }

  describe('1. Emissão de URL de streaming', () => {
    it('stream-url-video-proprio-200', async () => {
      const { token, video } = await createOwnedVideo(
        'delivery1@example.com',
        VideoStatus.READY,
      );

      const res = await request(app.getHttpServer())
        .get(`/videos/${video.public_id}/stream-url`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(typeof res.body.url).toBe('string');
      expect((res.body.url as string).length).toBeGreaterThan(0);
    });
  });

  describe('2. Emissão de URL de download', () => {
    it('download-url-video-proprio-200', async () => {
      const { token, video } = await createOwnedVideo(
        'delivery2@example.com',
        VideoStatus.READY,
      );

      const res = await request(app.getHttpServer())
        .get(`/videos/${video.public_id}/download-url`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(typeof res.body.url).toBe('string');
      expect((res.body.url as string).length).toBeGreaterThan(0);
    });
  });

  describe('3. Vídeo inexistente', () => {
    it('stream-url-video-inexistente-404', async () => {
      const token = await registerConfirmAndLogin('delivery3@example.com');

      const res = await request(app.getHttpServer())
        .get('/videos/does-not-exist/stream-url')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('4. Vídeo ainda não pronto (status != ready)', () => {
    it('stream-url-video-nao-pronto-404', async () => {
      const notReadyStatuses = [
        VideoStatus.DRAFT,
        VideoStatus.PROCESSING,
        VideoStatus.ERROR,
      ];

      for (const status of notReadyStatuses) {
        const { token, video } = await createOwnedVideo(
          `delivery4-${status}@example.com`,
          status,
        );

        const res = await request(app.getHttpServer())
          .get(`/videos/${video.public_id}/stream-url`)
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
      }
    });
  });

  describe('5. Emissão de URL de thumbnail', () => {
    it('thumbnail-url-video-proprio-200', async () => {
      const thumbnailKey = `thumbnails/e2e-delivery-${Date.now()}.png`;
      await storageService.putObject(
        thumbnailKey,
        Buffer.from('thumbnail bytes'),
        'image/png',
      );

      try {
        const { token, video } = await createOwnedVideo(
          'delivery5@example.com',
          VideoStatus.READY,
          thumbnailKey,
        );

        const res = await request(app.getHttpServer())
          .get(`/videos/${video.public_id}/thumbnail-url`)
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(typeof res.body.url).toBe('string');
        expect((res.body.url as string).length).toBeGreaterThan(0);
      } finally {
        await storageService.deleteObject(thumbnailKey);
      }
    });

    it('thumbnail-url-video-sem-thumbnail-404', async () => {
      const { token, video } = await createOwnedVideo(
        'delivery6@example.com',
        VideoStatus.READY,
        null,
      );

      const res = await request(app.getHttpServer())
        .get(`/videos/${video.public_id}/thumbnail-url`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('VIDEO_THUMBNAIL_NOT_FOUND');
    });

    it('thumbnail-url-video-inexistente-404', async () => {
      const token = await registerConfirmAndLogin('delivery7@example.com');

      const res = await request(app.getHttpServer())
        .get('/videos/does-not-exist/thumbnail-url')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('VIDEO_NOT_FOUND');
    });

    it('thumbnail-url-video-de-outro-usuario-404', async () => {
      const thumbnailKey = `thumbnails/e2e-delivery-other-${Date.now()}.png`;
      await storageService.putObject(
        thumbnailKey,
        Buffer.from('thumbnail bytes'),
        'image/png',
      );

      try {
        const { video } = await createOwnedVideo(
          'delivery8-owner@example.com',
          VideoStatus.READY,
          thumbnailKey,
        );
        const otherToken = await registerConfirmAndLogin(
          'delivery8-other@example.com',
        );

        const res = await request(app.getHttpServer())
          .get(`/videos/${video.public_id}/thumbnail-url`)
          .set('Authorization', `Bearer ${otherToken}`);

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('VIDEO_NOT_FOUND');
      } finally {
        await storageService.deleteObject(thumbnailKey);
      }
    });
  });
});
