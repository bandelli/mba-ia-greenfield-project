import { Injectable } from '@nestjs/common';
import { DataSource, In, IsNull, QueryFailedError } from 'typeorm';
import { Channel } from '../channels/entities/channel.entity';
import {
  CommentNotFoundException,
  ReplyDepthExceededException,
} from '../common/exceptions/domain.exception';
import { Comment } from './entities/comment.entity';
import { CommentReaction } from './entities/comment-reaction.entity';
import { Video } from './entities/video.entity';
import { ReactionType } from './entities/video-reaction.entity';
import { VideosService } from './videos.service';

const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;
// Defensive cap on the batched replies query below — the top-level query is
// already bounded by `limit`/`MAX_COMMENTS_LIMIT`, but nothing bounded the
// total reply count across that page until now. This is a blunt global cap
// (not a strict per-comment guarantee — one pathologically large thread
// could still crowd out another's replies within the same page), acceptable
// per TD-04's own premise that "a video-scoped comment section is never
// large enough to need separate reply pagination"; it only exists to stop
// a single page load from loading unbounded rows into memory.
const MAX_REPLIES_PER_PAGE = 500;
const PG_INVALID_TEXT_REPRESENTATION = '22P02';

// A `commentId` that isn't even shaped like a UUID can never resolve to a
// real comment — Postgres rejects it as a raw type-cast error against the
// uuid column before any row lookup happens. Treated the same as "no such
// row" so the caller gets a clean 404 COMMENT_NOT_FOUND instead of a 500
// (same fix applied to CommentReactionService for SI-06.5).
function isPgInvalidUuidInput(err: unknown): boolean {
  return (
    err instanceof QueryFailedError &&
    (err as { code?: string }).code === PG_INVALID_TEXT_REPRESENTATION
  );
}

export interface CommentAuthor {
  id: string;
  nickname: string;
}

// Depth-1 shape: a reply never carries its own `replies` field (per
// social-interactions/TD-04, Option A — adjacency list capped at depth 1).
export interface CommentReplyItem {
  id: string;
  body: string;
  author: CommentAuthor;
  createdAt: Date;
  likesCount: number;
  dislikesCount: number;
  currentUserReaction: ReactionType | null;
}

export interface CommentItem extends CommentReplyItem {
  replies: CommentReplyItem[];
}

export interface FindCommentsResult {
  items: CommentItem[];
  total: number;
}

export interface FindCommentsQuery {
  limit?: number;
  offset?: number;
}

