import { DataSource, Repository } from 'typeorm';
import { Channel } from '../../channels/entities/channel.entity';
import {
  cleanAllTables,
  createTestDataSource,
  ALL_APP_ENTITIES,
} from '../../test/create-test-data-source';
import { User } from '../../users/entities/user.entity';
import { Comment } from './comment.entity';
import { Video } from './video.entity';

describe('Comment entity (integration)', () => {
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let channelRepository: Repository<Channel>;
  let videoRepository: Repository<Video>;
  let commentRepository: Repository<Comment>;

  beforeAll(async () => {
    dataSource = createTestDataSource(ALL_APP_ENTITIES);
    await dataSource.initialize();
    userRepository = dataSource.getRepository(User);
    channelRepository = dataSource.getRepository(Channel);
    videoRepository = dataSource.getRepository(Video);
    commentRepository = dataSource.getRepository(Comment);
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
        email: `comment_user_${n}@example.com`,
        password: 'hashed',
      }),
    );
  }

  async function createVideo(): Promise<Video> {
    const n = ++counter;
    const owner = await createUser();
    const channel = await channelRepository.save(
      channelRepository.create({
        name: `Channel ${n}`,
        nickname: `commentchan${n}`,
        user_id: owner.id,
      }),
    );
    return videoRepository.save(
      videoRepository.create({
        user_id: owner.id,
        channel_id: channel.id,
        storage_key: `videos/comment-entity-${n}.mp4`,
      }),
    );
  }

  it('should default likes_count and dislikes_count to 0', async () => {
    const video = await createVideo();
    const user = await createUser();

    const comment = await commentRepository.save(
      commentRepository.create({
        video_id: video.id,
        user_id: user.id,
        body: 'A top-level comment',
      }),
    );

    expect(comment.likes_count).toBe(0);
    expect(comment.dislikes_count).toBe(0);
  });

  it('should default parent_comment_id to null for a top-level comment', async () => {
    const video = await createVideo();
    const user = await createUser();

    const comment = await commentRepository.save(
      commentRepository.create({
        video_id: video.id,
        user_id: user.id,
        body: 'A top-level comment',
      }),
    );

    expect(comment.parent_comment_id).toBeNull();
  });

  it('should persist a reply referencing its parent via parent_comment_id', async () => {
    const video = await createVideo();
    const author = await createUser();
    const replier = await createUser();

    const parent = await commentRepository.save(
      commentRepository.create({
        video_id: video.id,
        user_id: author.id,
        body: 'Parent comment',
      }),
    );
    const reply = await commentRepository.save(
      commentRepository.create({
        video_id: video.id,
        user_id: replier.id,
        parent_comment_id: parent.id,
        body: 'A reply',
      }),
    );

    expect(reply.parent_comment_id).toBe(parent.id);
  });

  it('should reject insert with a non-existent parent_comment_id (FK violation)', async () => {
    const video = await createVideo();
    const user = await createUser();

    await expect(
      commentRepository.save(
        commentRepository.create({
          video_id: video.id,
          user_id: user.id,
          parent_comment_id: '00000000-0000-0000-0000-000000000000',
          body: 'Orphan reply',
        }),
      ),
    ).rejects.toThrow();
  });

  it('should reject insert with a non-existent video_id (FK violation)', async () => {
    const user = await createUser();

    await expect(
      commentRepository.save(
        commentRepository.create({
          video_id: '00000000-0000-0000-0000-000000000000',
          user_id: user.id,
          body: 'Orphan comment',
        }),
      ),
    ).rejects.toThrow();
  });

  it('should load the related video, user, and parent_comment via the ManyToOne relations', async () => {
    const video = await createVideo();
    const author = await createUser();
    const replier = await createUser();
    const parent = await commentRepository.save(
      commentRepository.create({
        video_id: video.id,
        user_id: author.id,
        body: 'Parent comment',
      }),
    );
    const reply = await commentRepository.save(
      commentRepository.create({
        video_id: video.id,
        user_id: replier.id,
        parent_comment_id: parent.id,
        body: 'A reply',
      }),
    );

    const found = await commentRepository.findOne({
      where: { id: reply.id },
      relations: ['video', 'user', 'parent_comment'],
    });

    expect(found?.video.storage_key).toBe(video.storage_key);
    expect(found?.user.email).toBe(replier.email);
    expect(found?.parent_comment?.id).toBe(parent.id);
  });
});
