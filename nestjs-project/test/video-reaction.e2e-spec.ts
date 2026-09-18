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

describe('video-reaction', () => {
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

  let counter = 0;

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

  async function createPublicVideo(): Promise<Video> {
    const n = ++counter;
    const owner = await userRepository.save(
      userRepository.create({
        email: `video_reaction_owner_${n}@example.com`,
        password: 'hashed',
      }),
    );
    const channel = await channelRepository.save(
      channelRepository.create({
        name: `Channel ${n}`,
        nickname: `videoreactione2e${n}`,
        user_id: owner.id,
      }),
    );
    return videoRepository.save(
      videoRepository.create({
        user_id: owner.id,
        channel_id: channel.id,
        storage_key: `videos/video-reaction-e2e-${n}.mp4`,
        status: VideoStatus.READY,
        visibility: VideoVisibility.PUBLIC,
        published_at: new Date(),
      }),
    );
  }

  // 1.1. rejeitar-sem-token — Covers AC #1
  it('rejects a request with no Authorization header', async () => {
    const video = await createPublicVideo();

    const res = await request(app.getHttpServer())
      .put(`/videos/${video.public_id}/reaction`)
      .send({ type: 'like' });

    expect(res.status).toBe(401);
  });

  // 1.2. curtir-video-incrementa-contador — Covers AC #2
  it('likes a video and increments the counter', async () => {
    const video = await createPublicVideo();
    const token = await registerConfirmAndLogin('reactor1@example.com');

    const res = await request(app.getHttpServer())
      .put(`/videos/${video.public_id}/reaction`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'like' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      type: 'like',
      likesCount: 1,
      dislikesCount: 0,
    });
  });

  // 1.3. repetir-like-nao-duplica-contador — Covers AC #3
  it('does not duplicate the counter when the same like is repeated', async () => {
    const video = await createPublicVideo();
    const token = await registerConfirmAndLogin('reactor2@example.com');

    const first = await request(app.getHttpServer())
      .put(`/videos/${video.public_id}/reaction`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'like' });
    const second = await request(app.getHttpServer())
      .put(`/videos/${video.public_id}/reaction`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'like' });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.likesCount).toBe(1);
    expect(second.body.likesCount).toBe(1);
  });

  // 1.4. trocar-de-like-para-dislike — Covers AC #4
  it('switches from like to dislike without an intermediate removed state', async () => {
    const video = await createPublicVideo();
    const token = await registerConfirmAndLogin('reactor3@example.com');

    await request(app.getHttpServer())
      .put(`/videos/${video.public_id}/reaction`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'like' });
    const res = await request(app.getHttpServer())
      .put(`/videos/${video.public_id}/reaction`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'dislike' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      type: 'dislike',
      likesCount: 0,
      dislikesCount: 1,
    });
  });

  // 1.5. rejeitar-video-inexistente — Covers AC #5
  it('rejects a reaction targeting a non-existent public_id', async () => {
    const token = await registerConfirmAndLogin('reactor4@example.com');

    const res = await request(app.getHttpServer())
      .put('/videos/does-not-exist/reaction')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'like' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('VIDEO_NOT_FOUND');
  });
});
