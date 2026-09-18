import { DataSource, Repository } from 'typeorm';
import { Channel } from '../channels/entities/channel.entity';
import {
  CommentNotFoundException,
  ReplyDepthExceededException,
  VideoNotFoundException,
} from '../common/exceptions/domain.exception';
import {
  cleanAllTables,
  createTestDataSource,
  ALL_APP_ENTITIES,
} from '../test/create-test-data-source';
import { User } from '../users/entities/user.entity';
import { CommentsService } from './comments.service';
import { Comment } from './entities/comment.entity';
import { CommentReaction } from './entities/comment-reaction.entity';
import { Video, VideoStatus, VideoVisibility } from './entities/video.entity';
import { ReactionType, VideoReaction } from './entities/video-reaction.entity';
import { VideosService } from './videos.service';

describe('CommentsService (integration)', () => {
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let channelRepository: Repository<Channel>;
  let videoRepository: Repository<Video>;
  let commentRepository: Repository<Comment>;
  let commentReactionRepository: Repository<CommentReaction>;
  let service: CommentsService;

  beforeAll(async () => {
    dataSource = createTestDataSource(ALL_APP_ENTITIES);
    await dataSource.initialize();
    userRepository = dataSource.getRepository(User);
    channelRepository = dataSource.getRepository(Channel);
    videoRepository = dataSource.getRepository(Video);
    commentRepository = dataSource.getRepository(Comment);
    commentReactionRepository = dataSource.getRepository(CommentReaction);

    const videosService = new VideosService(
      videoRepository,
      dataSource.getRepository(VideoReaction),
    );
    service = new CommentsService(dataSource, videosService);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await cleanAllTables(dataSource);
  });

  let counter = 0;
  async function createUserWithChannel(): Promise<{
    user: User;
    channel: Channel;
  }> {
    const n = ++counter;
    const user = await userRepository.save(
      userRepository.create({
        email: `comments_svc_user_${n}@example.com`,
        password: 'hashed',
      }),
    );
    const channel = await channelRepository.save(
      channelRepository.create({
        name: `Channel ${n}`,
        nickname: `commentssvcchan${n}`,
        user_id: user.id,
      }),
    );
    return { user, channel };
  }

  async function createPublicVideo(): Promise<Video> {
    const { user, channel } = await createUserWithChannel();
    return videoRepository.save(
      videoRepository.create({
        user_id: user.id,
        channel_id: channel.id,
        storage_key: `videos/comments-svc-${++counter}.mp4`,
        status: VideoStatus.READY,
        visibility: VideoVisibility.PUBLIC,
        published_at: new Date(),
      }),
    );
  }

  describe('findComments', () => {
    it('returns top-level comments newest-first with embedded replies', async () => {
      const video = await createPublicVideo();
      const { user: author } = await createUserWithChannel();

      const older = await commentRepository.save(
        commentRepository.create({
          video_id: video.id,
          user_id: author.id,
          body: 'older comment',
          created_at: new Date('2026-01-01'),
        }),
      );
      const newer = await commentRepository.save(
        commentRepository.create({
          video_id: video.id,
          user_id: author.id,
          body: 'newer comment',
          created_at: new Date('2026-01-02'),
        }),
      );
      await commentRepository.save(
        commentRepository.create({
          video_id: video.id,
          user_id: author.id,
          parent_comment_id: older.id,
          body: 'a reply',
          created_at: new Date('2026-01-03'),
        }),
      );

      const result = await service.findComments(video.public_id, {});

      expect(result.total).toBe(2);
      expect(result.items.map((c) => c.id)).toEqual([newer.id, older.id]);
      const olderItem = result.items.find((c) => c.id === older.id)!;
      expect(olderItem.replies).toHaveLength(1);
      expect(olderItem.replies[0].body).toBe('a reply');
      expect(olderItem.replies[0]).not.toHaveProperty('replies');
      const newerItem = result.items.find((c) => c.id === newer.id)!;
      expect(newerItem.replies).toEqual([]);
    });

    it('paginates top-level comments via limit/offset while reporting the true total', async () => {
      const video = await createPublicVideo();
      const { user: author } = await createUserWithChannel();
      for (let i = 0; i < 3; i++) {
        await commentRepository.save(
          commentRepository.create({
            video_id: video.id,
            user_id: author.id,
            body: `comment ${i}`,
            created_at: new Date(`2026-01-0${i + 1}`),
          }),
        );
      }

      const result = await service.findComments(video.public_id, {
        limit: 1,
        offset: 1,
      });

      expect(result.total).toBe(3);
      expect(result.items).toHaveLength(1);
    });

    it('returns null currentUserReaction for an anonymous caller', async () => {
      const video = await createPublicVideo();
      const { user: author } = await createUserWithChannel();
      const comment = await commentRepository.save(
        commentRepository.create({
          video_id: video.id,
          user_id: author.id,
          body: 'a comment',
        }),
      );
      const { user: reactor } = await createUserWithChannel();
      await commentReactionRepository.save(
        commentReactionRepository.create({
          user_id: reactor.id,
          comment_id: comment.id,
          type: ReactionType.LIKE,
        }),
      );

      const result = await service.findComments(video.public_id, {});

      expect(result.items[0].currentUserReaction).toBeNull();
    });

    it('reflects the real reaction for the authenticated caller', async () => {
      const video = await createPublicVideo();
      const { user: author } = await createUserWithChannel();
      const comment = await commentRepository.save(
        commentRepository.create({
          video_id: video.id,
          user_id: author.id,
          body: 'a comment',
        }),
      );
      const { user: reactor } = await createUserWithChannel();
      await commentReactionRepository.save(
        commentReactionRepository.create({
          user_id: reactor.id,
          comment_id: comment.id,
          type: ReactionType.DISLIKE,
        }),
      );

      const result = await service.findComments(
        video.public_id,
        {},
        reactor.id,
      );

      expect(result.items[0].currentUserReaction).toBe(ReactionType.DISLIKE);
    });

    it('includes the author channel id and nickname', async () => {
      const video = await createPublicVideo();
      const { user: author, channel } = await createUserWithChannel();
      await commentRepository.save(
        commentRepository.create({
          video_id: video.id,
          user_id: author.id,
          body: 'a comment',
        }),
      );

      const result = await service.findComments(video.public_id, {});

      expect(result.items[0].author).toEqual({
        id: channel.id,
        nickname: channel.nickname,
      });
    });
  });

  describe('createComment', () => {
    it('creates a top-level comment and atomically increments comments_count', async () => {
      const video = await createPublicVideo();
      const { user: author, channel } = await createUserWithChannel();

      const result = await service.createComment(
        author.id,
        video.public_id,
        'Great video!',
      );

      expect(result).toMatchObject({
        body: 'Great video!',
        author: { id: channel.id, nickname: channel.nickname },
        likesCount: 0,
        dislikesCount: 0,
        currentUserReaction: null,
        replies: [],
      });
      const reloaded = await videoRepository.findOneByOrFail({ id: video.id });
      expect(reloaded.comments_count).toBe(1);
    });

    it('increments comments_count by exactly the number of concurrent comments created', async () => {
      const video = await createPublicVideo();
      const { user: author } = await createUserWithChannel();

      await Promise.all([
        service.createComment(author.id, video.public_id, 'first'),
        service.createComment(author.id, video.public_id, 'second'),
      ]);

      const reloaded = await videoRepository.findOneByOrFail({ id: video.id });
      expect(reloaded.comments_count).toBe(2);
      const count = await commentRepository.count({
        where: { video_id: video.id },
      });
      expect(count).toBe(2);
    });
  });

  describe('createReply', () => {
    it('creates a reply and atomically increments comments_count', async () => {
      const video = await createPublicVideo();
      const { user: author } = await createUserWithChannel();
      const parent = await commentRepository.save(
        commentRepository.create({
          video_id: video.id,
          user_id: author.id,
          body: 'top-level comment',
        }),
      );
      const { user: replier, channel: replierChannel } =
        await createUserWithChannel();

      const result = await service.createReply(
        replier.id,
        video.public_id,
        parent.id,
        'a reply',
      );

      expect(result).not.toHaveProperty('replies');
      expect(result).toMatchObject({
        body: 'a reply',
        author: { id: replierChannel.id, nickname: replierChannel.nickname },
        likesCount: 0,
        dislikesCount: 0,
        currentUserReaction: null,
      });
      const reloadedVideo = await videoRepository.findOneByOrFail({
        id: video.id,
      });
      expect(reloadedVideo.comments_count).toBe(1);
      const persistedReply = await commentRepository.findOneByOrFail({
        id: result.id,
      });
      expect(persistedReply.parent_comment_id).toBe(parent.id);
    });

    it('rejects replying to a reply with REPLY_DEPTH_EXCEEDED', async () => {
      const video = await createPublicVideo();
      const { user: author } = await createUserWithChannel();
      const parent = await commentRepository.save(
        commentRepository.create({
          video_id: video.id,
          user_id: author.id,
          body: 'top-level comment',
        }),
      );
      const reply = await commentRepository.save(
        commentRepository.create({
          video_id: video.id,
          user_id: author.id,
          parent_comment_id: parent.id,
          body: 'a reply',
        }),
      );
      const { user: replier } = await createUserWithChannel();

      await expect(
        service.createReply(replier.id, video.public_id, reply.id, 'nested'),
      ).rejects.toThrow(ReplyDepthExceededException);
      const reloadedVideo = await videoRepository.findOneByOrFail({
        id: video.id,
      });
      expect(reloadedVideo.comments_count).toBe(0);
    });

    it('rejects a reply targeting a comment from a different video with COMMENT_NOT_FOUND', async () => {
      const video = await createPublicVideo();
      const otherVideo = await createPublicVideo();
      const { user: author } = await createUserWithChannel();
      const commentOnOtherVideo = await commentRepository.save(
        commentRepository.create({
          video_id: otherVideo.id,
          user_id: author.id,
          body: 'comment on a different video',
        }),
      );
      const { user: replier } = await createUserWithChannel();

      await expect(
        service.createReply(
          replier.id,
          video.public_id,
          commentOnOtherVideo.id,
          'reply',
        ),
      ).rejects.toThrow(CommentNotFoundException);
    });

    it('rejects a reply targeting a non-existent video with VIDEO_NOT_FOUND', async () => {
      const { user: replier } = await createUserWithChannel();

      await expect(
        service.createReply(
          replier.id,
          'does-not-exist',
          '00000000-0000-0000-0000-000000000000',
          'reply',
        ),
      ).rejects.toThrow(VideoNotFoundException);
    });
  });
});
