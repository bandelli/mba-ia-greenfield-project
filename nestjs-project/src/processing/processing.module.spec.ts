import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import storageConfig from '../config/storage.config';
import { ProcessingModule } from './processing.module';

describe('ProcessingModule', () => {
  it('should compile successfully', async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [storageConfig] }),
        ProcessingModule,
      ],
    }).compile();

    expect(module).toBeDefined();
    await module.close();
  }, 15000);
});
