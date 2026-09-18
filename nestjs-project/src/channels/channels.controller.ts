import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { ApiErrorEnvelope } from '../common/openapi/api-error-envelope.dto';
import { VideoVisibility } from '../videos/entities/video.entity';
import {
  ChannelsService,
  OwnerVideoListItem,
  PaginatedResult,
  PublicChannelInfo,
  PublicVideoListItem,
} from './channels.service';
import { FindOwnerVideosQueryDto } from './dto/find-owner-videos-query.dto';
import { FindPublicVideosQueryDto } from './dto/find-public-videos-query.dto';
import { SetSubscriptionDto } from './dto/set-subscription.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { Channel } from './entities/channel.entity';
import {
  SubscriptionResult,
  SubscriptionService,
} from './subscription.service';

// Inline schemas, not DTO classes — the openapi:export script runs under
// plain ts-node, so the @nestjs/swagger CLI plugin's entity/DTO schema
// inference (nest-cli.json's classValidatorShim/introspectComments) does
// not apply there; inline schema objects are evaluated at runtime instead.
const CHANNEL_RESPONSE_SCHEMA = {
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    nickname: { type: 'string' },
    description: { type: 'string', nullable: true },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
};

const PUBLIC_CHANNEL_RESPONSE_SCHEMA = {
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    nickname: { type: 'string' },
    description: { type: 'string', nullable: true },
    created_at: { type: 'string', format: 'date-time' },
    subscribersCount: { type: 'number' },
    isSubscribed: { type: 'boolean' },
  },
};

const OWNER_VIDEO_LIST_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    public_id: { type: 'string' },
    title: { type: 'string', nullable: true },
    thumbnail_key: { type: 'string', nullable: true },
    category: { type: 'string' },
    visibility: { type: 'string' },
    status: { type: 'string' },
    published_at: { type: 'string', format: 'date-time', nullable: true },
    views: { type: 'number' },
    likes: { type: 'number' },
    comments: { type: 'number' },
  },
};

const PUBLIC_VIDEO_LIST_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    public_id: { type: 'string' },
    title: { type: 'string', nullable: true },
    thumbnail_key: { type: 'string', nullable: true },
    duration_seconds: { type: 'number', nullable: true },
    published_at: { type: 'string', format: 'date-time', nullable: true },
    views: { type: 'number' },
  },
};

function paginatedResponseSchema(itemSchema: Record<string, unknown>) {
  return {
    properties: {
      items: { type: 'array', items: itemSchema },
      page: { type: 'number' },
      limit: { type: 'number' },
      total: { type: 'number' },
    },
  };
}

interface ChannelResponse {
  id: string;
  name: string;
  nickname: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

// Projects the ORM entity onto the documented response shape
// (CHANNEL_RESPONSE_SCHEMA above) — the entity also carries user_id, which
// must never leave the API even for the owner's own-channel endpoints.
function toChannelResponse(channel: Channel): ChannelResponse {
  return {
    id: channel.id,
    name: channel.name,
    nickname: channel.nickname,
    description: channel.description,
    created_at: channel.created_at,
    updated_at: channel.updated_at,
  };
}

const SUBSCRIPTION_RESPONSE_SCHEMA = {
  properties: {
    subscribed: { type: 'boolean' },
    subscribersCount: { type: 'number' },
  },
};

@ApiTags('channels')
@Controller('channels')
export class ChannelsController {
  constructor(
    private readonly channelsService: ChannelsService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get own channel',
    description: "Returns the caller's own channel.",
  })
  @ApiResponse({
    status: 200,
    description: 'Own channel',
    schema: CHANNEL_RESPONSE_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async getMe(@CurrentUser() user: JwtPayload): Promise<ChannelResponse> {
    const channel = await this.channelsService.findByUserId(user.sub);
    return toChannelResponse(channel);
  }

  @Patch('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update own channel',
    description:
      "Updates nickname, name, and/or description of the caller's own channel, rejecting with 409 when the requested nickname is already in use (per phase-04-video-channel-management/TD-04).",
  })
  @ApiResponse({
    status: 200,
    description: 'Updated channel',
    schema: CHANNEL_RESPONSE_SCHEMA,
  })
  @ApiResponse({
    status: 409,
    description: 'Requested nickname is already in use',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async updateMe(
    @Body() dto: UpdateChannelDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ChannelResponse> {
    const channel = await this.channelsService.updateOwnChannel(user.sub, dto);
    return toChannelResponse(channel);
  }

  @Get('me/videos')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: "List own channel's videos",
    description:
      "Paginated listing of the caller's own channel videos across every status and visibility (per phase-04-video-channel-management/TD-05).",
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'visibility',
    required: false,
    enum: VideoVisibility,
  })
  @ApiQuery({ name: 'sort', required: false, enum: ['latest', 'oldest'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Paginated video list',
    schema: paginatedResponseSchema(OWNER_VIDEO_LIST_ITEM_SCHEMA),
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async getMyVideos(
    @Query() query: FindOwnerVideosQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PaginatedResult<OwnerVideoListItem>> {
    return this.channelsService.findVideosForOwner(user.sub, query);
  }

  @Get(':nickname')
  @OptionalAuth()
  @ApiOperation({
    summary: 'Get public channel info',
    description:
      "Returns a channel's public-facing fields (no user_id/email). `isSubscribed` is `false` unless the caller is authenticated (per social-interactions/TD-01).",
  })
  @ApiResponse({
    status: 200,
    description: 'Public channel info',
    schema: PUBLIC_CHANNEL_RESPONSE_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'No channel with this nickname',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async getByNickname(
    @Param('nickname') nickname: string,
    @CurrentUserOptional() user: JwtPayload | undefined,
  ): Promise<PublicChannelInfo> {
    return this.channelsService.findPublicChannelInfo(nickname, user?.sub);
  }

  @Get(':nickname/videos')
  @Public()
  @ApiOperation({
    summary: "List a channel's public videos",
    description:
      "Paginated listing of a channel's published, public videos (per phase-04-video-channel-management/TD-02, TD-05).",
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['latest', 'popular', 'oldest'],
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated video list',
    schema: paginatedResponseSchema(PUBLIC_VIDEO_LIST_ITEM_SCHEMA),
  })
  @ApiResponse({
    status: 404,
    description: 'No channel with this nickname',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async getChannelVideos(
    @Param('nickname') nickname: string,
    @Query() query: FindPublicVideosQueryDto,
  ): Promise<PaginatedResult<PublicVideoListItem>> {
    return this.channelsService.findPublicVideos(nickname, query);
  }

  @Put(':nickname/subscription')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Set the caller subscription to a channel',
    description:
      "Sets the caller's follow state on a channel to the given value — idempotent, repeating the same request has no further effect (per social-interactions/TD-02, TD-03).",
  })
  @ApiResponse({
    status: 200,
    description: 'Current subscription state and updated subscriber count',
    schema: SUBSCRIPTION_RESPONSE_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 404,
    description: 'No channel with this nickname',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 409,
    description: 'Caller is the owner of this channel',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async setSubscription(
    @Param('nickname') nickname: string,
    @Body() dto: SetSubscriptionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SubscriptionResult> {
    return this.subscriptionService.setSubscription(
      user.sub,
      nickname,
      dto.subscribed,
    );
  }
}
