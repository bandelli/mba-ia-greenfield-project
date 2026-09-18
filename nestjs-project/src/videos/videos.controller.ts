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
  Put,
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
import { CurrentUserOptional } from '../auth/decorators/current-user-optional.decorator';
import { OptionalAuth } from '../auth/decorators/optional-auth.decorator';
import { Public } from '../auth/decorators/public.decorator';
import {
  ThumbnailInvalidFileException,
  VideoThumbnailNotFoundException,
} from '../common/exceptions/domain.exception';
import { ApiErrorEnvelope } from '../common/openapi/api-error-envelope.dto';
import { StorageService } from '../storage/storage.service';
import {
  CommentItem,
  CommentReplyItem,
  CommentsService,
} from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { FindCommentsQueryDto } from './dto/find-comments-query.dto';
import { FindHomeFeedQueryDto } from './dto/find-home-feed-query.dto';
import { FindSuggestedVideosQueryDto } from './dto/find-suggested-videos-query.dto';
import { SetReactionDto } from './dto/set-reaction.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { Video } from './entities/video.entity';
import { VideoPublicationService } from './video-publication.service';
import { ReactionResult, VideoReactionService } from './video-reaction.service';
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
    likesCount: { type: 'number' },
    dislikesCount: { type: 'number' },
    currentUserReaction: {
      type: 'string',
      enum: ['like', 'dislike'],
      nullable: true,
    },
    published_at: { type: 'string', format: 'date-time', nullable: true },
    channel: {
      type: 'object',
      properties: {
        nickname: { type: 'string' },
        name: { type: 'string' },
        subscribersCount: { type: 'number' },
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

// Mirrors GET /videos/public's documented Response 200 field list
// (per home-search-launch Tech Specs § API Contracts).
const HOME_FEED_RESPONSE_SCHEMA = {
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          public_id: { type: 'string' },
          title: { type: 'string', nullable: true },
          thumbnail_key: { type: 'string', nullable: true },
          duration_seconds: { type: 'number', nullable: true },
          views: { type: 'number' },
          published_at: { type: 'string', format: 'date-time', nullable: true },
          category: { type: 'string' },
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
    total: { type: 'number' },
    page: { type: 'number' },
    limit: { type: 'number' },
  },
};

const REACTION_RESPONSE_SCHEMA = {
  properties: {
    type: { type: 'string', enum: ['like', 'dislike'], nullable: true },
    likesCount: { type: 'number' },
    dislikesCount: { type: 'number' },
  },
};

const COMMENT_AUTHOR_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    nickname: { type: 'string' },
  },
};

const COMMENT_REPLY_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    body: { type: 'string' },
    author: COMMENT_AUTHOR_SCHEMA,
    createdAt: { type: 'string', format: 'date-time' },
    likesCount: { type: 'number' },
    dislikesCount: { type: 'number' },
    currentUserReaction: {
      type: 'string',
      enum: ['like', 'dislike'],
      nullable: true,
    },
  },
};

const COMMENT_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    ...COMMENT_REPLY_SCHEMA.properties,
    replies: { type: 'array', items: COMMENT_REPLY_SCHEMA },
  },
};

