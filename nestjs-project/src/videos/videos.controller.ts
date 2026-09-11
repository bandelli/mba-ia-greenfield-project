import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiErrorEnvelope } from '../common/openapi/api-error-envelope.dto';
import { StorageService } from '../storage/storage.service';
import { VideosService } from './videos.service';

@ApiTags('videos')
@Controller('videos')
export class VideosController {
  constructor(
    private readonly videosService: VideosService,
    private readonly storageService: StorageService,
  ) {}

  @Get(':id/stream-url')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get a streaming URL',
    description:
      "Returns a short-lived presigned object-storage URL to stream the caller's own ready video (per phase-03-videos/TD-07).",
  })
  @ApiResponse({
    status: 200,
    description: 'Presigned streaming URL',
    schema: { properties: { url: { type: 'string' } } },
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found, not owned by the caller, or not ready',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async getStreamUrl(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ url: string }> {
    const video = await this.videosService.findOwnedReadyVideo(id, user.sub);
    const url = await this.storageService.getPresignedUrl(video.storage_key);
    return { url };
  }

  @Get(':id/download-url')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get a download URL',
    description:
      "Returns a short-lived presigned object-storage URL to download the caller's own ready video (per phase-03-videos/TD-07).",
  })
  @ApiResponse({
    status: 200,
    description: 'Presigned download URL',
    schema: { properties: { url: { type: 'string' } } },
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found, not owned by the caller, or not ready',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async getDownloadUrl(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ url: string }> {
    const video = await this.videosService.findOwnedReadyVideo(id, user.sub);
    const url = await this.storageService.getPresignedUrl(video.storage_key);
    return { url };
  }
}
