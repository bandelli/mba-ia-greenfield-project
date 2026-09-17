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

describe('Public video listing (home feed) endpoint (e2e)', () => {
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
        email: `public_listing_e2e_${n}@example.com`,
        password: 'hashed',
      }),
    );
    const channel = await channelRepository.save(
      channelRepository.create({
        name: `Public Listing E2E Channel ${n}`,
        nickname: `publiclistinge2e${n}`,
        user_id: user.id,
      }),
    );
    return videoRepository.save(
      videoRepository.create({
        user_id: user.id,
        channel_id: channel.id,
        storage_key: `videos/public-listing-e2e-${n}.mp4`,
        status: VideoStatus.READY,
        visibility: VideoVisibility.PUBLIC,
        title: `Video ${n}`,
        views: 0,
        published_at: new Date(),
        ...overrides,
      }),
    );
  }

  it('retorna 200 com os campos documentados, mais recentes primeiro', async () => {
    const older = await createVideo({
      title: 'Older video',
      published_at: new Date('2026-01-01'),
    });
    const newer = await createVideo({
      title: 'Newer video',
      published_at: new Date('2026-01-02'),
    });
    const channel = await channelRepository.findOneByOrFail({
      id: newer.channel_id,
    });

    const res = await request(app.getHttpServer()).get('/videos/public');

    expect(res.status).toBe(200);
    expect(res.body.items.map((v: { title: string }) => v.title)).toEqual([
      newer.title,
      older.title,
    ]);
    expect(res.body.items[0]).toMatchObject({
      public_id: newer.public_id,
      channel: { nickname: channel.nickname, name: channel.name },
    });
    expect(res.body.total).toBe(2);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(24);
  });

  it('filtra por categoria via ?category=', async () => {
    await createVideo({ title: 'Music video', category: VideoCategory.MUSIC });
    await createVideo({
      title: 'Gaming video',
      category: VideoCategory.GAMING,
    });

    const res = await request(app.getHttpServer())
      .get('/videos/public')
      .query({ category: 'music' });

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].title).toBe('Music video');
  });

  it('busca por título ou canal via ?q=', async () => {
    await createVideo({ title: 'Building a home page' });
    await createVideo({ title: 'Unrelated' });

    const res = await request(app.getHttpServer())
      .get('/videos/public')
      .query({ q: 'home page' });

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].title).toBe('Building a home page');
  });

  it('pagina com ?page=&limit=', async () => {
    for (let i = 0; i < 3; i++) {
      await createVideo({ title: `Video ${i}` });
    }

    const res = await request(app.getHttpServer())
      .get('/videos/public')
      .query({ page: 2, limit: 2 });

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.page).toBe(2);
    expect(res.body.limit).toBe(2);
    expect(res.body.total).toBe(3);
  });

  it('retorna 400 VALIDATION_ERROR para categoria inválida', async () => {
    const res = await request(app.getHttpServer())
      .get('/videos/public')
      .query({ category: 'not-a-real-category' });

    expect(res.status).toBe(400);
  });

  it('nunca inclui vídeos draft, unlisted, ou não publicados', async () => {
    await createVideo({
      title: 'Draft',
      status: VideoStatus.DRAFT,
      published_at: null,
    });
    await createVideo({
      title: 'Unlisted',
      visibility: VideoVisibility.UNLISTED,
    });
    await createVideo({ title: 'Unpublished', published_at: null });

    const res = await request(app.getHttpServer()).get('/videos/public');

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });

  it('é acessível anonimamente (sem Authorization header)', async () => {
    await createVideo();

    const res = await request(app.getHttpServer()).get('/videos/public');

    expect(res.status).toBe(200);
  });
});
