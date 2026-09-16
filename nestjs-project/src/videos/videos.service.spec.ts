import { In, IsNull, Not } from 'typeorm';
import { VideoNotFoundException } from '../common/exceptions/domain.exception';
import {
  Video,
  VideoCategory,
  VideoStatus,
  VideoVisibility,
} from './entities/video.entity';
import { ReactionType } from './entities/video-reaction.entity';
import { VideosService } from './videos.service';

function makeVideo(overrides: Partial<Video> = {}): Video {
  const v = new Video();
  v.id = 'uuid';
  v.public_id = 'pub123';
  v.user_id = 'owner-id';
  v.channel_id = 'channel-id';
  v.storage_key = 'videos/key.mp4';
  v.status = VideoStatus.READY;
  v.title = 'Existing title';
  v.description = null;
  v.category = VideoCategory.OTHER;
  v.visibility = VideoVisibility.PUBLIC;
  v.duration_seconds = 120;
  v.thumbnail_key = 'thumbnails/key.png';
  v.views = 5;
  v.likes_count = 10;
  v.dislikes_count = 2;
  v.published_at = new Date('2026-09-12T00:00:00.000Z');
  v.channel = {
    nickname: 'someone',
    name: 'Someone',
    subscribers_count: 3,
  } as Video['channel'];
  return Object.assign(v, overrides);
}

function makeReactionRepository(
  overrides: Record<string, jest.Mock> = {},
): any {
  return {
    findOne: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

// Mocks the createQueryBuilder().update(...).set(...).where(...).returning(...)
// .execute() chain used by findPublicVideo's atomic UPDATE...RETURNING.
function makeQueryBuilder(returningViews: number): any {
  const qb: any = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ raw: [{ views: returningViews }] }),
  };
  return qb;
}

function makeRepository(overrides: Record<string, jest.Mock> = {}): any {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
    ...overrides,
  };
}

describe('VideosService', () => {
  describe('findPublicVideo', () => {
    it('returns metadata and increments views for a ready+public video', async () => {
      const video = makeVideo({ visibility: VideoVisibility.PUBLIC });
      const queryBuilder = makeQueryBuilder(6);
      const repository = makeRepository({
        findOne: jest.fn().mockResolvedValue(video),
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      });
      const reactionRepository = makeReactionRepository();
      const service = new VideosService(repository, reactionRepository);

      const result = await service.findPublicVideo('pub123');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: {
          public_id: 'pub123',
          status: VideoStatus.READY,
          visibility: In([VideoVisibility.PUBLIC, VideoVisibility.UNLISTED]),
          published_at: Not(IsNull()),
        },
        relations: ['channel'],
      });
      expect(queryBuilder.update).toHaveBeenCalledWith(Video);
      expect(queryBuilder.where).toHaveBeenCalledWith('id = :id', {
        id: 'uuid',
      });
      expect(queryBuilder.returning).toHaveBeenCalledWith(['views']);
      expect(reactionRepository.findOne).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: 'uuid',
        public_id: 'pub123',
        title: 'Existing title',
        description: null,
        category: VideoCategory.OTHER,
        visibility: VideoVisibility.PUBLIC,
        duration_seconds: 120,
        thumbnail_key: 'thumbnails/key.png',
        views: 6,
        likesCount: 10,
        dislikesCount: 2,
        currentUserReaction: null,
        published_at: video.published_at,
        channel: { nickname: 'someone', name: 'Someone', subscribersCount: 3 },
      });
    });

    it('returns metadata for a ready+unlisted video (direct-link access)', async () => {
      const video = makeVideo({ visibility: VideoVisibility.UNLISTED });
      const repository = makeRepository({
        findOne: jest.fn().mockResolvedValue(video),
        createQueryBuilder: jest.fn().mockReturnValue(makeQueryBuilder(6)),
      });
      const service = new VideosService(repository, makeReactionRepository());

      const result = await service.findPublicVideo('pub123');

      expect(result.visibility).toBe(VideoVisibility.UNLISTED);
    });

    it('includes the real currentUserReaction when authenticated and a reaction exists', async () => {
      const video = makeVideo();
      const repository = makeRepository({
        findOne: jest.fn().mockResolvedValue(video),
        createQueryBuilder: jest.fn().mockReturnValue(makeQueryBuilder(6)),
      });
      const reactionRepository = makeReactionRepository({
        findOne: jest.fn().mockResolvedValue({ type: ReactionType.DISLIKE }),
      });
      const service = new VideosService(repository, reactionRepository);

      const result = await service.findPublicVideo('pub123', 'user-id');

      expect(reactionRepository.findOne).toHaveBeenCalledWith({
        where: { user_id: 'user-id', video_id: 'uuid' },
      });
      expect(result.currentUserReaction).toBe(ReactionType.DISLIKE);
    });

    it('throws VideoNotFoundException when no video matches (draft/processing/error status, private visibility, unpublished, or unknown public_id)', async () => {
      const repository = makeRepository({
        findOne: jest.fn().mockResolvedValue(null),
      });
      const service = new VideosService(repository, makeReactionRepository());

      await expect(service.findPublicVideo('does-not-exist')).rejects.toThrow(
        VideoNotFoundException,
      );
      expect(repository.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('findSuggestedVideos', () => {
    it('queries same-category, ready+public videos excluding the anchor, ordered by published_at DESC, defaulting the limit to 12', async () => {
      const anchor = makeVideo({
        id: 'anchor-uuid',
        category: VideoCategory.MUSIC,
      });
      const suggestion = makeVideo({
        id: 'suggestion-uuid',
        public_id: 'pub456',
      });
      const repository = makeRepository({
        findOne: jest.fn().mockResolvedValue(anchor),
        find: jest.fn().mockResolvedValue([suggestion]),
      });
      const service = new VideosService(repository, makeReactionRepository());

      const result = await service.findSuggestedVideos('pub123');

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          category: VideoCategory.MUSIC,
          status: VideoStatus.READY,
          visibility: VideoVisibility.PUBLIC,
          published_at: Not(IsNull()),
          id: Not('anchor-uuid'),
        },
        relations: ['channel'],
        order: { published_at: 'DESC' },
        take: 12,
      });
      expect(result).toEqual([
        {
          id: 'suggestion-uuid',
          public_id: 'pub456',
          title: 'Existing title',
          thumbnail_key: 'thumbnails/key.png',
          duration_seconds: 120,
          views: 5,
          published_at: suggestion.published_at,
          channel: { nickname: 'someone', name: 'Someone' },
        },
      ]);
    });

    it('caps the take to an explicit limit', async () => {
      const anchor = makeVideo({ id: 'anchor-uuid' });
      const repository = makeRepository({
        findOne: jest.fn().mockResolvedValue(anchor),
        find: jest.fn().mockResolvedValue([]),
      });
      const service = new VideosService(repository, makeReactionRepository());

      await service.findSuggestedVideos('pub123', 5);

      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });

    it('throws VideoNotFoundException when the anchor video is not found, without querying suggestions', async () => {
      const repository = makeRepository({
        findOne: jest.fn().mockResolvedValue(null),
      });
      const service = new VideosService(repository, makeReactionRepository());

      await expect(
        service.findSuggestedVideos('does-not-exist'),
      ).rejects.toThrow(VideoNotFoundException);
      expect(repository.find).not.toHaveBeenCalled();
    });
  });
});
