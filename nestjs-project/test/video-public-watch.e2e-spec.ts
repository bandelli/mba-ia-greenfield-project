import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Channel } from '../src/channels/entities/channel.entity';
import { DomainExceptionFilter } from '../src/common/filters/domain-exception.filter';
import { ValidationExceptionFilter } from '../src/common/filters/validation-exception.filter';
import { cleanAllTables } from '../src/test/create-test-data-source';
import { User } from '../src/users/entities/user.entity';
import {
  Video,
  VideoCategory,
  VideoStatus,
  VideoVisibility,
} from '../src/videos/entities/video.entity';

describe('Public video watch endpoint (e2e)', () => {
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
  async function createVideo(overrides: Partial<Video> = {}): Promise<Video> {
    const n = ++counter;
    const user = await userRepository.save(
      userRepository.create({
        email: `public_watch_e2e_${n}@example.com`,
        password: 'hashed',
      }),
    );
    const channel = await channelRepository.save(
      channelRepository.create({
        name: `Public Watch E2E Channel ${n}`,
        nickname: `publicwatche2e${n}`,
        user_id: user.id,
      }),
    );
    return videoRepository.save(
      videoRepository.create({
        user_id: user.id,
        channel_id: channel.id,
        storage_key: `videos/public-watch-e2e-${n}.mp4`,
        status: VideoStatus.READY,
        visibility: VideoVisibility.PUBLIC,
        title: `Video ${n}`,
        views: 0,
        published_at: new Date(),
        ...overrides,
      }),
    );
  }

  it('retorna 200 com os campos documentados para um vídeo ready+public', async () => {
    const video = await createVideo({ visibility: VideoVisibility.PUBLIC });
    const channel = await channelRepository.findOneByOrFail({
      id: video.channel_id,
    });

    const res = await request(app.getHttpServer()).get(
      `/videos/public/${video.public_id}`,
    );

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: video.id,
      public_id: video.public_id,
      title: video.title,
      visibility: VideoVisibility.PUBLIC,
      views: 1,
      channel: { nickname: channel.nickname, name: channel.name },
    });
  });

  it('retorna 200 para um vídeo ready+unlisted (acessível via link direto)', async () => {
    const video = await createVideo({ visibility: VideoVisibility.UNLISTED });

    const res = await request(app.getHttpServer()).get(
      `/videos/public/${video.public_id}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.visibility).toBe(VideoVisibility.UNLISTED);
  });

  it('retorna 404 VIDEO_NOT_FOUND para um vídeo draft', async () => {
    const video = await createVideo({ status: VideoStatus.DRAFT });

    const res = await request(app.getHttpServer()).get(
      `/videos/public/${video.public_id}`,
    );

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('VIDEO_NOT_FOUND');
  });

  it('retorna 404 VIDEO_NOT_FOUND para um vídeo ready+public ainda não publicado', async () => {
    const video = await createVideo({ published_at: null });

    const res = await request(app.getHttpServer()).get(
      `/videos/public/${video.public_id}`,
    );

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('VIDEO_NOT_FOUND');
  });

  it('retorna 404 VIDEO_NOT_FOUND para um public_id inexistente', async () => {
    const res = await request(app.getHttpServer()).get(
      '/videos/public/does-not-exist',
    );

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('VIDEO_NOT_FOUND');
  });

  it('incrementa views em exatamente 1 a cada GET bem-sucedido', async () => {
    const video = await createVideo({ views: 5 });

    await request(app.getHttpServer()).get(`/videos/public/${video.public_id}`);

    const reloaded = await videoRepository.findOneByOrFail({ id: video.id });
    expect(reloaded.views).toBe(6);
  });

  it('retorna 200 com URL pré-assinada para stream-url de um vídeo ready+public', async () => {
    const video = await createVideo({ visibility: VideoVisibility.PUBLIC });

    const res = await request(app.getHttpServer()).get(
      `/videos/public/${video.public_id}/stream-url`,
    );

    expect(res.status).toBe(200);
    expect(typeof res.body.url).toBe('string');
    expect((res.body.url as string).length).toBeGreaterThan(0);
  });

  it('retorna 200 com URL pré-assinada para download-url da mesma entrada', async () => {
    const video = await createVideo({ visibility: VideoVisibility.UNLISTED });

    const res = await request(app.getHttpServer()).get(
      `/videos/public/${video.public_id}/download-url`,
    );

    expect(res.status).toBe(200);
    expect(typeof res.body.url).toBe('string');
    expect((res.body.url as string).length).toBeGreaterThan(0);
  });

  it('retorna 404 VIDEO_NOT_FOUND para stream-url de um vídeo draft', async () => {
    const video = await createVideo({ status: VideoStatus.DRAFT });

    const res = await request(app.getHttpServer()).get(
      `/videos/public/${video.public_id}/stream-url`,
    );

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('VIDEO_NOT_FOUND');
  });

  it('retorna 404 VIDEO_NOT_FOUND para download-url de um public_id inexistente', async () => {
    const res = await request(app.getHttpServer()).get(
      '/videos/public/does-not-exist/download-url',
    );

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('VIDEO_NOT_FOUND');
  });

  it('stream-url e download-url não incrementam views (apenas o endpoint de metadados incrementa)', async () => {
    const video = await createVideo({ views: 5 });

    await request(app.getHttpServer()).get(
      `/videos/public/${video.public_id}/stream-url`,
    );
    await request(app.getHttpServer()).get(
      `/videos/public/${video.public_id}/download-url`,
    );

    const reloaded = await videoRepository.findOneByOrFail({ id: video.id });
    expect(reloaded.views).toBe(5);
  });

  it('retorna até 12 itens da mesma categoria do vídeo âncora, ready+public, sem o próprio âncora, ordenados por published_at desc', async () => {
    const anchor = await createVideo({
      category: VideoCategory.MUSIC,
      published_at: new Date('2026-01-01'),
    });
    const older = await createVideo({
      category: VideoCategory.MUSIC,
      published_at: new Date('2026-01-02'),
    });
    const newer = await createVideo({
      category: VideoCategory.MUSIC,
      published_at: new Date('2026-01-03'),
    });
    await createVideo({
      category: VideoCategory.GAMING,
      published_at: new Date('2026-01-04'),
    });

    const res = await request(app.getHttpServer()).get(
      `/videos/public/${anchor.public_id}/suggested`,
    );

    expect(res.status).toBe(200);
    expect(
      res.body.items.map((v: { public_id: string }) => v.public_id),
    ).toEqual([newer.public_id, older.public_id]);
  });

  it('retorna 404 VIDEO_NOT_FOUND para suggested de um public_id inexistente', async () => {
    const res = await request(app.getHttpServer()).get(
      '/videos/public/does-not-exist/suggested',
    );

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('VIDEO_NOT_FOUND');
  });
});
