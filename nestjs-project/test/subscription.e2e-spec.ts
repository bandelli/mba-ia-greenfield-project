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

describe('subscription', () => {
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

  async function registerConfirmAndLogin(
    email: string,
  ): Promise<{ token: string; channel: Channel }> {
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

    const user = await userRepository.findOneByOrFail({ email });
    const channel = await channelRepository.findOneByOrFail({
      user_id: user.id,
    });

    return { token: res.body.access_token as string, channel };
  }

  // 1.1. rejeitar-sem-token — Covers AC #1
  it('rejects a request with no Authorization header', async () => {
    const { channel } = await registerConfirmAndLogin('channelb1@example.com');

    const res = await request(app.getHttpServer())
      .put(`/channels/${channel.nickname}/subscription`)
      .send({ subscribed: true });

    expect(res.status).toBe(401);
  });

  // 1.2. inscrever-se-incrementa-contador — Covers AC #2
  it('subscribes to another channel and increments the counter', async () => {
    const a = await registerConfirmAndLogin('subscriber_a2@example.com');
    const b = await registerConfirmAndLogin('channelb2@example.com');

    const res = await request(app.getHttpServer())
      .put(`/channels/${b.channel.nickname}/subscription`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ subscribed: true });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ subscribed: true, subscribersCount: 1 });
  });

  // 1.3. repetir-inscricao-nao-duplica-contador — Covers AC #3
  it('does not duplicate the counter when subscribing twice', async () => {
    const a = await registerConfirmAndLogin('subscriber_a3@example.com');
    const b = await registerConfirmAndLogin('channelb3@example.com');

    const first = await request(app.getHttpServer())
      .put(`/channels/${b.channel.nickname}/subscription`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ subscribed: true });
    const second = await request(app.getHttpServer())
      .put(`/channels/${b.channel.nickname}/subscription`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ subscribed: true });

    expect(first.body.subscribersCount).toBe(1);
    expect(second.body.subscribersCount).toBe(1);
  });

  // 1.4. rejeitar-auto-inscricao — Covers AC #4
  it('rejects the owner subscribing to their own channel', async () => {
    const a = await registerConfirmAndLogin('subscriber_a4@example.com');

    const res = await request(app.getHttpServer())
      .put(`/channels/${a.channel.nickname}/subscription`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ subscribed: true });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('CANNOT_SUBSCRIBE_OWN_CHANNEL');
  });

  // 1.5. rejeitar-canal-inexistente — Covers AC #5
  it('rejects a subscription targeting a non-existent channel', async () => {
    const a = await registerConfirmAndLogin('subscriber_a5@example.com');

    const res = await request(app.getHttpServer())
      .put('/channels/no-such-channel/subscription')
      .set('Authorization', `Bearer ${a.token}`)
      .send({ subscribed: true });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('CHANNEL_NOT_FOUND');
  });

  it('GET /channels/:nickname reports isSubscribed:false for an anonymous caller', async () => {
    const b = await registerConfirmAndLogin('channelb6@example.com');

    const res = await request(app.getHttpServer()).get(
      `/channels/${b.channel.nickname}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.isSubscribed).toBe(false);
  });

  it('GET /channels/:nickname reflects the real subscription for the authenticated caller', async () => {
    const a = await registerConfirmAndLogin('subscriber_a6@example.com');
    const b = await registerConfirmAndLogin('channelb7@example.com');
    await request(app.getHttpServer())
      .put(`/channels/${b.channel.nickname}/subscription`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ subscribed: true });

    const res = await request(app.getHttpServer())
      .get(`/channels/${b.channel.nickname}`)
      .set('Authorization', `Bearer ${a.token}`);

    expect(res.status).toBe(200);
    expect(res.body.isSubscribed).toBe(true);
    expect(res.body.subscribersCount).toBe(1);
  });
});
