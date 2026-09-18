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
import {
  Video,
  VideoStatus,
  VideoVisibility,
} from '../src/videos/entities/video.entity';

describe('Channel & dashboard video listings (e2e)', () => {
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

  async function setUpChannelWithVideos(
    email: string,
  ): Promise<{ token: string; channel: Channel }> {
    const token = await registerConfirmAndLogin(email);
    const user = await userRepository.findOneByOrFail({ email });
    const channel = await channelRepository.findOneByOrFail({
      user_id: user.id,
    });

    await videoRepository.save(
      videoRepository.create({
        user_id: user.id,
        channel_id: channel.id,
        storage_key: 'videos/draft.mp4',
        status: VideoStatus.DRAFT,
      }),
    );
    await videoRepository.save(
      videoRepository.create({
        user_id: user.id,
        channel_id: channel.id,
        storage_key: 'videos/unlisted.mp4',
        status: VideoStatus.READY,
        visibility: VideoVisibility.UNLISTED,
        published_at: new Date(),
      }),
    );
    await videoRepository.save(
      videoRepository.create({
        user_id: user.id,
        channel_id: channel.id,
        storage_key: 'videos/published.mp4',
        status: VideoStatus.READY,
        visibility: VideoVisibility.PUBLIC,
        published_at: new Date(),
      }),
    );

    return { token, channel };
  }

  describe('1. Channel & video listings', () => {
    it('listar-todos-os-videos-do-proprio-canal', async () => {
      const { token } = await setUpChannelWithVideos('listing1@example.com');

      const res = await request(app.getHttpServer())
        .get('/channels/me/videos')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(3);
    });

    it('listar-apenas-videos-publicados-e-publicos-do-canal', async () => {
      const { channel } = await setUpChannelWithVideos('listing2@example.com');

      const res = await request(app.getHttpServer()).get(
        `/channels/${channel.nickname}/videos`,
      );

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].published_at).not.toBeNull();
    });

    it('rejeitar-listagem-de-canal-inexistente', async () => {
      const res = await request(app.getHttpServer()).get(
        '/channels/nickname-que-nao-existe/videos',
      );

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('CHANNEL_NOT_FOUND');
    });

    it('exibir-informacoes-publicas-do-canal-sem-dados-privados', async () => {
      const { channel } = await setUpChannelWithVideos('listing3@example.com');

      const res = await request(app.getHttpServer()).get(
        `/channels/${channel.nickname}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.name).toBe(channel.name);
      expect(res.body.nickname).toBe(channel.nickname);
      expect(res.body.description).toBe(channel.description);
      expect(res.body.created_at).toBeTruthy();
      expect(res.body.user_id).toBeUndefined();
    });
  });
});
