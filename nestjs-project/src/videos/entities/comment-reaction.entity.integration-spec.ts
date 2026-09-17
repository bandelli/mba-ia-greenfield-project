import { DataSource, Repository } from 'typeorm';
import { Channel } from '../../channels/entities/channel.entity';
import {
  cleanAllTables,
  createTestDataSource,
  ALL_APP_ENTITIES,
} from '../../test/create-test-data-source';
import { User } from '../../users/entities/user.entity';
import { Comment } from './comment.entity';
import { CommentReaction } from './comment-reaction.entity';
import { Video } from './video.entity';
import { ReactionType } from './video-reaction.entity';

describe('CommentReaction entity (integration)', () => {
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let channelRepository: Repository<Channel>;
  let videoRepository: Repository<Video>;
  let commentRepository: Repository<Comment>;
  let commentReactionRepository: Repository<CommentReaction>;

  beforeAll(async () => {
    dataSource = createTestDataSource(ALL_APP_ENTITIES);
    await dataSource.initialize();
    userRepository = dataSource.getRepository(User);
    channelRepository = dataSource.getRepository(Channel);
    videoRepository = dataSource.getRepository(Video);
    commentRepository = dataSource.getRepository(Comment);
    commentReactionRepository = dataSource.getRepository(CommentReaction);
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
        email: `comment_reaction_user_${n}@example.com`,
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
        nickname: `creactchan${n}`,
        user_id: owner.id,
      }),
    );
    const video = await videoRepository.save(
      videoRepository.create({
        user_id: owner.id,
        channel_id: channel.id,
        storage_key: `videos/comment-reaction-${n}.mp4`,
      }),
    );
    const commenter = await createUser();
    return commentRepository.save(
      commentRepository.create({
        video_id: video.id,
        user_id: commenter.id,
        body: `Comment ${n}`,
      }),
    );
  }

  it('should persist a reaction with the given type', async () => {
    const user = await createUser();
    const comment = await createComment();

    const reaction = await commentReactionRepository.save(
      commentReactionRepository.create({
        user_id: user.id,
        comment_id: comment.id,
        type: ReactionType.DISLIKE,
      }),
    );

    expect(reaction.id).toBeTruthy();
    expect(reaction.type).toBe(ReactionType.DISLIKE);
  });

  it('should enforce unique (user_id, comment_id) constraint', async () => {
    const user = await createUser();
    const comment = await createComment();

    await commentReactionRepository.save(
      commentReactionRepository.create({
        user_id: user.id,
        comment_id: comment.id,
        type: ReactionType.LIKE,
      }),
    );

    await expect(
      commentReactionRepository.save(
        commentReactionRepository.create({
          user_id: user.id,
          comment_id: comment.id,
          type: ReactionType.DISLIKE,
        }),
      ),
    ).rejects.toThrow();
  });

  it('should reject insert with a non-existent user_id (FK violation)', async () => {
    const comment = await createComment();

    await expect(
      commentReactionRepository.save(
        commentReactionRepository.create({
          user_id: '00000000-0000-0000-0000-000000000000',
          comment_id: comment.id,
          type: ReactionType.LIKE,
        }),
      ),
    ).rejects.toThrow();
  });

  it('should reject insert with a non-existent comment_id (FK violation)', async () => {
    const user = await createUser();

    await expect(
      commentReactionRepository.save(
        commentReactionRepository.create({
          user_id: user.id,
          comment_id: '00000000-0000-0000-0000-000000000000',
          type: ReactionType.LIKE,
        }),
      ),
    ).rejects.toThrow();
  });

  it('should load the related user and comment via the ManyToOne relations', async () => {
    const user = await createUser();
    const comment = await createComment();
    const reaction = await commentReactionRepository.save(
      commentReactionRepository.create({
        user_id: user.id,
        comment_id: comment.id,
        type: ReactionType.LIKE,
      }),
    );

    const found = await commentReactionRepository.findOne({
      where: { id: reaction.id },
      relations: ['user', 'comment'],
    });

    expect(found?.user.email).toBe(user.email);
    expect(found?.comment.body).toBe(comment.body);
  });
});
