import { DataSource, Repository } from 'typeorm';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { VerificationToken } from '../auth/entities/verification-token.entity';
import { Channel } from '../channels/entities/channel.entity';
import { CommentNotFoundException } from '../common/exceptions/domain.exception';
import {
  cleanAllTables,
  createTestDataSource,
} from '../test/create-test-data-source';
import { User } from '../users/entities/user.entity';
import { CommentReactionService } from './comment-reaction.service';
import { Comment } from './entities/comment.entity';
import { CommentReaction } from './entities/comment-reaction.entity';
import { Video, VideoStatus, VideoVisibility } from './entities/video.entity';
import { ReactionType } from './entities/video-reaction.entity';

const ALL_ENTITIES = [
  User,
  Channel,
  RefreshToken,
  VerificationToken,
  Video,
  Comment,
  CommentReaction,
];

describe('CommentReactionService (integration)', () => {
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let channelRepository: Repository<Channel>;
  let videoRepository: Repository<Video>;
  let commentRepository: Repository<Comment>;
  let commentReactionRepository: Repository<CommentReaction>;
  let service: CommentReactionService;

  beforeAll(async () => {
    dataSource = createTestDataSource(ALL_ENTITIES);
    await dataSource.initialize();
    userRepository = dataSource.getRepository(User);
    channelRepository = dataSource.getRepository(Channel);
    videoRepository = dataSource.getRepository(Video);
    commentRepository = dataSource.getRepository(Comment);
    commentReactionRepository = dataSource.getRepository(CommentReaction);

    service = new CommentReactionService(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await cleanAllTables(dataSource);
  });

  let counter = 0;
  async function createUser(): Promise<User> {
    const n = ++counter;
    return userRepository.save(
      userRepository.create({
        email: `comment_reaction_svc_user_${n}@example.com`,
        password: 'hashed',
      }),
    );
  }

  async function createComment(): Promise<Comment> {
    const n = ++counter;
    const owner = await createUser();
    const channel = await channelRepository.save(
      channelRepository.create({
        name: `Channel ${n}`,
        nickname: `creactsvcchan${n}`,
        user_id: owner.id,
      }),
    );
    const video = await videoRepository.save(
      videoRepository.create({
        user_id: owner.id,
        channel_id: channel.id,
        storage_key: `videos/creact-svc-${n}.mp4`,
        status: VideoStatus.READY,
        visibility: VideoVisibility.PUBLIC,
        published_at: new Date(),
      }),
    );
    const author = await createUser();
    return commentRepository.save(
      commentRepository.create({
        video_id: video.id,
        user_id: author.id,
        body: `Comment ${n}`,
      }),
    );
  }

  it('increments likes_count when a new like is set', async () => {
    const user = await createUser();
    const comment = await createComment();

    const result = await service.setReaction(
      user.id,
      comment.id,
      ReactionType.LIKE,
    );

    expect(result).toEqual({
      type: ReactionType.LIKE,
      likesCount: 1,
      dislikesCount: 0,
    });
    const reloaded = await commentRepository.findOneByOrFail({
      id: comment.id,
    });
    expect(reloaded.likes_count).toBe(1);
  });

  it('is idempotent when the same reaction is set twice sequentially', async () => {
    const user = await createUser();
    const comment = await createComment();

    await service.setReaction(user.id, comment.id, ReactionType.LIKE);
    const result = await service.setReaction(
      user.id,
      comment.id,
      ReactionType.LIKE,
    );

    expect(result.likesCount).toBe(1);
    const count = await commentReactionRepository.count({
      where: { user_id: user.id, comment_id: comment.id },
    });
    expect(count).toBe(1);
  });

  it('flips like to dislike, moving both counters in one step', async () => {
    const user = await createUser();
    const comment = await createComment();
    await service.setReaction(user.id, comment.id, ReactionType.LIKE);

    const result = await service.setReaction(
      user.id,
      comment.id,
      ReactionType.DISLIKE,
    );

    expect(result).toEqual({
      type: ReactionType.DISLIKE,
      likesCount: 0,
      dislikesCount: 1,
    });
  });

  it('removes the reaction and decrements the counter when type is null', async () => {
    const user = await createUser();
    const comment = await createComment();
    await service.setReaction(user.id, comment.id, ReactionType.LIKE);

    const result = await service.setReaction(user.id, comment.id, null);

    expect(result).toEqual({
      type: null,
      likesCount: 0,
      dislikesCount: 0,
    });
    const count = await commentReactionRepository.count({
      where: { user_id: user.id, comment_id: comment.id },
    });
    expect(count).toBe(0);
  });

  it('never creates more than one reaction row under concurrent identical requests', async () => {
    const user = await createUser();
    const comment = await createComment();

    await Promise.all([
      service.setReaction(user.id, comment.id, ReactionType.LIKE),
      service.setReaction(user.id, comment.id, ReactionType.LIKE),
    ]);

    const count = await commentReactionRepository.count({
      where: { user_id: user.id, comment_id: comment.id },
    });
    expect(count).toBe(1);
    const reloaded = await commentRepository.findOneByOrFail({
      id: comment.id,
    });
    expect(reloaded.likes_count).toBe(1);
  });

  it('enforces the unique (user_id, comment_id) constraint under concurrent differing requests', async () => {
    const user = await createUser();
    const comment = await createComment();

    await Promise.all([
      service.setReaction(user.id, comment.id, ReactionType.LIKE),
      service.setReaction(user.id, comment.id, ReactionType.DISLIKE),
    ]);

    const reactions = await commentReactionRepository.find({
      where: { user_id: user.id, comment_id: comment.id },
    });
    expect(reactions).toHaveLength(1);

    const reloaded = await commentRepository.findOneByOrFail({
      id: comment.id,
    });
    const finalType = reactions[0].type;
    if (finalType === ReactionType.LIKE) {
      expect(reloaded.likes_count).toBe(1);
      expect(reloaded.dislikes_count).toBe(0);
    } else {
      expect(reloaded.likes_count).toBe(0);
      expect(reloaded.dislikes_count).toBe(1);
    }
  });

  it('throws CommentNotFoundException for a commentId that does not exist', async () => {
    const user = await createUser();

    await expect(
      service.setReaction(
        user.id,
        '00000000-0000-0000-0000-000000000000',
        ReactionType.LIKE,
      ),
    ).rejects.toThrow(CommentNotFoundException);
  });

  it('throws CommentNotFoundException for a commentId that is not a valid UUID', async () => {
    const user = await createUser();

    await expect(
      service.setReaction(user.id, 'not-a-uuid', ReactionType.LIKE),
    ).rejects.toThrow(CommentNotFoundException);
  });
});