const FIND_COMMENTS_RESPONSE_SCHEMA = {
  properties: {
    items: { type: 'array', items: COMMENT_ITEM_SCHEMA },
    total: { type: 'number' },
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
    private readonly videoReactionService: VideoReactionService,
    private readonly commentsService: CommentsService,
  ) {}

  @Get('public')
  @Public()
  @ApiOperation({
    summary: 'List public videos (home feed)',
    description:
      'Returns a paginated, searchable, category-filterable list of ready+public videos across every channel, most recent first — the global home feed (per home-search-launch/TD-01, TD-02). Accessible anonymously.',
  })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Paginated home feed',
    schema: HOME_FEED_RESPONSE_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid category, q, page, or limit',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async findHomeFeed(@Query() query: FindHomeFeedQueryDto) {
    return this.videosService.findHomeFeed(query);
  }

  @Get('public/:publicId')
  @OptionalAuth()
  @ApiOperation({
    summary: 'Get public video metadata',
    description:
      'Returns metadata for a published (public or unlisted) video, accessible anonymously, and increments its view count (per phase-05-video-watch-page/TD-01, TD-02). `currentUserReaction` is `null` unless the caller is authenticated (per social-interactions/TD-01).',
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
    @CurrentUserOptional() user: JwtPayload | undefined,
  ): Promise<PublicVideoDetail> {
    return this.videosService.findPublicVideo(publicId, user?.sub);
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

  @Get('public/:publicId/thumbnail-url')
  @Public()
  @ApiOperation({
    summary: 'Get a public thumbnail URL',
    description:
      'Returns a short-lived presigned object-storage URL for the thumbnail of a published (public or unlisted) video, accessible anonymously (per phase-05-video-watch-page/TD-01, phase-03-videos/TD-07).',
  })
  @ApiResponse({
    status: 200,
    description: 'Presigned thumbnail URL',
    schema: { properties: { url: { type: 'string' } } },
  })
  @ApiResponse({
    status: 404,
    description:
      'Video not found, not ready, not public/unlisted, or has no thumbnail yet',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async getPublicThumbnailUrl(
    @Param('publicId') publicId: string,
  ): Promise<{ url: string }> {
    const video = await this.videosService.findPublicReadyVideo(publicId);
    if (!video.thumbnail_key) {
      throw new VideoThumbnailNotFoundException();
    }
    const url = await this.storageService.getPresignedUrl(video.thumbnail_key);
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

  @Put(':publicId/reaction')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Set the caller reaction to a video',
    description:
      "Sets the caller's like/dislike state on a published video to the given value, or clears it when `type` is `null` — idempotent, repeating the same request has no further effect (per social-interactions/TD-01, TD-02, TD-03).",
  })
  @ApiResponse({
    status: 200,
    description: 'Current reaction and updated counts',
    schema: REACTION_RESPONSE_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'No valid access token presented',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found, not ready, or not public/unlisted',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async setVideoReaction(
    @Param('publicId') publicId: string,
    @Body() dto: SetReactionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ReactionResult> {
    return this.videoReactionService.setReaction(user.sub, publicId, dto.type);
  }

  @Get(':publicId/comments')
  @OptionalAuth()
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max top-level comments to return (default 20, max 50)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Pagination offset over top-level comments (default 0)',
  })
  @ApiOperation({
    summary: 'List comments for a video',
    description:
      'Returns paginated top-level comments with embedded replies (depth 1) for a published video, readable anonymously; `currentUserReaction` is `null` unless the caller is authenticated (per social-interactions/TD-04).',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated comments',
    schema: FIND_COMMENTS_RESPONSE_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found, not ready, or not public/unlisted',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async getComments(
    @Param('publicId') publicId: string,
    @Query() query: FindCommentsQueryDto,
    @CurrentUserOptional() user: JwtPayload | undefined,
  ): Promise<{ items: CommentItem[]; total: number }> {
    return this.commentsService.findComments(publicId, query, user?.sub);
  }

  @Post(':publicId/comments')
  @HttpCode(201)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Post a top-level comment on a video',
    description:
      'Creates a top-level comment on a published video and increments its comment count (per social-interactions/TD-04).',
  })
  @ApiResponse({
    status: 201,
    description: 'Created comment',
    schema: COMMENT_ITEM_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'No valid access token presented',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found, not ready, or not public/unlisted',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async createComment(
    @Param('publicId') publicId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<CommentItem> {
    return this.commentsService.createComment(user.sub, publicId, dto.body);
  }

  @Post(':publicId/comments/:commentId/replies')
  @HttpCode(201)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Reply to a top-level comment on a video',
    description:
      'Creates a reply to a top-level comment, capped at a single level of depth — replying to a reply is rejected (per social-interactions/TD-04).',
  })
  @ApiResponse({
    status: 201,
    description: 'Created reply',
    schema: COMMENT_REPLY_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'No valid access token presented',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 404,
    description: 'Video or target comment not found',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error, or target comment is itself a reply',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async createReply(
    @Param('publicId') publicId: string,
    @Param('commentId') commentId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<CommentReplyItem> {
    return this.commentsService.createReply(
      user.sub,
      publicId,
      commentId,
      dto.body,
    );
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

  @Get(':id/thumbnail-url')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get a thumbnail URL',
    description:
      "Returns a short-lived presigned object-storage URL for the thumbnail of the caller's own ready video (per phase-03-videos/TD-07).",
  })
  @ApiResponse({
    status: 200,
    description: 'Presigned thumbnail URL',
    schema: { properties: { url: { type: 'string' } } },
  })
  @ApiResponse({
    status: 404,
    description:
      'Video not found, not owned by the caller, not ready, or has no thumbnail yet',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async getThumbnailUrl(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ url: string }> {
    const video = await this.videosService.findOwnedReadyVideo(id, user.sub);
    if (!video.thumbnail_key) {
      throw new VideoThumbnailNotFoundException();
    }
    const url = await this.storageService.getPresignedUrl(video.thumbnail_key);
    return { url };
  }
}
