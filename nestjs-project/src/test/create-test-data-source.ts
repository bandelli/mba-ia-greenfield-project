import { DataSource, EntitySchema, MigrationInterface } from 'typeorm';

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
