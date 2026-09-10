import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import ffmpeg from 'fluent-ffmpeg';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { DomainExceptionFilter } from '../src/common/filters/domain-exception.filter';
import { ValidationExceptionFilter } from '../src/common/filters/validation-exception.filter';
import { StorageService } from '../src/storage/storage.service';
import { cleanAllTables } from '../src/test/create-test-data-source';
import { Video } from '../src/videos/entities/video.entity';

const TUS_RESUMABLE = '1.0.0';
const UPLOAD_PATH = '/videos/uploads';

function encodeMetadata(pairs: Record<string, string>): string {
  return Object.entries(pairs)
    .map(([key, value]) => `${key} ${Buffer.from(value).toString('base64')}`)
    .join(',');
}

function locationPath(locationHeader: string): string {
  // @tus/server may return an absolute or relative Location — normalize to
  // a path supertest can hit directly.
  if (locationHeader.startsWith('http')) {
    return new URL(locationHeader).pathname;
  }
  return locationHeader;
}

describe('Video upload (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let videoRepository: Repository<Video>;
  let storageService: StorageService;
  let throttlerStorage: ThrottlerStorageService;
  let validFixture: Buffer;
  let invalidFixture: Buffer;
  let fixtureTempDir: string;

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
    videoRepository = dataSource.getRepository(Video);
    storageService = moduleFixture.get(StorageService);
    throttlerStorage =
      moduleFixture.get<ThrottlerStorageService>(ThrottlerStorage);

    // Synthetic fixtures (per the same pattern as
    // video-processing.service.spec.ts) — avoids committing binary fixtures.
    fixtureTempDir = await mkdtemp(join(tmpdir(), 'upload-e2e-'));
    const validPath = join(fixtureTempDir, 'valid.mp4');
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input('testsrc=duration=1:size=320x240:rate=15')
        .inputFormat('lavfi')
        .output(validPath)
        .on('end', () => resolve())
        .on('error', (error: Error) => reject(error))
        .run();
    });
    validFixture = await readFile(validPath);
    invalidFixture = Buffer.from('this is not a video file, just text');
  }, 30000);

  afterAll(async () => {
    await rm(fixtureTempDir, { recursive: true, force: true });
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

  describe('1. Autenticação e validação declarada (onUploadCreate)', () => {
    it('upload-sem-autenticacao-401', async () => {
      const res = await request(app.getHttpServer())
        .post(UPLOAD_PATH)
        .set('Tus-Resumable', TUS_RESUMABLE)
        .set('Upload-Length', String(validFixture.length))
        .set(
          'Upload-Metadata',
          encodeMetadata({ filetype: 'video/mp4', filename: 'video.mp4' }),
        );

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UPLOAD_UNAUTHENTICATED');
      expect(await videoRepository.count()).toBe(0);
    });

    it('upload-metadata-invalida-400-sem-draft', async () => {
      const token = await registerConfirmAndLogin('upload1@example.com');

      const res = await request(app.getHttpServer())
        .post(UPLOAD_PATH)
        .set('Authorization', `Bearer ${token}`)
        .set('Tus-Resumable', TUS_RESUMABLE)
        .set('Upload-Length', String(invalidFixture.length))
        .set(
          'Upload-Metadata',
          encodeMetadata({
            filetype: 'application/pdf',
            filename: 'document.pdf',
          }),
        );

      expect(res.status).toBe(400);
      expect(JSON.parse(res.text).error).toBe('UPLOAD_INVALID_FILE_TYPE');
      expect(await videoRepository.count()).toBe(0);
    });

    it('upload-valido-cria-draft-com-ownership', async () => {
      const token = await registerConfirmAndLogin('upload2@example.com');

      const res = await request(app.getHttpServer())
        .post(UPLOAD_PATH)
        .set('Authorization', `Bearer ${token}`)
        .set('Tus-Resumable', TUS_RESUMABLE)
        .set('Upload-Length', String(validFixture.length))
        .set(
          'Upload-Metadata',
          encodeMetadata({ filetype: 'video/mp4', filename: 'video.mp4' }),
        );

      expect(res.status).toBe(201);
      expect(res.headers.location).toBeDefined();

      const videos = await videoRepository.find();
      expect(videos).toHaveLength(1);
      expect(videos[0].user_id).toBeDefined();
      expect(videos[0].channel_id).toBeDefined();
    });
  });

  describe('2. Checagem autoritativa pós-upload (onUploadFinish)', () => {
    async function createUploadSession(
      token: string,
      fixture: Buffer,
    ): Promise<string> {
      const res = await request(app.getHttpServer())
        .post(UPLOAD_PATH)
        .set('Authorization', `Bearer ${token}`)
        .set('Tus-Resumable', TUS_RESUMABLE)
        .set('Upload-Length', String(fixture.length))
        .set(
          'Upload-Metadata',
          encodeMetadata({ filetype: 'video/mp4', filename: 'video.mp4' }),
        );
      expect(res.status).toBe(201);
      return locationPath(res.headers.location);
    }

    it('upload-conteudo-invalido-422-remove-storage-e-draft', async () => {
      const token = await registerConfirmAndLogin('upload3@example.com');
      const location = await createUploadSession(token, invalidFixture);
      const [video] = await videoRepository.find();
      const storageKey = video.storage_key;

      const patchRes = await request(app.getHttpServer())
        .patch(location)
        .set('Authorization', `Bearer ${token}`)
        .set('Tus-Resumable', TUS_RESUMABLE)
        .set('Upload-Offset', '0')
        .set('Content-Type', 'application/offset+octet-stream')
        .send(invalidFixture);

      expect(patchRes.status).toBe(422);
      expect(JSON.parse(patchRes.text).error).toBe(
        'UPLOAD_CONTENT_VALIDATION_FAILED',
      );
      expect(await videoRepository.findOneBy({ id: video.id })).toBeNull();
      await expect(
        storageService.getObjectStream(storageKey),
      ).rejects.toThrow();
    }, 30000);

    it('upload-valido-publica-job-processamento', async () => {
      const token = await registerConfirmAndLogin('upload4@example.com');
      const location = await createUploadSession(token, validFixture);
      const [video] = await videoRepository.find();

      const patchRes = await request(app.getHttpServer())
        .patch(location)
        .set('Authorization', `Bearer ${token}`)
        .set('Tus-Resumable', TUS_RESUMABLE)
        .set('Upload-Offset', '0')
        .set('Content-Type', 'application/offset+octet-stream')
        .send(validFixture);

      expect([200, 204]).toContain(patchRes.status);

      const found = await videoRepository.findOneByOrFail({ id: video.id });
      expect(found.status).toBe('processing');
    }, 30000);
  });
});
