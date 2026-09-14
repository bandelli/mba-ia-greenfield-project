import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  HttpCode,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ThumbnailInvalidFileException } from '../common/exceptions/domain.exception';
import { ApiErrorEnvelope } from '../common/openapi/api-error-envelope.dto';
import { StorageService } from '../storage/storage.service';
import { FindSuggestedVideosQueryDto } from './dto/find-suggested-videos-query.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { Video } from './entities/video.entity';
import { VideoPublicationService } from './video-publication.service';
import {
  PublicVideoDetail,
  SuggestedVideoItem,
  VideosService,
} from './videos.service';

const THUMBNAIL_MAX_BYTES = 5 * 1024 * 1024;
const THUMBNAIL_ACCEPTED_TYPES = /^image\/(jpeg|png|webp)$/;

// Mirrors PATCH /videos/:id and POST /videos/:id/publish's documented
// Response 200 field list (per phase-04-video-channel-management Tech
// Specs). Inline, not a DTO class — matches the getStreamUrl/getDownloadUrl
// convention already in this controller, since the openapi:export script
// runs under plain ts-node (the @nestjs/swagger CLI plugin's DTO/entity
// schema inference does not apply there).
const VIDEO_RESPONSE_SCHEMA = {
  properties: {
    id: { type: 'string', format: 'uuid' },
    public_id: { type: 'string' },
    title: { type: 'string', nullable: true },
    description: { type: 'string', nullable: true },
    category: { type: 'string' },
    visibility: { type: 'string' },
    thumbnail_key: { type: 'string', nullable: true },
    status: { type: 'string' },
    published_at: { type: 'string', format: 'date-time', nullable: true },
    updated_at: { type: 'string', format: 'date-time' },
  },
};

const THUMBNAIL_RESPONSE_SCHEMA = {
  properties: {
    id: { type: 'string', format: 'uuid' },
    thumbnail_key: { type: 'string', nullable: true },
  },
};

// Mirrors GET /videos/public/:publicId's documented Response 200 field list
// (per phase-05-video-watch-page Tech Specs § API Contracts). Inline, not a
// DTO class — matches the convention above.
const PUBLIC_VIDEO_RESPONSE_SCHEMA = {
  properties: {
    id: { type: 'string', format: 'uuid' },
    public_id: { type: 'string' },
    title: { type: 'string', nullable: true },
    description: { type: 'string', nullable: true },
    category: { type: 'string' },
    visibility: { type: 'string' },
    duration_seconds: { type: 'number', nullable: true },
    thumbnail_key: { type: 'string', nullable: true },
    views: { type: 'number' },
    published_at: { type: 'string', format: 'date-time', nullable: true },
    channel: {
      type: 'object',
      properties: {
        nickname: { type: 'string' },
        name: { type: 'string' },
      },
    },
  },
};

// Mirrors GET /videos/public/:publicId/suggested's documented Response 200
// field list (per phase-05-video-watch-page Tech Specs § API Contracts).
const SUGGESTED_VIDEOS_RESPONSE_SCHEMA = {
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          public_id: { type: 'string' },
          title: { type: 'string', nullable: true },
          thumbnail_key: { type: 'string', nullable: true },
          duration_seconds: { type: 'number', nullable: true },
          views: { type: 'number' },
          published_at: { type: 'string', format: 'date-time', nullable: true },
          channel: {
            type: 'object',
            properties: {
              nickname: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
      },
    },
  },
};

interface VideoResponse {
  id: string;
  public_id: string;
  title: string | null;
  description: string | null;
  category: string;
  visibility: string;
  thumbnail_key: string | null;
  status: string;
  published_at: Date | null;
  updated_at: Date;
}

// Projects the ORM entity onto the documented response shape (VIDEO_RESPONSE_SCHEMA
// above) — the entity also carries internal-only columns (storage_key, user_id,
// channel_id, metadata, processing_error) that must never leave the API.
function toVideoResponse(video: Video): VideoResponse {
  return {
    id: video.id,
    public_id: video.public_id,
    title: video.title,
    description: video.description,
    category: video.category,
    visibility: video.visibility,
    thumbnail_key: video.thumbnail_key,
    status: video.status,
    published_at: video.published_at,
    updated_at: video.updated_at,
  };
}

function toThumbnailResponse(
  video: Video,
): Pick<VideoResponse, 'id' | 'thumbnail_key'> {
  return { id: video.id, thumbnail_key: video.thumbnail_key };
}

@ApiTags('videos')
@Controller('videos')
export class VideosController {
  constructor(
    private readonly videosService: VideosService,
    private readonly storageService: StorageService,
    private readonly videoPublicationService: VideoPublicationService,
  ) {}

