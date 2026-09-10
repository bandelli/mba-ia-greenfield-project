import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import PgBoss from 'pg-boss';
import queueConfig from '../config/queue.config';

const DEFAULT_QUEUE_OPTIONS = {
  retryLimit: 3,
  retryDelay: 30,
  retryBackoff: true,
};

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly boss: PgBoss;
  private readonly ensuredQueues = new Set<string>();

  constructor(
    @Inject(queueConfig.KEY)
    private readonly config: ConfigType<typeof queueConfig>,
  ) {
    this.boss = new PgBoss(this.config.connectionString);
    this.boss.on('error', (error: Error) => this.logger.error(error));
  }

  async onModuleInit(): Promise<void> {
    await this.boss.start();
  }

  async onModuleDestroy(): Promise<void> {
    await this.boss.stop();
  }

  private async ensureQueue(name: string): Promise<void> {
    if (this.ensuredQueues.has(name)) {
      return;
    }
    await this.boss.createQueue(name, DEFAULT_QUEUE_OPTIONS);
    this.ensuredQueues.add(name);
  }

  async send<T extends object>(
    queue: string,
    data: T,
    options?: PgBoss.SendOptions,
  ): Promise<string | null> {
    await this.ensureQueue(queue);
    return this.boss.send(queue, data, options ?? {});
  }

  async work<T extends object>(
    queue: string,
    handler: (data: T) => Promise<void>,
  ): Promise<void> {
    await this.ensureQueue(queue);
    await this.boss.work<T>(queue, async ([job]) => handler(job.data));
  }

  // includeMetadata surfaces retryCount/retryLimit on the job passed to the
  // handler, so callers can detect the last allowed attempt before pg-boss
  // moves the job to its terminal 'failed' state (per phase-03-videos/TD-10).
  async workWithMetadata<T extends object>(
    queue: string,
    handler: (job: PgBoss.JobWithMetadata<T>) => Promise<void>,
  ): Promise<void> {
    await this.ensureQueue(queue);
    await this.boss.work<T>(queue, { includeMetadata: true }, async ([job]) =>
      handler(job),
    );
  }
}
