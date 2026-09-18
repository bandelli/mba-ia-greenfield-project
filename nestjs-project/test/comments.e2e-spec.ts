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

describe('comments', () => {
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

  async function createPublicVideo(): Promise<Video> {
    const n = ++counter;
    const owner = await userRepository.save(
      userRepository.create({
        email: `comments_e2e_owner_${n}@example.com`,
        password: 'hashed',
      }),
    );
    const channel = await channelRepository.save(
      channelRepository.create({
        name: `Channel ${n}`,
        nickname: `commentse2e${n}`,
        user_id: owner.id,
      }),
    );
    return videoRepository.save(
      videoRepository.create({
        user_id: owner.id,
        channel_id: channel.id,
        storage_key: `videos/comments-e2e-${n}.mp4`,
        status: VideoStatus.READY,
        visibility: VideoVisibility.PUBLIC,
        published_at: new Date(),
      }),
    );
  }

  async function seedComments(video: Video, count: number): Promise<void> {
    const { user: author } = await (async () => {
      const n = ++counter;
      const user = await userRepository.save(
        userRepository.create({
          email: `comments_e2e_author_${n}@example.com`,
          password: 'hashed',
        }),
      );
      await channelRepository.save(
        channelRepository.create({
          name: `Author ${n}`,
          nickname: `commentse2eauthor${n}`,
          user_id: user.id,
        }),
      );
      return { user };
    })();

    for (let i = 0; i < count; i++) {
      await commentRepository.save(
        commentRepository.create({
          video_id: video.id,
          user_id: author.id,
          body: `comment ${i}`,
          created_at: new Date(`2026-01-0${i + 1}`),
        }),
      );
    }
  }

  // 1.1. listar-comentarios-sem-autenticacao — Covers AC #1
  it('lists comments anonymously', async () => {
    const video = await createPublicVideo();
    await seedComments(video, 3);

    const res = await request(app.getHttpServer()).get(
      `/videos/${video.public_id}/comments`,
    );

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(3);
    expect(res.body.total).toBe(3);
  });

  // 1.2. paginacao-respeita-limit — Covers AC #2
  it('respects the limit query parameter while reporting the true total', async () => {
    const video = await createPublicVideo();
    await seedComments(video, 3);

    const res = await request(app.getHttpServer())
      .get(`/videos/${video.public_id}/comments`)
      .query({ limit: 1 });

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.total).toBe(3);
  });

  // 2.1. rejeitar-criacao-sem-token — Covers AC #3
  it('rejects comment creation with no Authorization header', async () => {
    const video = await createPublicVideo();

    const res = await request(app.getHttpServer())
      .post(`/videos/${video.public_id}/comments`)
      .send({ body: 'oi' });

    expect(res.status).toBe(401);
  });

  // 2.2. rejeitar-body-vazio — Covers AC #4
  it('rejects an empty body with a validation error', async () => {
    const video = await createPublicVideo();
    const token = await registerConfirmAndLogin('commenter1@example.com');

    const res = await request(app.getHttpServer())
      .post(`/videos/${video.public_id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: '' });

    expect(res.status).toBe(400);
  });

  // 2.3. criar-comentario-com-sucesso — Covers AC #5
  it('creates a comment and reflects it in the next listing with an incremented total', async () => {
    const video = await createPublicVideo();
    const token = await registerConfirmAndLogin('commenter2@example.com');

    const createRes = await request(app.getHttpServer())
      .post(`/videos/${video.public_id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Ótimo vídeo!' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.body).toBe('Ótimo vídeo!');

    const listRes = await request(app.getHttpServer()).get(
      `/videos/${video.public_id}/comments`,
    );

    expect(listRes.body.total).toBe(1);
    expect(
      listRes.body.items.some(
        (c: { id: string }) => c.id === createRes.body.id,
      ),
    ).toBe(true);
  });
});
