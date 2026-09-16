import { QueryFailedError } from 'typeorm';
import {
  CommentNotFoundException,
  ReplyDepthExceededException,
} from '../common/exceptions/domain.exception';
import { CommentsService } from './comments.service';
import { Comment } from './entities/comment.entity';
import { Video } from './entities/video.entity';

function makeVideo(overrides: Partial<Video> = {}): Video {
  const video = new Video();
  video.id = 'video-id';
  video.public_id = 'public-id';
  Object.assign(video, overrides);
  return video;
}

function makeComment(overrides: Partial<Comment> = {}): Comment {
  const comment = new Comment();
  comment.id = 'comment-id';
  comment.video_id = 'video-id';
  comment.parent_comment_id = null;
  Object.assign(comment, overrides);
  return comment;
}

function makeCommentRepository(overrides: Record<string, jest.Mock> = {}): any {
  return {
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    find: jest.fn().mockResolvedValue([]),
    findOneBy: jest.fn(),
    create: jest.fn((data: unknown) => data),
    save: jest.fn(),
    ...overrides,
  };
}

function makeDataSource(commentRepository: any, reactionRepository: any): any {
  return {
    getRepository: jest.fn((entity: { name: string }) => {
      if (entity.name === 'CommentReaction') return reactionRepository;
      if (entity.name === 'Channel') {
        return {
          findOneByOrFail: jest
            .fn()
            .mockResolvedValue({ id: 'channel-id', nickname: 'nick' }),
        };
      }
      return commentRepository;
    }),
    transaction: jest.fn((cb: (manager: any) => Promise<any>) =>
      cb({
        getRepository: (entity: { name: string }) => {
          if (entity.name === 'Channel') {
            return {
              findOneByOrFail: jest
                .fn()
                .mockResolvedValue({ id: 'channel-id', nickname: 'nick' }),
            };
          }
          return commentRepository;
        },
        createQueryBuilder: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue(undefined),
        }),
      }),
    ),
  };
}

function makeVideosService(video: Video = makeVideo()): any {
  return { findPublicReadyVideo: jest.fn().mockResolvedValue(video) };
}

function makeInvalidUuidError(): QueryFailedError {
  const err = new QueryFailedError('SELECT', [], new Error()) as any;
  err.code = '22P02';
  return err;
}

