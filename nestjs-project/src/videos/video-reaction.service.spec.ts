import { QueryFailedError } from 'typeorm';
import { Video } from './entities/video.entity';
import { ReactionType, VideoReaction } from './entities/video-reaction.entity';
import { VideoReactionService } from './video-reaction.service';

function makeVideo(overrides: Partial<Video> = {}): Video {
  const video = new Video();
  video.id = 'video-id';
  video.likes_count = 0;
  video.dislikes_count = 0;
  Object.assign(video, overrides);
  return video;
}

function makeReaction(overrides: Partial<VideoReaction> = {}): VideoReaction {
  const reaction = new VideoReaction();
  reaction.id = 'reaction-id';
  reaction.user_id = 'user-id';
  reaction.video_id = 'video-id';
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
  video?: Video;
  counterResult?: { likes_count: number; dislikes_count: number };
}): any {
  return {
    getRepository: jest.fn().mockReturnValue(options.reactionRepository),
    query: jest.fn().mockResolvedValue(undefined),
    findOneByOrFail: jest.fn().mockResolvedValue(options.video ?? makeVideo()),
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

function makeVideosService(video: Video = makeVideo()): any {
  return { findPublicReadyVideo: jest.fn().mockResolvedValue(video) };
}

function makeUniqueError(): QueryFailedError {
  const err = new QueryFailedError('INSERT', [], new Error()) as any;
  err.code = '23505';
  return err;
}

describe('VideoReactionService', () => {
  describe('setReaction', () => {
    it('flips like to dislike in one update, adjusting both counters', async () => {
      const existing = makeReaction({ type: ReactionType.LIKE });
      const reactionRepository = makeReactionRepository({
        findOne: jest.fn().mockResolvedValue(existing),
      });
      const manager = makeManager({
        reactionRepository,
        counterResult: { likes_count: 0, dislikes_count: 1 },
      });
      const service = new VideoReactionService(
        makeDataSource(manager),
        makeVideosService(),
      );

      const result = await service.setReaction(
        'user-id',
        'public-id',
        ReactionType.DISLIKE,
      );

      expect(reactionRepository.update).toHaveBeenCalledWith(
        { id: existing.id },
        { type: ReactionType.DISLIKE },
      );
      expect(reactionRepository.delete).not.toHaveBeenCalled();
      expect(result).toEqual({
        type: ReactionType.DISLIKE,
        likesCount: 0,
        dislikesCount: 1,
      });
    });

    it('removes the reaction and decrements the counter when type is null', async () => {
      const existing = makeReaction({ type: ReactionType.LIKE });
      const reactionRepository = makeReactionRepository({
        findOne: jest.fn().mockResolvedValue(existing),
      });
      const manager = makeManager({
        reactionRepository,
        counterResult: { likes_count: 0, dislikes_count: 0 },
      });
      const service = new VideoReactionService(
        makeDataSource(manager),
        makeVideosService(),
      );

      const result = await service.setReaction('user-id', 'public-id', null);

      expect(reactionRepository.delete).toHaveBeenCalledWith({
        id: existing.id,
      });
      expect(reactionRepository.update).not.toHaveBeenCalled();
      expect(result).toEqual({
        type: null,
        likesCount: 0,
        dislikesCount: 0,
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
      const service = new VideoReactionService(
        makeDataSource(manager),
        makeVideosService(),
      );

      const result = await service.setReaction(
        'user-id',
        'public-id',
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
        video: makeVideo({ likes_count: 3, dislikes_count: 0 }),
      });
      const service = new VideoReactionService(
        makeDataSource(manager),
        makeVideosService(),
      );

      const result = await service.setReaction(
        'user-id',
        'public-id',
        ReactionType.LIKE,
      );

      expect(reactionRepository.update).not.toHaveBeenCalled();
      expect(reactionRepository.delete).not.toHaveBeenCalled();
      expect(reactionRepository.save).not.toHaveBeenCalled();
      expect(manager.createQueryBuilder).not.toHaveBeenCalled();
      expect(result).toEqual({
        type: ReactionType.LIKE,
        likesCount: 3,
        dislikesCount: 0,
      });
    });

    it('is idempotent when removing a reaction that does not exist', async () => {
      const reactionRepository = makeReactionRepository({
        findOne: jest.fn().mockResolvedValue(null),
      });
      const manager = makeManager({
        reactionRepository,
        video: makeVideo({ likes_count: 0, dislikes_count: 0 }),
      });
      const service = new VideoReactionService(
        makeDataSource(manager),
        makeVideosService(),
      );

      const result = await service.setReaction('user-id', 'public-id', null);

      expect(reactionRepository.save).not.toHaveBeenCalled();
      expect(reactionRepository.delete).not.toHaveBeenCalled();
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
      const service = new VideoReactionService(
        makeDataSource(manager),
        makeVideosService(),
      );

      const result = await service.setReaction(
        'user-id',
        'public-id',
        ReactionType.LIKE,
      );

      expect(manager.query).toHaveBeenCalledWith('SAVEPOINT insert_reaction');
      expect(manager.query).toHaveBeenCalledWith(
        'ROLLBACK TO SAVEPOINT insert_reaction',
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
