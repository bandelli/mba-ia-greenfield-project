import { Controller, Get, Query } from '@nestjs/common';
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
import { ApiErrorEnvelope } from '../common/openapi/api-error-envelope.dto';
import {
  FindMySubscriptionsResult,
  SubscriptionService,
} from '../channels/subscription.service';
import { FindMySubscriptionsQueryDto } from './dto/find-my-subscriptions-query.dto';

const FIND_MY_SUBSCRIPTIONS_RESPONSE_SCHEMA = {
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          nickname: { type: 'string' },
          name: { type: 'string' },
          avatarUrl: { type: 'string', nullable: true },
        },
      },
    },
    total: { type: 'number' },
  },
};

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('me/subscriptions')
  @ApiBearerAuth('access-token')
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max channels to return (default 20, max 50)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Pagination offset (default 0)',
  })
  @ApiOperation({
    summary: 'List channels the caller follows',
    description:
      "Paginated listing of the caller's followed channels (per social-interactions/TD-05).",
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated followed channels',
    schema: FIND_MY_SUBSCRIPTIONS_RESPONSE_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async getMySubscriptions(
    @Query() query: FindMySubscriptionsQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<FindMySubscriptionsResult> {
    return this.subscriptionService.findMySubscriptions(user.sub, query);
  }
}
