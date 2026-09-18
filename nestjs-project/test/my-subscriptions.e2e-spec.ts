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

describe('my-subscriptions', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let channelRepository: Repository<Channel>;
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

  async function createChannel(): Promise<Channel> {
    const n = ++counter;
    const owner = await userRepository.save(
      userRepository.create({
        email: `mysubs_e2e_owner_${n}@example.com`,
        password: 'hashed',
      }),
    );
    return channelRepository.save(
      channelRepository.create({
        name: `Channel ${n}`,
        nickname: `mysubse2e${n}`,
        user_id: owner.id,
      }),
    );
  }

  async function subscribe(token: string, channel: Channel): Promise<void> {
    await request(app.getHttpServer())
      .put(`/channels/${channel.nickname}/subscription`)
      .set('Authorization', `Bearer ${token}`)
      .send({ subscribed: true });
  }

  // 1.1. rejeitar-sem-token — Covers AC #1
  it('rejects a request with no Authorization header', async () => {
    const res = await request(app.getHttpServer()).get(
      '/users/me/subscriptions',
    );

    expect(res.status).toBe(401);
  });

  // 1.2. listar-canais-seguidos — Covers AC #2
  it('lists the channels the caller follows', async () => {
    const token = await registerConfirmAndLogin('follower1@example.com');
    const channelA = await createChannel();
    const channelB = await createChannel();
    await subscribe(token, channelA);
    await subscribe(token, channelB);

    const res = await request(app.getHttpServer())
      .get('/users/me/subscriptions')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(
      res.body.items.map((c: { nickname: string }) => c.nickname).sort(),
    ).toEqual([channelA.nickname, channelB.nickname].sort());
  });

  // 1.3. paginacao-respeita-limit — Covers AC #3
  it('respects the limit query parameter', async () => {
    const token = await registerConfirmAndLogin('follower2@example.com');
    const channelA = await createChannel();
    const channelB = await createChannel();
    await subscribe(token, channelA);
    await subscribe(token, channelB);

    const res = await request(app.getHttpServer())
      .get('/users/me/subscriptions')
      .query({ limit: 1 })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });
});