  @Get('public/:publicId')
  @Public()
  @ApiOperation({
    summary: 'Get public video metadata',
    description:
      'Returns metadata for a published (public or unlisted) video, accessible anonymously, and increments its view count (per phase-05-video-watch-page/TD-01, TD-02).',
  })
  @ApiResponse({
    status: 200,
    description: 'Public video metadata',
    schema: PUBLIC_VIDEO_RESPONSE_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found, not ready, or not public/unlisted',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async getPublicVideo(
    @Param('publicId') publicId: string,
  ): Promise<PublicVideoDetail> {
    return this.videosService.findPublicVideo(publicId);
  }

  @Get('public/:publicId/stream-url')
  @Public()
  @ApiOperation({
    summary: 'Get a public streaming URL',
    description:
      'Returns a short-lived presigned object-storage URL to stream a published (public or unlisted) video, accessible anonymously (per phase-05-video-watch-page/TD-01, phase-03-videos/TD-07).',
  })
  @ApiResponse({
    status: 200,
    description: 'Presigned streaming URL',
    schema: { properties: { url: { type: 'string' } } },
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found, not ready, or not public/unlisted',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async getPublicStreamUrl(
    @Param('publicId') publicId: string,
  ): Promise<{ url: string }> {
    const video = await this.videosService.findPublicReadyVideo(publicId);
    const url = await this.storageService.getPresignedUrl(video.storage_key);
    return { url };
  }

  @Get('public/:publicId/download-url')
  @Public()
  @ApiOperation({
    summary: 'Get a public download URL',
    description:
      'Returns a short-lived presigned object-storage URL to download a published (public or unlisted) video, accessible anonymously (per phase-05-video-watch-page/TD-01, phase-03-videos/TD-07).',
  })
  @ApiResponse({
    status: 200,
    description: 'Presigned download URL',
    schema: { properties: { url: { type: 'string' } } },
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found, not ready, or not public/unlisted',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async getPublicDownloadUrl(
    @Param('publicId') publicId: string,
  ): Promise<{ url: string }> {
    const video = await this.videosService.findPublicReadyVideo(publicId);
    const url = await this.storageService.getPresignedUrl(video.storage_key);
    return { url };
  }

  @Get('public/:publicId/suggested')
  @Public()
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max items to return (default 12, max 12)',
  })
  @ApiOperation({
    summary: 'Get suggested videos',
    description:
      "Returns up to `limit` ready+public videos from the anchor video's category, most recent first, excluding the anchor itself (per phase-05-video-watch-page/TD-03).",
  })
  @ApiResponse({
    status: 200,
    description: 'Suggested videos',
    schema: SUGGESTED_VIDEOS_RESPONSE_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Anchor video not found, not ready, or not public/unlisted',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async getSuggestedVideos(
    @Param('publicId') publicId: string,
    @Query() query: FindSuggestedVideosQueryDto,
  ): Promise<{ items: SuggestedVideoItem[] }> {
    const items = await this.videosService.findSuggestedVideos(
      publicId,
      query.limit,
    );
    return { items };
  }

  @Get(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get a video for editing',
    description:
      "Returns the caller's own video with every owner-editable field, for the edit screen's initial load (per phase-04-video-channel-management SI-04.8b).",
  })
  @ApiResponse({
    status: 200,
    description: 'Video',
    schema: VIDEO_RESPONSE_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found or not owned by the caller',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async getVideo(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<VideoResponse> {
    const video = await this.videoPublicationService.getOwnedVideo(
      id,
      user.sub,
    );
    return toVideoResponse(video);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Edit video information',
    description:
      "Updates title, description, category, and/or visibility of the caller's own video (per phase-04-video-channel-management/TD-01, TD-02).",
  })
  @ApiResponse({
    status: 200,
    description: 'Updated video',
    schema: VIDEO_RESPONSE_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found or not owned by the caller',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async updateVideo(
    @Param('id') id: string,
    @Body() dto: UpdateVideoDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<VideoResponse> {
    const video = await this.videoPublicationService.updateFields(
      id,
      user.sub,
      dto,
    );
    return toVideoResponse(video);
  }

  @Post(':id/publish')
  @HttpCode(200)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Publish a video',
    description:
      'Applies the given fields and marks the video as published, requiring status "ready" (per phase-04-video-channel-management/TD-02).',
  })
  @ApiResponse({
    status: 200,
    description: 'Published video',
    schema: VIDEO_RESPONSE_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found or not owned by the caller',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error, video not ready, or video has no title',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async publishVideo(
    @Param('id') id: string,
    @Body() dto: UpdateVideoDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<VideoResponse> {
    const video = await this.videoPublicationService.publish(id, user.sub, dto);
    return toVideoResponse(video);
  }

  @Patch(':id/thumbnail')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('thumbnail'))
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { thumbnail: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary: 'Replace a video thumbnail',
    description:
      'Overwrites the auto-generated thumbnail with a custom upload (per phase-04-video-channel-management/TD-03).',
  })
  @ApiResponse({
    status: 200,
    description: 'Updated video',
    schema: THUMBNAIL_RESPONSE_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found or not owned by the caller',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 400,
    description:
      'Thumbnail file missing, not an accepted image type, or too large',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async replaceThumbnail(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({
            fileType: THUMBNAIL_ACCEPTED_TYPES,
            // `file-type` is an ESM-only dependency loaded dynamically by
            // Nest's magic-number sniffing; under Jest it can fail to load
            // (see nestjs-project/CLAUDE.md § "ESM-only npm packages under
            // Jest"). Falling back to the declared mimetype keeps validation
            // working in that case instead of always rejecting.
            fallbackToMimetype: true,
          }),
          new MaxFileSizeValidator({ maxSize: THUMBNAIL_MAX_BYTES }),
        ],
        exceptionFactory: () => new ThumbnailInvalidFileException(),
      }),
    )
    thumbnail: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ): Promise<Pick<VideoResponse, 'id' | 'thumbnail_key'>> {
    const video = await this.videoPublicationService.replaceThumbnail(
      id,
      user.sub,
      thumbnail.buffer,
      thumbnail.mimetype,
    );
    return toThumbnailResponse(video);
  }

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
