import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVideoMetadataFields1788994045571 implements MigrationInterface {
  name = 'AddVideoMetadataFields1788994045571';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "videos" ADD "duration_seconds" double precision`,
    );
    await queryRunner.query(`ALTER TABLE "videos" ADD "metadata" jsonb`);
    await queryRunner.query(
      `ALTER TYPE "public"."videos_status_enum" RENAME TO "videos_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."videos_status_enum" AS ENUM('draft', 'processing', 'ready', 'error')`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ALTER COLUMN "status" TYPE "public"."videos_status_enum" USING "status"::"text"::"public"."videos_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ALTER COLUMN "status" SET DEFAULT 'draft'`,
    );
    await queryRunner.query(`DROP TYPE "public"."videos_status_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."videos_status_enum_old" AS ENUM('draft', 'processing', 'ready', 'error')`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ALTER COLUMN "status" TYPE "public"."videos_status_enum_old" USING "status"::"text"::"public"."videos_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ALTER COLUMN "status" SET DEFAULT 'draft'`,
    );
    await queryRunner.query(`DROP TYPE "public"."videos_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."videos_status_enum_old" RENAME TO "videos_status_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "videos" DROP COLUMN "metadata"`);
    await queryRunner.query(
      `ALTER TABLE "videos" DROP COLUMN "duration_seconds"`,
    );
  }
}
