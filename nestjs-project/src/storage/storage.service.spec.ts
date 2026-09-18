import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { randomUUID } from 'crypto';
import storageConfig from '../config/storage.config';
import { StorageModule } from './storage.module';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [storageConfig] }),
        StorageModule,
      ],
    }).compile();

    service = module.get(StorageService);
  });

  async function readAll(stream: NodeJS.ReadableStream): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks).toString('utf-8');
  }

  it('putObject stores an object retrievable via getObjectStream', async () => {
    const key = `test/${randomUUID()}.txt`;

    await service.putObject(key, Buffer.from('hello storage'), 'text/plain');
    const content = await readAll(await service.getObjectStream(key));

    expect(content).toBe('hello storage');

    await service.deleteObject(key);
  });

  it('deleteObject removes an existing object from the bucket', async () => {
    const key = `test/${randomUUID()}.txt`;
    await service.putObject(key, Buffer.from('to be deleted'));

    await service.deleteObject(key);

    await expect(service.getObjectStream(key)).rejects.toThrow();
  });

  it('getPresignedUrl returns a time-limited signed URL for an existing key', async () => {
    const key = `test/${randomUUID()}.txt`;
    await service.putObject(key, Buffer.from('presign me'));

    const url = await service.getPresignedUrl(key, 60);

    expect(url).toMatch(/^http/);
    expect(url).toContain('X-Amz-Expires=60');

    await service.deleteObject(key);
  });
});
