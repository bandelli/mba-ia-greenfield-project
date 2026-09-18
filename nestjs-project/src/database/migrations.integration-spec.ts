import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Channel } from '../channels/entities/channel.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { VerificationToken } from '../auth/entities/verification-token.entity';
import { CreateUsersAndChannels1775687773260 } from './migrations/1775687773260-CreateUsersAndChannels';
import { CreateAuthTokens1777579850478 } from './migrations/1777579850478-CreateAuthTokens';
import { AddSearchTrigramIndexes1789612694674 } from './migrations/1789612694674-AddSearchTrigramIndexes';
import {
  createTestDataSource,
  ALL_APP_ENTITIES,
} from '../test/create-test-data-source';

const MANAGED_TABLES = [
  'users',
  'channels',
  'refresh_tokens',
  'verification_tokens',
];

// This suite's beforeAll drops and recreates
// `users`/`channels`/`refresh_tokens`/`verification_tokens` using only the
// first 2 migrations (to test runMigrations()/undoLastMigration() mechanics
// in isolation) — intentionally narrower than the DB's real current shape,
// since later phases added columns/tables to those same entities via
// `synchronize: true` without ever being captured by a tracked migration
// (the project's documented "synchronize residue" —
// .claude/rules/typeorm-migrations.md). Without the full resync in afterAll
// below (using the shared `ALL_APP_ENTITIES`), every such column/constraint
// would be silently wiped on every full test-suite run: this is exactly what
// happened to `channels.subscribers_count` and every FK pointing at
// `channels`/`users` during phase-06-social-interactions/SI-06.2 —
// discovered when a full `npm test` run made the e2e suite fail immediately
// afterward.

describe('Database migrations (integration)', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = createTestDataSource(
      [User, Channel, RefreshToken, VerificationToken],
      {
        synchronize: false,
        migrations: [
          CreateUsersAndChannels1775687773260,
          CreateAuthTokens1777579850478,
        ],
      },
    );

    await dataSource.initialize();

    await Promise.all([
      ...MANAGED_TABLES.map((table) =>
        dataSource.query(`DROP TABLE IF EXISTS "${table}" CASCADE`),
      ),
      dataSource.query(`DROP TABLE IF EXISTS "migrations" CASCADE`),
    ]);
    // Dropping the table does not drop the enum type CreateAuthTokens
    // creates for it — leftover from any prior real migration run against
    // this shared dev DB (per .claude/rules/typeorm-migrations.md's
    // "Recovering from synchronize residue"). Drop it too so runMigrations()
    // below can recreate it from scratch without a "type already exists" error.
    await dataSource.query(
      `DROP TYPE IF EXISTS "public"."verification_tokens_type_enum"`,
    );
  });

  afterAll(async () => {
    // The second test undoes the last migration, leaving token tables missing.
    // Re-apply so the shared DB is fully migrated when subsequent suites run.
    await dataSource.runMigrations();

    // Whatever suite ran immediately before this one (Jest's file order is
    // alphabetical, not dependency-aware) may have left rows in these child
    // tables referencing the `users`/`channels` rows just dropped-and-
    // recreated above. The resync below re-adds FK constraints from
    // `videos` to `users`/`channels` (matching the real entity relations),
    // which would fail on any such now-dangling row — clear them first,
    // the same ephemeral-data assumption every integration-spec.ts's own
    // `cleanAllTables()` already relies on for this shared dev DB.
    await dataSource.query('DELETE FROM "video_reactions"');
    await dataSource.query('DELETE FROM "comment_reactions"');
    await dataSource.query('DELETE FROM "comments"');
    await dataSource.query('DELETE FROM "subscriptions"');
    await dataSource.query('DELETE FROM "videos"');

    await dataSource.destroy();

    // Restore every column/constraint the real dev DB carries beyond these
    // 2 tracked migrations (see ALL_APP_ENTITIES comment above) — a
    // synchronize:true sweep across the full current entity set, same
    // mechanism every other integration-spec.ts in this codebase already
    // relies on to keep the shared dev DB's schema current.
    const resyncDataSource = createTestDataSource(ALL_APP_ENTITIES);
    await resyncDataSource.initialize();
    await resyncDataSource.destroy();
  });

  it('should apply all migrations and create all four tables', async () => {
    const ranMigrations = await dataSource.runMigrations();

    expect(ranMigrations).toHaveLength(2);

    const result = await dataSource.query<{ table_name: string }[]>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = ANY($1::text[])
       ORDER BY table_name`,
      [MANAGED_TABLES],
    );
    const tableNames = result.map((r) => r.table_name);
    expect(tableNames).toEqual([
      'channels',
      'refresh_tokens',
      'users',
      'verification_tokens',
    ]);
  });

  it('should revert the last migration and remove token tables', async () => {
    await dataSource.undoLastMigration();

    const result = await dataSource.query<{ table_name: string }[]>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = ANY($1::text[])`,
      [['refresh_tokens', 'verification_tokens']],
    );
    expect(result).toHaveLength(0);
  });
});

// Scoped narrowly to this one migration's up()/down() queries against the
// real dev DB's current schema — does NOT replay the full migration history
// (per the file-level comment above, that mechanism is reserved for the
// first-2-migrations mechanics test; every later migration's schema is
// covered by the ALL_APP_ENTITIES resync instead). AddSearchTrigramIndexes
// adds no entity/column (only a Postgres extension + 3 index-only DDL
// statements), so it is invisible to that synchronize-based resync and
// needs its own direct exercise of up()/down().
describe('AddSearchTrigramIndexes1789612694674 (integration)', () => {
  let dataSource: DataSource;
  const migration = new AddSearchTrigramIndexes1789612694674();

  beforeAll(async () => {
    dataSource = createTestDataSource([], { synchronize: false });
    await dataSource.initialize();
  });

  afterAll(async () => {
    // Restore the indexes for the rest of the suite/app — this migration
    // is expected to stay applied on the shared dev DB.
    const queryRunner = dataSource.createQueryRunner();
    await migration.up(queryRunner);
    await queryRunner.release();
    await dataSource.destroy();
  });

  async function trigramIndexNames(): Promise<string[]> {
    const rows = await dataSource.query<{ indexname: string }[]>(
      `SELECT indexname FROM pg_indexes WHERE indexname ILIKE '%trgm%' ORDER BY indexname`,
    );
    return rows.map((r) => r.indexname);
  }

  it('creates the pg_trgm extension and the 3 trigram indexes', async () => {
    const queryRunner = dataSource.createQueryRunner();
    await migration.up(queryRunner);
    await queryRunner.release();

    const [{ extname }] = await dataSource.query<{ extname: string }[]>(
      `SELECT extname FROM pg_extension WHERE extname = 'pg_trgm'`,
    );
    expect(extname).toBe('pg_trgm');
    expect(await trigramIndexNames()).toEqual([
      'IDX_channels_name_trgm',
      'IDX_channels_nickname_trgm',
      'IDX_videos_title_trgm',
    ]);
  });

  it('down() removes the 3 trigram indexes without dropping the shared pg_trgm extension', async () => {
    const queryRunner = dataSource.createQueryRunner();
    await migration.down(queryRunner);
    await queryRunner.release();

    expect(await trigramIndexNames()).toEqual([]);

    const extensions = await dataSource.query<{ extname: string }[]>(
      `SELECT extname FROM pg_extension WHERE extname = 'pg_trgm'`,
    );
    expect(extensions).toHaveLength(1);
  });
});