describe('CommentsService', () => {
  describe('findComments', () => {
    it('applies default limit/offset when the query omits them', async () => {
      const commentRepository = makeCommentRepository();
      const reactionRepository = { find: jest.fn().mockResolvedValue([]) };
      const service = new CommentsService(
        makeDataSource(commentRepository, reactionRepository),
        makeVideosService(),
      );

      await service.findComments('public-id', {});

      expect(commentRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it('passes through explicit limit/offset', async () => {
      const commentRepository = makeCommentRepository();
      const reactionRepository = { find: jest.fn().mockResolvedValue([]) };
      const service = new CommentsService(
        makeDataSource(commentRepository, reactionRepository),
        makeVideosService(),
      );

      await service.findComments('public-id', { limit: 5, offset: 10 });

      expect(commentRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
    });

    it('returns an empty result without querying replies when there are no top-level comments', async () => {
      const commentRepository = makeCommentRepository({
        findAndCount: jest.fn().mockResolvedValue([[], 7]),
      });
      const reactionRepository = { find: jest.fn().mockResolvedValue([]) };
      const service = new CommentsService(
        makeDataSource(commentRepository, reactionRepository),
        makeVideosService(),
      );

      const result = await service.findComments('public-id', {});

      expect(result).toEqual({ items: [], total: 7 });
      expect(commentRepository.find).not.toHaveBeenCalled();
    });

    it('caps the batched replies query at MAX_REPLIES_PER_PAGE', async () => {
      const topLevel = [
        {
          id: 'c1',
          body: 'hi',
          created_at: new Date(),
          likes_count: 0,
          dislikes_count: 0,
          user: { channel: { id: 'ch1', nickname: 'nick1' } },
        },
      ];
      const commentRepository = makeCommentRepository({
        findAndCount: jest.fn().mockResolvedValue([topLevel, 1]),
      });
      const reactionRepository = { find: jest.fn().mockResolvedValue([]) };
      const service = new CommentsService(
        makeDataSource(commentRepository, reactionRepository),
        makeVideosService(),
      );

      await service.findComments('public-id', {});

      expect(commentRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 500 }),
      );
    });

    it('skips the reaction lookup entirely for an anonymous caller', async () => {
      const topLevel = [
        {
          id: 'c1',
          body: 'hi',
          created_at: new Date(),
          likes_count: 0,
          dislikes_count: 0,
          user: { channel: { id: 'ch1', nickname: 'nick1' } },
        },
      ];
      const commentRepository = makeCommentRepository({
        findAndCount: jest.fn().mockResolvedValue([topLevel, 1]),
        find: jest.fn().mockResolvedValue([]),
      });
      const reactionRepository = { find: jest.fn().mockResolvedValue([]) };
      const service = new CommentsService(
        makeDataSource(commentRepository, reactionRepository),
        makeVideosService(),
      );

      const result = await service.findComments('public-id', {});

      expect(reactionRepository.find).not.toHaveBeenCalled();
      expect(result.items[0].currentUserReaction).toBeNull();
      expect(result.items[0].replies).toEqual([]);
    });
  });

  describe('createReply', () => {
    it('throws CommentNotFoundException when the target comment does not exist', async () => {
      const commentRepository = makeCommentRepository({
        findOneBy: jest.fn().mockResolvedValue(null),
      });
      const service = new CommentsService(
        makeDataSource(commentRepository, {}),
        makeVideosService(),
      );

      await expect(
        service.createReply('user-id', 'public-id', 'missing-id', 'hi'),
      ).rejects.toThrow(CommentNotFoundException);
    });

    it('throws CommentNotFoundException when commentId is not a valid UUID', async () => {
      const commentRepository = makeCommentRepository({
        findOneBy: jest.fn().mockRejectedValue(makeInvalidUuidError()),
      });
      const service = new CommentsService(
        makeDataSource(commentRepository, {}),
        makeVideosService(),
      );

      await expect(
        service.createReply('user-id', 'public-id', 'not-a-uuid', 'hi'),
      ).rejects.toThrow(CommentNotFoundException);
    });

    it('throws ReplyDepthExceededException when the target comment is itself a reply', async () => {
      const commentRepository = makeCommentRepository({
        findOneBy: jest
          .fn()
          .mockResolvedValue(makeComment({ parent_comment_id: 'parent-id' })),
      });
      const service = new CommentsService(
        makeDataSource(commentRepository, {}),
        makeVideosService(),
      );

      await expect(
        service.createReply('user-id', 'public-id', 'comment-id', 'hi'),
      ).rejects.toThrow(ReplyDepthExceededException);
      expect(commentRepository.save).not.toHaveBeenCalled();
    });

    it('creates a reply and returns it without a replies field', async () => {
      const commentRepository = makeCommentRepository({
        findOneBy: jest.fn().mockResolvedValue(makeComment()),
        save: jest.fn().mockResolvedValue(
          makeComment({
            id: 'reply-id',
            parent_comment_id: 'comment-id',
            body: 'a reply',
            created_at: new Date('2026-01-01'),
          }),
        ),
      });
      const service = new CommentsService(
        makeDataSource(commentRepository, {}),
        makeVideosService(),
      );

      const result = await service.createReply(
        'user-id',
        'public-id',
        'comment-id',
        'a reply',
      );

      expect(result).not.toHaveProperty('replies');
      expect(result).toMatchObject({
        id: 'reply-id',
        body: 'a reply',
        likesCount: 0,
        dislikesCount: 0,
        currentUserReaction: null,
      });
    });
  });
});
