import { MigrationInterface, QueryRunner } from 'typeorm';

// GIN trigram indexes backing the ILIKE-based home feed search (title +
// channel name/nickname) per home-search-launch/TD-01. `pg_trgm` cannot be
// expressed via entity decorators (TypeORM has no opclass support for
// `@Index()`), so this migration is hand-written per typeorm-migrations.md's
// documented exception.
export class AddSearchTrigramIndexes1789612694674 implements MigrationInterface {
  name = 'AddSearchTrigramIndexes1789612694674';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_videos_title_trgm" ON "videos" USING gin ("title" gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_channels_name_trgm" ON "channels" USING gin ("name" gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_channels_nickname_trgm" ON "channels" USING gin ("nickname" gin_trgm_ops)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_channels_nickname_trgm"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_channels_name_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_videos_title_trgm"`);
    // `pg_trgm` extension is intentionally NOT dropped — other migrations
    // may come to depend on it, and dropping a shared extension from a
    // single feature's down() is unsafe.
  }
}
