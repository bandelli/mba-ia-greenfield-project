import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { randomUUID } from 'crypto';
import queueConfig from '../config/queue.config';
import { QueueModule } from './queue.module';
import { QueueService } from './queue.service';

describe('QueueService', () => {
  let service: QueueService;
  let moduleRef: import('@nestjs/testing').TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [queueConfig] }),
        QueueModule,
      ],
    }).compile();
    await moduleRef.init();

    service = moduleRef.get(QueueService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('send() enqueues a job and an active work() handler processes it', async () => {
    const queue = `test-queue-${randomUUID()}`;
    const received: { msg: string }[] = [];
    let resolveHandled: () => void;
    const handled = new Promise<void>((resolve) => {
      resolveHandled = resolve;
    });

    await service.work<{ msg: string }>(queue, (data) => {
      received.push(data);
      resolveHandled();
      return Promise.resolve();
    });

    await service.send(queue, { msg: 'hello queue' });

    await handled;

    expect(received).toEqual([{ msg: 'hello queue' }]);
  }, 20000);

  it('a job whose handler throws is retried automatically per retry/backoff config', async () => {
    const queue = `test-retry-${randomUUID()}`;
    let attempts = 0;
    let resolveSecondAttempt: () => void;
    const secondAttempt = new Promise<void>((resolve) => {
      resolveSecondAttempt = resolve;
    });

    await service.work<{ msg: string }>(queue, () => {
      attempts += 1;
      if (attempts === 1) {
        return Promise.reject(new Error('simulated failure'));
      }
      resolveSecondAttempt();
      return Promise.resolve();
    });

    await service.send(
      queue,
      { msg: 'retry me' },
      { retryLimit: 2, retryDelay: 1, retryBackoff: false },
    );

    await secondAttempt;

    expect(attempts).toBeGreaterThanOrEqual(2);
  }, 20000);

  it('workWithMetadata() exposes retryCount/retryLimit on the job passed to the handler', async () => {
    const queue = `test-metadata-${randomUUID()}`;
    let resolveObserved: (value: {
      retryCount: number;
      retryLimit: number;
    }) => void;
    const observed = new Promise<{ retryCount: number; retryLimit: number }>(
      (resolve) => {
        resolveObserved = resolve;
      },
    );

    await service.workWithMetadata<{ msg: string }>(queue, (job) => {
      resolveObserved({
        retryCount: job.retryCount,
        retryLimit: job.retryLimit,
      });
      return Promise.resolve();
    });

    await service.send(queue, { msg: 'with metadata' }, { retryLimit: 3 });

    const result = await observed;

    expect(result.retryCount).toBe(0);
    expect(result.retryLimit).toBe(3);
  }, 20000);

  it('workWithMetadata() lets the handler see the final attempt via retryCount === retryLimit', async () => {
    const queue = `test-metadata-final-${randomUUID()}`;
    let attempts = 0;
    let resolveFinal: () => void;
    const final = new Promise<void>((resolve) => {
      resolveFinal = resolve;
    });

    await service.workWithMetadata<{ msg: string }>(queue, (job) => {
      attempts += 1;
      if (job.retryCount >= job.retryLimit) {
        resolveFinal();
      }
      return Promise.reject(new Error('always fails'));
    });

    await service.send(
      queue,
      { msg: 'exhaust retries' },
      { retryLimit: 1, retryDelay: 1, retryBackoff: false },
    );

    await final;

    expect(attempts).toBeGreaterThanOrEqual(2);
  }, 20000);
});
