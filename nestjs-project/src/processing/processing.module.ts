import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { VideoProcessingService } from './video-processing.service';

@Module({
  imports: [StorageModule],
  providers: [VideoProcessingService],
  exports: [VideoProcessingService],
})
export class ProcessingModule {}
