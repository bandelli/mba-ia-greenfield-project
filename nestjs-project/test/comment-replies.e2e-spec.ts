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
import { Comment } from '../src/videos/entities/comment.entity';
import {
  Video,
  VideoStatus,
  VideoVisibility,
} from '../src/videos/entities/video.entity';

describe('comment-replies', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let channelRepository: Repository<Channel>;
  let videoRepository: Repository<Video>;
  let commentRepository: Repository<Comment>;
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
    commentRepository = dataSource.getRepository(Comment);
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

  async function createVideoWithComment(): Promise<{
    video: Video;
    comment: Comment;
  }> {
    const n = ++counter;
    const owner = await userRepository.save(
      userRepository.create({
        email: `comment_replies_e2e_owner_${n}@example.com`,
        password: 'hashed',
      }),
    );
    const channel = await channelRepository.save(
      channelRepository.create({
        name: `Channel ${n}`,
        nickname: `crepliese2e${n}`,
        user_id: owner.id,
      }),
    );
    const video = await videoRepository.save(
      videoRepository.create({
        user_id: owner.id,
        channel_id: channel.id,
        storage_key: `videos/creplies-e2e-${n}.mp4`,
        status: VideoStatus.READY,
        visibility: VideoVisibility.PUBLIC,
        published_at: new Date(),
      }),
    );
    const comment = await commentRepository.save(
      commentRepository.create({
        video_id: video.id,
        user_id: owner.id,
        body: 'top-level comment',
      }),
    );
    return { video, comment };
  }

  // 1.1. rejeitar-sem-token — Covers AC #1
  it('rejects reply creation with no Authorization header', async () => {
    const { video, comment } = await createVideoWithComment();

    const res = await request(app.getHttpServer())
      .post(`/videos/${video.public_id}/comments/${comment.id}/replies`)
      .send({ body: 'oi' });

    expect(res.status).toBe(401);
  });

  // 1.2. responder-comentario-nivel-superior — Covers AC #2
  it('replies to a top-level comment and embeds it in the next listing', async () => {
    const { video, comment } = await createVideoWithComment();
    const token = await registerConfirmAndLogin('replier1@example.com');

    const createRes = await request(app.getHttpServer())
      .post(`/videos/${video.public_id}/comments/${comment.id}/replies`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Concordo!' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.body).toBe('Concordo!');

    const listRes = await request(app.getHttpServer()).get(
      `/videos/${video.public_id}/comments`,
    );

    const parent = listRes.body.items.find(
      (c: { id: string }) => c.id === comment.id,
    );
    expect(parent.replies).toHaveLength(1);
    expect(parent.replies[0].id).toBe(createRes.body.id);
  });

  // 1.3. rejeitar-resposta-a-reply — Covers AC #3
  it('rejects replying to a reply with REPLY_DEPTH_EXCEEDED', async () => {
    const { video, comment } = await createVideoWithComment();
    const token = await registerConfirmAndLogin('replier2@example.com');

    const replyRes = await request(app.getHttpServer())
      .post(`/videos/${video.public_id}/comments/${comment.id}/replies`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'first-level reply' });

    const res = await request(app.getHttpServer())
      .post(`/videos/${video.public_id}/comments/${replyRes.body.id}/replies`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'segunda camada' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('REPLY_DEPTH_EXCEEDED');
  });

  // 1.4. rejeitar-comentario-pai-inexistente — Covers AC #4
  it('rejects a reply targeting a non-existent parent comment', async () => {
    const { video } = await createVideoWithComment();
    const token = await registerConfirmAndLogin('replier3@example.com');

    const res = await request(app.getHttpServer())
      .post(
        `/videos/${video.public_id}/comments/comment-id-inexistente/replies`,
      )
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'oi' });

    expect(res.status).toBe(404);
  });
});
