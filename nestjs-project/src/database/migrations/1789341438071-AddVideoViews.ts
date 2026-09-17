import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVideoViews1789341438071 implements MigrationInterface {
  name = 'AddVideoViews1789341438071';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "videos" ADD "views" integer NOT NULL DEFAULT '0'`,
    );
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
    await queryRunner.query(
      `ALTER TYPE "public"."videos_category_enum" RENAME TO "videos_category_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."videos_category_enum" AS ENUM('education', 'entertainment', 'gaming', 'music', 'news', 'sports', 'technology', 'other')`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ALTER COLUMN "category" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ALTER COLUMN "category" TYPE "public"."videos_category_enum" USING "category"::"text"::"public"."videos_category_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ALTER COLUMN "category" SET DEFAULT 'other'`,
    );
    await queryRunner.query(`DROP TYPE "public"."videos_category_enum_old"`);
    await queryRunner.query(
      `ALTER TYPE "public"."videos_visibility_enum" RENAME TO "videos_visibility_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."videos_visibility_enum" AS ENUM('public', 'unlisted')`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ALTER COLUMN "visibility" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ALTER COLUMN "visibility" TYPE "public"."videos_visibility_enum" USING "visibility"::"text"::"public"."videos_visibility_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ALTER COLUMN "visibility" SET DEFAULT 'public'`,
    );
    await queryRunner.query(`DROP TYPE "public"."videos_visibility_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."videos_visibility_enum_old" AS ENUM('public', 'unlisted')`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ALTER COLUMN "visibility" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ALTER COLUMN "visibility" TYPE "public"."videos_visibility_enum_old" USING "visibility"::"text"::"public"."videos_visibility_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ALTER COLUMN "visibility" SET DEFAULT 'public'`,
    );
    await queryRunner.query(`DROP TYPE "public"."videos_visibility_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."videos_visibility_enum_old" RENAME TO "videos_visibility_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."videos_category_enum_old" AS ENUM('education', 'entertainment', 'gaming', 'music', 'news', 'sports', 'technology', 'other')`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ALTER COLUMN "category" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ALTER COLUMN "category" TYPE "public"."videos_category_enum_old" USING "category"::"text"::"public"."videos_category_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ALTER COLUMN "category" SET DEFAULT 'other'`,
    );
    await queryRunner.query(`DROP TYPE "public"."videos_category_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."videos_category_enum_old" RENAME TO "videos_category_enum"`,
    );
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
    await queryRunner.query(`ALTER TABLE "videos" DROP COLUMN "views"`);
  }
}
