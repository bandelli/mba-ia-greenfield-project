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

describe('Own-channel read & edit (e2e)', () => {
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

  async function ownChannel(email: string): Promise<Channel> {
    const user = await userRepository.findOneByOrFail({ email });
    return channelRepository.findOneByOrFail({ user_id: user.id });
  }

  describe('1. Own-channel read & edit', () => {
    it('ler-proprio-canal-autenticado', async () => {
      const token = await registerConfirmAndLogin('channelme1@example.com');
      const channel = await ownChannel('channelme1@example.com');

      const res = await request(app.getHttpServer())
        .get('/channels/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.nickname).toBe(channel.nickname);
      expect(res.body.name).toBe(channel.name);
      expect(res.body.description).toBe(channel.description);
    });

    it('editar-nickname-livre-com-sucesso', async () => {
      const token = await registerConfirmAndLogin('channelme2@example.com');

      const res = await request(app.getHttpServer())
        .patch('/channels/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ nickname: 'novo_nick_livre' });

      expect(res.status).toBe(200);
      expect(res.body.nickname).toBe('novo_nick_livre');
    });

    it('rejeitar-nickname-ja-em-uso', async () => {
      const otherToken = await registerConfirmAndLogin(
        'channelme3-other@example.com',
      );
      await request(app.getHttpServer())
        .patch('/channels/me')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ nickname: 'nickname_ocupado' });
      const token = await registerConfirmAndLogin(
        'channelme3-owner@example.com',
      );

      const res = await request(app.getHttpServer())
        .patch('/channels/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ nickname: 'nickname_ocupado' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('CHANNEL_NICKNAME_TAKEN');
    });

    it('rejeitar-leitura-sem-token', async () => {
      const res = await request(app.getHttpServer()).get('/channels/me');

      expect(res.status).toBe(401);
    });
  });
});
