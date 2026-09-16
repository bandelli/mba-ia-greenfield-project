import { Body, Controller, Param, Put } from '@nestjs/common';
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
import {
  CommentReactionService,
  ReactionResult,
} from './comment-reaction.service';
import { SetReactionDto } from './dto/set-reaction.dto';

const REACTION_RESPONSE_SCHEMA = {
  properties: {
    type: { type: 'string', enum: ['like', 'dislike'], nullable: true },
    likesCount: { type: 'number' },
    dislikesCount: { type: 'number' },
  },
};

// Top-level `/comments` resource — distinct from `VideosController`'s
// `/videos/:publicId/comments` sub-resource routes, per this phase's
// literal Route contracts (`PUT /comments/:commentId/reaction` targets a
// comment directly, not scoped through its parent video).
@ApiTags('comments')
@Controller('comments')
export class CommentsController {
  constructor(
    private readonly commentReactionService: CommentReactionService,
  ) {}

  @Put(':commentId/reaction')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Set the caller reaction to a comment',
    description:
      "Sets the caller's like/dislike state on a comment to the given value, or clears it when `type` is `null` — same idempotent contract as the video reaction endpoint (per social-interactions/TD-01, TD-02, TD-03).",
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
    description: 'Comment not found',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async setCommentReaction(
    @Param('commentId') commentId: string,
    @Body() dto: SetReactionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ReactionResult> {
    return this.commentReactionService.setReaction(
      user.sub,
      commentId,
      dto.type,
    );
  }
}
