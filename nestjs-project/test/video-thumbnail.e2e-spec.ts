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

// Minimal valid 1x1 PNG — FileTypeValidator sniffs magic numbers, so a real
// image signature is required (a fake .jpg extension with arbitrary bytes
// would be rejected regardless of the declared filename/content-type).
const VALID_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

describe('Video thumbnail upload (e2e)', () => {
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
    thumbnailKey: string,
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
        status: VideoStatus.READY,
        thumbnail_key: thumbnailKey,
      }),
    );
    return { token, video };
  }

  describe('1. Thumbnail upload', () => {
    it('substituir-thumbnail-com-arquivo-valido', async () => {
      const thumbnailKey = `thumbnails/e2e-existing-${Date.now()}.png`;
      await storageService.putObject(
        thumbnailKey,
        Buffer.from('original thumbnail'),
        'image/png',
      );
      const { token, video } = await createOwnedVideo(
        'thumb1@example.com',
        thumbnailKey,
      );

      try {
        const res = await request(app.getHttpServer())
          .patch(`/videos/${video.public_id}/thumbnail`)
          .set('Authorization', `Bearer ${token}`)
          .attach('thumbnail', VALID_PNG, 'thumbnail.png');

        expect(res.status).toBe(200);
        expect(res.body.thumbnail_key).toBe(thumbnailKey);
      } finally {
        await storageService.deleteObject(thumbnailKey);
      }
    });

    it('rejeitar-arquivo-de-tipo-invalido', async () => {
      const { token, video } = await createOwnedVideo(
        'thumb2@example.com',
        `thumbnails/e2e-${Date.now()}.png`,
      );

      const res = await request(app.getHttpServer())
        .patch(`/videos/${video.public_id}/thumbnail`)
        .set('Authorization', `Bearer ${token}`)
        .attach('thumbnail', Buffer.from('not an image'), 'note.txt');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('THUMBNAIL_INVALID_FILE');
    });

    it('rejeitar-arquivo-maior-que-o-limite', async () => {
      const { token, video } = await createOwnedVideo(
        'thumb3@example.com',
        `thumbnails/e2e-${Date.now()}.png`,
      );
      const oversizedPng = Buffer.concat([
        VALID_PNG,
        Buffer.alloc(6 * 1024 * 1024),
      ]);

      const res = await request(app.getHttpServer())
        .patch(`/videos/${video.public_id}/thumbnail`)
        .set('Authorization', `Bearer ${token}`)
        .attach('thumbnail', oversizedPng, 'big.png');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('THUMBNAIL_INVALID_FILE');
    });

    it('rejeitar-upload-em-video-de-outro-usuario', async () => {
      const { video } = await createOwnedVideo(
        'thumb4-owner@example.com',
        `thumbnails/e2e-${Date.now()}.png`,
      );
      const otherToken = await registerConfirmAndLogin(
        'thumb4-other@example.com',
      );

      const res = await request(app.getHttpServer())
        .patch(`/videos/${video.public_id}/thumbnail`)
        .set('Authorization', `Bearer ${otherToken}`)
        .attach('thumbnail', VALID_PNG, 'thumbnail.png');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('VIDEO_NOT_FOUND');
    });
  });
});
