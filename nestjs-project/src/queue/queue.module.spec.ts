import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import queueConfig from '../config/queue.config';
import { QueueModule } from './queue.module';

describe('QueueModule', () => {
  it('should compile successfully', async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [queueConfig] }),
        QueueModule,
      ],
    }).compile();
    await module.init();

    expect(module).toBeDefined();
    await module.close();
  }, 15000);
});
