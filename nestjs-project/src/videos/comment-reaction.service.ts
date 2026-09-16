import { Injectable } from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { CommentNotFoundException } from '../common/exceptions/domain.exception';
import { Comment } from './entities/comment.entity';
import { CommentReaction } from './entities/comment-reaction.entity';
import { ReactionType } from './entities/video-reaction.entity';
import { VideoStatus, VideoVisibility } from './entities/video.entity';
import {
  applyReactionCounterDelta,
  persistReactionToggle,
} from './reaction-toggle.util';

export interface ReactionResult {
  type: ReactionType | null;
  likesCount: number;
  dislikesCount: number;
}

const PG_INVALID_TEXT_REPRESENTATION = '22P02';

// A `commentId` that isn't even shaped like a UUID (e.g. a client-supplied
// literal, or a stale/malformed link) can never resolve to a real comment —
// Postgres rejects it as a raw type-cast error against the uuid column
// before any row lookup happens. Treated the same as "no such row" so the
// caller gets a clean 404 COMMENT_NOT_FOUND instead of a 500.
function isPgInvalidUuidInput(err: unknown): boolean {
  return (
    err instanceof QueryFailedError &&
    (err as { code?: string }).code === PG_INVALID_TEXT_REPRESENTATION
  );
}

// Owns the like/dislike toggle for comments — same idempotent "set state"
// contract as VideoReactionService (per social-interactions/TD-01, TD-02,
// TD-03), scoped to a different entity/write path (per Single
// Responsibility), so it is not folded into VideoReactionService.
@Injectable()
export class CommentReactionService {
  constructor(private readonly dataSource: DataSource) {}

  async setReaction(
    userId: string,
    commentId: string,
    type: ReactionType | null,
  ): Promise<ReactionResult> {
    return this.dataSource.transaction(async (manager) => {
      let comment: Comment | null;
      try {
        comment = await manager.findOne(Comment, {
          where: { id: commentId },
          relations: ['video'],
        });
      } catch (err) {
        if (isPgInvalidUuidInput(err)) {
          throw new CommentNotFoundException();
        }
        throw err;
      }
      if (!comment || !this.isOnPublicReadyVideo(comment)) {
        // Same non-disclosure principle used elsewhere in this codebase: a
        // comment whose video is no longer public/ready (e.g. the owner
        // switched it to private after the comment was posted) is treated
        // identically to a comment that never existed, rather than a
        // distinct "forbidden" response that would confirm its existence.
        throw new CommentNotFoundException();
      }

      const reactionRepository = manager.getRepository(CommentReaction);
      const existing = await reactionRepository.findOne({
        where: { user_id: userId, comment_id: commentId },
      });

      const previousType = await persistReactionToggle(
        manager,
        reactionRepository,
        existing,
        'insert_comment_reaction',
        () =>
          reactionRepository.create({
            user_id: userId,
            comment_id: commentId,
            type: type as ReactionType,
          }),
        () =>
          reactionRepository.findOneByOrFail({
            user_id: userId,
            comment_id: commentId,
          }),
        type,
      );

      const counters = await applyReactionCounterDelta(
        manager,
        Comment,
        commentId,
        previousType,
        type,
      );

      return { type, ...counters };
    });
  }

  // Same predicate as VideosService.findPublicReadyVideo, applied to a
  // comment's already-loaded parent video instead of a fresh lookup by
  // public_id — this service only ever has the video's internal id (via
  // `comment.video_id`), not its public_id.
  private isOnPublicReadyVideo(comment: Comment): boolean {
    const video = comment.video;
    return (
      video.status === VideoStatus.READY &&
      (video.visibility === VideoVisibility.PUBLIC ||
        video.visibility === VideoVisibility.UNLISTED) &&
      video.published_at !== null
    );
  }
}