// Owns paginated comment listing (with embedded replies) and top-level
// comment creation (per social-interactions/TD-04). Reply creation is a
// separate SI (SI-06.6) — kept out of this service's write surface.
@Injectable()
export class CommentsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly videosService: VideosService,
  ) {}

  // Anonymous-readable (per Authorization Matrix) — `currentUserId` is only
  // present when the caller authenticated via `@OptionalAuth()`, and drives
  // `currentUserReaction` per comment; anonymous callers always get `null`.
  async findComments(
    publicId: string,
    query: FindCommentsQuery,
    currentUserId?: string,
  ): Promise<FindCommentsResult> {
    const video = await this.videosService.findPublicReadyVideo(publicId);
    const limit = query.limit ?? DEFAULT_LIMIT;
    const offset = query.offset ?? DEFAULT_OFFSET;

    const commentRepository = this.dataSource.getRepository(Comment);
    // Newest-first, fixed order (per this phase's screen-inventory
    // Observations — the UI's sort control is a disabled placeholder).
    const [topLevel, total] = await commentRepository.findAndCount({
      where: { video_id: video.id, parent_comment_id: IsNull() },
      relations: ['user', 'user.channel'],
      order: { created_at: 'DESC' },
      skip: offset,
      take: limit,
    });

    if (topLevel.length === 0) {
      return { items: [], total };
    }

    const topLevelIds = topLevel.map((comment) => comment.id);
    // Batched, not per-comment — avoids N+1 regardless of page size (per
    // .claude/skills/nestjs-best-practices `db-avoid-n-plus-one`).
    const replies = await commentRepository.find({
      where: { parent_comment_id: In(topLevelIds) },
      relations: ['user', 'user.channel'],
      order: { created_at: 'ASC' },
      take: MAX_REPLIES_PER_PAGE,
    });

    const reactionsByCommentId = await this.loadCurrentUserReactions(
      currentUserId,
      [...topLevelIds, ...replies.map((reply) => reply.id)],
    );

    const repliesByParentId = new Map<string, Comment[]>();
    for (const reply of replies) {
      const parentId = reply.parent_comment_id as string;
      const bucket = repliesByParentId.get(parentId) ?? [];
      bucket.push(reply);
      repliesByParentId.set(parentId, bucket);
    }

    const items = topLevel.map((comment) =>
      this.toCommentItem(
        comment,
        reactionsByCommentId,
        repliesByParentId.get(comment.id) ?? [],
      ),
    );

    return { items, total };
  }

  async createComment(
    userId: string,
    publicId: string,
    body: string,
  ): Promise<CommentItem> {
    const video = await this.videosService.findPublicReadyVideo(publicId);

    return this.dataSource.transaction(async (manager) => {
      const commentRepository = manager.getRepository(Comment);
      const comment = await commentRepository.save(
        commentRepository.create({
          video_id: video.id,
          user_id: userId,
          body,
        }),
      );

      // Atomic `UPDATE ... RETURNING`-style counter bump (per
      // phase-05-video-watch-page/TD-02's pattern) — the returned value
      // isn't needed here since a brand-new comment always yields a fresh
      // 0-state response, but the write must stay in the same transaction
      // as the insert.
      await manager
        .createQueryBuilder()
        .update(Video)
        .set({ comments_count: () => 'comments_count + 1' })
        .where('id = :id', { id: video.id })
        .execute();

      const authorChannel = await manager
        .getRepository(Channel)
        .findOneByOrFail({ user_id: userId });

      return {
        id: comment.id,
        body: comment.body,
        author: { id: authorChannel.id, nickname: authorChannel.nickname },
        createdAt: comment.created_at,
        likesCount: 0,
        dislikesCount: 0,
        currentUserReaction: null,
        replies: [],
      };
    });
  }

  // Single-level depth cap (per social-interactions/TD-04, Option A): a
  // reply's `parent_comment_id` is always the top-level comment's id, and a
  // comment that already has a non-null `parent_comment_id` cannot itself be
  // replied to.
  async createReply(
    userId: string,
    publicId: string,
    commentId: string,
    body: string,
  ): Promise<CommentReplyItem> {
    const video = await this.videosService.findPublicReadyVideo(publicId);

    return this.dataSource.transaction(async (manager) => {
      const commentRepository = manager.getRepository(Comment);
      let parent: Comment | null;
      try {
        parent = await commentRepository.findOneBy({
          id: commentId,
          video_id: video.id,
        });
      } catch (err) {
        if (isPgInvalidUuidInput(err)) {
          throw new CommentNotFoundException();
        }
        throw err;
      }
      if (!parent) {
        throw new CommentNotFoundException();
      }
      if (parent.parent_comment_id !== null) {
        throw new ReplyDepthExceededException();
      }

      const reply = await commentRepository.save(
        commentRepository.create({
          video_id: video.id,
          user_id: userId,
          parent_comment_id: commentId,
          body,
        }),
      );

      await manager
        .createQueryBuilder()
        .update(Video)
        .set({ comments_count: () => 'comments_count + 1' })
        .where('id = :id', { id: video.id })
        .execute();

      const authorChannel = await manager
        .getRepository(Channel)
        .findOneByOrFail({ user_id: userId });

      return {
        id: reply.id,
        body: reply.body,
        author: { id: authorChannel.id, nickname: authorChannel.nickname },
        createdAt: reply.created_at,
        likesCount: 0,
        dislikesCount: 0,
        currentUserReaction: null,
      };
    });
  }

  private async loadCurrentUserReactions(
    currentUserId: string | undefined,
    commentIds: string[],
  ): Promise<Map<string, ReactionType>> {
    if (!currentUserId || commentIds.length === 0) {
      return new Map();
    }
    const reactions = await this.dataSource
      .getRepository(CommentReaction)
      .find({ where: { user_id: currentUserId, comment_id: In(commentIds) } });
    return new Map(
      reactions.map((reaction) => [reaction.comment_id, reaction.type]),
    );
  }

  private toCommentItem(
    comment: Comment,
    reactionsByCommentId: Map<string, ReactionType>,
    replies: Comment[],
  ): CommentItem {
    return {
      ...this.toCommentReplyItem(comment, reactionsByCommentId),
      replies: replies.map((reply) =>
        this.toCommentReplyItem(reply, reactionsByCommentId),
      ),
    };
  }

  private toCommentReplyItem(
    comment: Comment,
    reactionsByCommentId: Map<string, ReactionType>,
  ): CommentReplyItem {
    return {
      id: comment.id,
      body: comment.body,
      author: {
        id: comment.user.channel.id,
        nickname: comment.user.channel.nickname,
      },
      createdAt: comment.created_at,
      likesCount: comment.likes_count,
      dislikesCount: comment.dislikes_count,
      currentUserReaction: reactionsByCommentId.get(comment.id) ?? null,
    };
  }
}
