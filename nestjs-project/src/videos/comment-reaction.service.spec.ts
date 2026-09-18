import { QueryFailedError } from 'typeorm';
import { CommentNotFoundException } from '../common/exceptions/domain.exception';
import { CommentReactionService } from './comment-reaction.service';
import { Comment } from './entities/comment.entity';
import { CommentReaction } from './entities/comment-reaction.entity';
import { ReactionType } from './entities/video-reaction.entity';
import { Video, VideoStatus, VideoVisibility } from './entities/video.entity';

function makePublicReadyVideo(overrides: Partial<Video> = {}): Video {
  const video = new Video();
  video.id = 'video-id';
  video.status = VideoStatus.READY;
  video.visibility = VideoVisibility.PUBLIC;
  video.published_at = new Date();
  Object.assign(video, overrides);
  return video;
}

function makeComment(overrides: Partial<Comment> = {}): Comment {
  const comment = new Comment();
  comment.id = 'comment-id';
  comment.likes_count = 0;
  comment.dislikes_count = 0;
  comment.video = makePublicReadyVideo();
  Object.assign(comment, overrides);
  return comment;
}

function makeReaction(
  overrides: Partial<CommentReaction> = {},
): CommentReaction {
  const reaction = new CommentReaction();
  reaction.id = 'reaction-id';
  reaction.user_id = 'user-id';
  reaction.comment_id = 'comment-id';
  reaction.type = ReactionType.LIKE;
  Object.assign(reaction, overrides);
  return reaction;
}

function makeReactionRepository(
  overrides: Record<string, jest.Mock> = {},
): any {
  return {
    findOne: jest.fn(),
    findOneByOrFail: jest.fn(),
    create: jest.fn((data: unknown) => data),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  };
}

function makeQueryBuilder(returningRow: {
  likes_count: number;
  dislikes_count: number;
}): any {
  return {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ raw: [returningRow] }),
  };
}

function makeManager(options: {
  reactionRepository: any;
  comment?: Comment | null;
  counterResult?: { likes_count: number; dislikes_count: number };
  findOne?: jest.Mock;
}): any {
  const comment =
    options.comment === undefined ? makeComment() : options.comment;
  return {
    findOne: options.findOne ?? jest.fn().mockResolvedValue(comment),
    getRepository: jest.fn().mockReturnValue(options.reactionRepository),
    query: jest.fn().mockResolvedValue(undefined),
    findOneByOrFail: jest.fn().mockResolvedValue(comment ?? makeComment()),
    createQueryBuilder: jest
      .fn()
      .mockReturnValue(
        makeQueryBuilder(
          options.counterResult ?? { likes_count: 0, dislikes_count: 0 },
        ),
      ),
  };
}

function makeDataSource(manager: any): any {
  return {
    transaction: jest.fn((cb: (m: any) => Promise<any>) => cb(manager)),
  };
}

function makeUniqueError(): QueryFailedError {
  const err = new QueryFailedError('INSERT', [], new Error()) as any;
  err.code = '23505';
  return err;
}

function makeInvalidUuidError(): QueryFailedError {
  const err = new QueryFailedError('SELECT', [], new Error()) as any;
  err.code = '22P02';
  return err;
}

