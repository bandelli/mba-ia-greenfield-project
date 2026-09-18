import { DataSource, EntitySchema, MigrationInterface } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Channel } from '../channels/entities/channel.entity';
import { Subscription } from '../channels/entities/subscription.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { VerificationToken } from '../auth/entities/verification-token.entity';
import { Video } from '../videos/entities/video.entity';
import { VideoReaction } from '../videos/entities/video-reaction.entity';
import { Comment } from '../videos/entities/comment.entity';
import { CommentReaction } from '../videos/entities/comment-reaction.entity';

// Every entity in the app. `cleanAllTables()` below unconditionally deletes
// from all 9 tables regardless of which entities a given integration-spec's
// own DataSource declares — so any test calling `cleanAllTables()` must use
// this full list, not a narrower subset. A per-file subset only creates the
// tables it lists via `synchronize: true`; against a long-lived dev database
// (where every table already exists from prior runs) that mismatch never
// throws, but against a truly fresh database (CI, or a fresh clone) it fails
// with `relation "..." does not exist`.
export const ALL_APP_ENTITIES = [
  User,
  Channel,
  RefreshToken,
  VerificationToken,
  Video,
  VideoReaction,
  Comment,
  CommentReaction,
  Subscription,
];

interface TestDataSourceOptions {
  synchronize?: boolean;
  migrations?: (new () => MigrationInterface)[];
}

export function createTestDataSource(
  entities: ((new (...args: any[]) => any) | string | EntitySchema<any>)[],
  options: TestDataSourceOptions = {},
): DataSource {
  const { synchronize = true, migrations } = options;
  return new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'db',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME ?? 'streamtube',
    password: process.env.DB_PASSWORD ?? 'streamtube',
    database: process.env.DB_DATABASE ?? 'streamtube',
    entities,
    synchronize,
    ...(migrations !== undefined && { migrations, migrationsRun: false }),
  });
}

export async function cleanAllTables(dataSource: DataSource): Promise<void> {
  await dataSource.query('DELETE FROM "refresh_tokens"');
  await dataSource.query('DELETE FROM "verification_tokens"');
  // Social-interactions child tables must be cleared before their parents
  // (videos/comments/channels/users) or the FK constraints reject the
  // parent deletes (per social-interactions/TD-02).
  await dataSource.query('DELETE FROM "subscriptions"');
  await dataSource.query('DELETE FROM "comment_reactions"');
  await dataSource.query('DELETE FROM "video_reactions"');
  await dataSource.query('DELETE FROM "comments"');
  await dataSource.query('DELETE FROM "videos"');
  await dataSource.query('DELETE FROM "channels"');
  await dataSource.query('DELETE FROM "users"');
}
