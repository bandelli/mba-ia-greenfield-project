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
import { cleanAllTables } from '../src/test/create-test-data-source';
import { User } from '../src/users/entities/user.entity';
import { Video, VideoStatus } from '../src/videos/entities/video.entity';

describe('Video edit & publish (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let channelRepository: Repository<Channel>;
  let videoRepository: Repository<Video>;
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
      }),
    );
    return { token, video };
  }

  describe('1. Video field editing', () => {
    it('editar-campos-do-video-com-sucesso', async () => {
      const { token, video } = await createOwnedVideo(
        'edit1@example.com',
        VideoStatus.READY,
      );

      const res = await request(app.getHttpServer())
        .patch(`/videos/${video.public_id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Novo título', category: 'music' });

      expect(res.status).toBe(200);
      expect(res.body.category).toBe('music');
    });

    it('rejeitar-edicao-de-video-de-outro-usuario', async () => {
      const { video } = await createOwnedVideo(
        'edit2-owner@example.com',
        VideoStatus.READY,
      );
      const otherToken = await registerConfirmAndLogin(
        'edit2-other@example.com',
      );

      const res = await request(app.getHttpServer())
        .patch(`/videos/${video.public_id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ title: 'Tentativa indevida' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('VIDEO_NOT_FOUND');
    });

    it('rejeitar-categoria-invalida', async () => {
      const { token, video } = await createOwnedVideo(
        'edit3@example.com',
        VideoStatus.READY,
      );

      const res = await request(app.getHttpServer())
        .patch(`/videos/${video.public_id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ category: 'not-a-real-category' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('2. Video publish', () => {
    it('publicar-video-pronto', async () => {
      const { token, video } = await createOwnedVideo(
        'publish1@example.com',
        VideoStatus.READY,
      );

      const res = await request(app.getHttpServer())
        .post(`/videos/${video.public_id}/publish`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Ready to publish' });

      expect(res.status).toBe(200);
      expect(res.body.published_at).not.toBeNull();
    });

    it('rejeitar-publicacao-de-video-nao-pronto', async () => {
      const { token, video } = await createOwnedVideo(
        'publish2@example.com',
        VideoStatus.PROCESSING,
      );

      const res = await request(app.getHttpServer())
        .post(`/videos/${video.public_id}/publish`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Not ready yet' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VIDEO_NOT_READY');
    });

    it('rejeitar-publicacao-de-video-sem-titulo', async () => {
      const { token, video } = await createOwnedVideo(
        'publish3@example.com',
        VideoStatus.READY,
      );

      const res = await request(app.getHttpServer())
        .post(`/videos/${video.public_id}/publish`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VIDEO_MISSING_TITLE');
    });

    it('nao-sobrescrever-published_at-ao-republicar', async () => {
      const { token, video } = await createOwnedVideo(
        'publish4@example.com',
        VideoStatus.READY,
      );

      const first = await request(app.getHttpServer())
        .post(`/videos/${video.public_id}/publish`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'First publish' });
      expect(first.status).toBe(200);
      const firstPublishedAt = first.body.published_at as string;

      const second = await request(app.getHttpServer())
        .post(`/videos/${video.public_id}/publish`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Edited after publish' });

      expect(second.status).toBe(200);
      expect(second.body.published_at).toBe(firstPublishedAt);
    });
  });

  describe('3. Get video for editing', () => {
    it('ler-video-proprio-para-edicao', async () => {
      const { token, video } = await createOwnedVideo(
        'get1@example.com',
        VideoStatus.READY,
      );

      const res = await request(app.getHttpServer())
        .get(`/videos/${video.public_id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.public_id).toBe(video.public_id);
    });

    it('rejeitar-leitura-de-video-de-outro-usuario', async () => {
      const { video } = await createOwnedVideo(
        'get2-owner@example.com',
        VideoStatus.READY,
      );
      const otherToken = await registerConfirmAndLogin(
        'get2-other@example.com',
      );

      const res = await request(app.getHttpServer())
        .get(`/videos/${video.public_id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('VIDEO_NOT_FOUND');
    });
  });
});
