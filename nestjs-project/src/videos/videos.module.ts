import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ChannelsModule } from '../channels/channels.module';
import { ProcessingModule } from '../processing/processing.module';
import { QueueModule } from '../queue/queue.module';
import { StorageModule } from '../storage/storage.module';
import { Video } from './entities/video.entity';
import {
  TusAuthMiddleware,
  TusServerMiddleware,
} from './tus-upload.middleware';
import { VideoStatusService } from './video-status.service';
import { VideoUploadService } from './video-upload.service';
import { TUS_UPLOAD_PATH } from './videos.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([Video]),
    AuthModule,
    ChannelsModule,
    StorageModule,
    ProcessingModule,
    QueueModule,
  ],
  providers: [
    VideoStatusService,
    VideoUploadService,
    TusAuthMiddleware,
    TusServerMiddleware,
  ],
  exports: [TypeOrmModule, VideoStatusService],
})
export class VideosModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // TusAuthMiddleware must run before TusServerMiddleware on the same
    // route so req.user is populated when the tus hooks fire (per
    // phase-03-videos/TD-06 Revision, 2026-09-08).
    consumer
      .apply(TusAuthMiddleware, TusServerMiddleware)
      .forRoutes(
        { path: TUS_UPLOAD_PATH, method: RequestMethod.ALL },
        { path: `${TUS_UPLOAD_PATH}/:id`, method: RequestMethod.ALL },
      );
  }
}