describe('CommentReactionService', () => {
  describe('setReaction', () => {
    it('throws CommentNotFoundException when the comment does not exist', async () => {
      const manager = makeManager({
        reactionRepository: makeReactionRepository(),
        comment: null,
      });
      const service = new CommentReactionService(makeDataSource(manager));

      await expect(
        service.setReaction('user-id', 'missing-id', ReactionType.LIKE),
      ).rejects.toThrow(CommentNotFoundException);
    });

    it('throws CommentNotFoundException when commentId is not a valid UUID', async () => {
      const manager = makeManager({
        reactionRepository: makeReactionRepository(),
        findOne: jest.fn().mockRejectedValue(makeInvalidUuidError()),
      });
      const service = new CommentReactionService(makeDataSource(manager));

      await expect(
        service.setReaction('user-id', 'not-a-uuid', ReactionType.LIKE),
      ).rejects.toThrow(CommentNotFoundException);
    });

    it('throws CommentNotFoundException when the parent video is no longer public/ready', async () => {
      const manager = makeManager({
        reactionRepository: makeReactionRepository(),
        comment: makeComment({
          video: makePublicReadyVideo({ status: VideoStatus.DRAFT }),
        }),
      });
      const service = new CommentReactionService(makeDataSource(manager));

      await expect(
        service.setReaction('user-id', 'comment-id', ReactionType.LIKE),
      ).rejects.toThrow(CommentNotFoundException);
    });

    it('flips like to dislike in one update, adjusting both counters', async () => {
      const existing = makeReaction({ type: ReactionType.LIKE });
      const reactionRepository = makeReactionRepository({
        findOne: jest.fn().mockResolvedValue(existing),
      });
      const manager = makeManager({
        reactionRepository,
        counterResult: { likes_count: 0, dislikes_count: 1 },
      });
      const service = new CommentReactionService(makeDataSource(manager));

      const result = await service.setReaction(
        'user-id',
        'comment-id',
        ReactionType.DISLIKE,
      );

      expect(reactionRepository.update).toHaveBeenCalledWith(
        { id: existing.id },
        { type: ReactionType.DISLIKE },
      );
      expect(result).toEqual({
        type: ReactionType.DISLIKE,
        likesCount: 0,
        dislikesCount: 1,
      });
    });

    it('creates a new reaction and increments the counter when none exists', async () => {
      const reactionRepository = makeReactionRepository({
        findOne: jest.fn().mockResolvedValue(null),
        save: jest.fn().mockResolvedValue(undefined),
      });
      const manager = makeManager({
        reactionRepository,
        counterResult: { likes_count: 1, dislikes_count: 0 },
      });
      const service = new CommentReactionService(makeDataSource(manager));

      const result = await service.setReaction(
        'user-id',
        'comment-id',
        ReactionType.LIKE,
      );

      expect(reactionRepository.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        type: ReactionType.LIKE,
        likesCount: 1,
        dislikesCount: 0,
      });
    });

    it('is idempotent when the requested type matches the existing reaction', async () => {
      const existing = makeReaction({ type: ReactionType.LIKE });
      const reactionRepository = makeReactionRepository({
        findOne: jest.fn().mockResolvedValue(existing),
      });
      const manager = makeManager({
        reactionRepository,
        comment: makeComment({ likes_count: 3, dislikes_count: 0 }),
      });
      const service = new CommentReactionService(makeDataSource(manager));

      const result = await service.setReaction(
        'user-id',
        'comment-id',
        ReactionType.LIKE,
      );

      expect(reactionRepository.update).not.toHaveBeenCalled();
      expect(reactionRepository.delete).not.toHaveBeenCalled();
      expect(manager.createQueryBuilder).not.toHaveBeenCalled();
      expect(result).toEqual({
        type: ReactionType.LIKE,
        likesCount: 3,
        dislikesCount: 0,
      });
    });

    it('removes the reaction and decrements the counter when type is null', async () => {
      const existing = makeReaction({ type: ReactionType.DISLIKE });
      const reactionRepository = makeReactionRepository({
        findOne: jest.fn().mockResolvedValue(existing),
      });
      const manager = makeManager({
        reactionRepository,
        counterResult: { likes_count: 0, dislikes_count: 0 },
      });
      const service = new CommentReactionService(makeDataSource(manager));

      const result = await service.setReaction('user-id', 'comment-id', null);

      expect(reactionRepository.delete).toHaveBeenCalledWith({
        id: existing.id,
      });
      expect(result).toEqual({
        type: null,
        likesCount: 0,
        dislikesCount: 0,
      });
    });

    it('recovers from a concurrent insert race via a SAVEPOINT and falls back to update', async () => {
      const raced = makeReaction({ type: ReactionType.DISLIKE });
      const reactionRepository = makeReactionRepository({
        findOne: jest.fn().mockResolvedValue(null),
        save: jest.fn().mockRejectedValue(makeUniqueError()),
        findOneByOrFail: jest.fn().mockResolvedValue(raced),
      });
      const manager = makeManager({
        reactionRepository,
        counterResult: { likes_count: 1, dislikes_count: 0 },
      });
      const service = new CommentReactionService(makeDataSource(manager));

      const result = await service.setReaction(
        'user-id',
        'comment-id',
        ReactionType.LIKE,
      );

      expect(manager.query).toHaveBeenCalledWith(
        'SAVEPOINT insert_comment_reaction',
      );
      expect(manager.query).toHaveBeenCalledWith(
        'ROLLBACK TO SAVEPOINT insert_comment_reaction',
      );
      expect(reactionRepository.update).toHaveBeenCalledWith(
        { id: raced.id },
        { type: ReactionType.LIKE },
      );
      expect(result).toEqual({
        type: ReactionType.LIKE,
        likesCount: 1,
        dislikesCount: 0,
      });
    });
  });
});
