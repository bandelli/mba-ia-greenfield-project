import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSocialInteractions1789446191608 implements MigrationInterface {
  name = 'AddSocialInteractions1789446191608';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."video_reactions_type_enum" AS ENUM('like', 'dislike')`,
    );
    await queryRunner.query(
      `CREATE TABLE "video_reactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "video_id" uuid NOT NULL, "type" "public"."video_reactions_type_enum" NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4f5839694e82592bb3753d8894a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_3dd378126c2292642543ab79ae" ON "video_reactions" ("user_id", "video_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "comments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "video_id" uuid NOT NULL, "user_id" uuid NOT NULL, "parent_comment_id" uuid, "body" text NOT NULL, "likes_count" integer NOT NULL DEFAULT '0', "dislikes_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8bf68bc960f2b69e818bdb90dcb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_121627628a5cf3e84d7f4a4fe9" ON "comments" ("video_id", "parent_comment_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."comment_reactions_type_enum" AS ENUM('like', 'dislike')`,
    );
    await queryRunner.query(
      `CREATE TABLE "comment_reactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "comment_id" uuid NOT NULL, "type" "public"."comment_reactions_type_enum" NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d10c03282d5280fe55f0bb67563" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_a883c2a09d16ce1d0db8b9758d" ON "comment_reactions" ("user_id", "comment_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "subscriber_user_id" uuid NOT NULL, "channel_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_49df83134e2c0b755868bd7026" ON "subscriptions" ("subscriber_user_id", "channel_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "channels" ADD "subscribers_count" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ADD "likes_count" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ADD "dislikes_count" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ADD "comments_count" integer NOT NULL DEFAULT '0'`,
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
    await queryRunner.query(
      `ALTER TABLE "video_reactions" ADD CONSTRAINT "FK_b260ec9a671397dc435249c040c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "video_reactions" ADD CONSTRAINT "FK_119b9e05b9aa06fda68e5a81001" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ADD CONSTRAINT "FK_0528681f0d2c6e89116dd3eb3f4" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ADD CONSTRAINT "FK_4c675567d2a58f0b07cef09c13d" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ADD CONSTRAINT "FK_93ce08bdbea73c0c7ee673ec35a" FOREIGN KEY ("parent_comment_id") REFERENCES "comments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment_reactions" ADD CONSTRAINT "FK_481c40600b2ee590adb27abb0e6" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment_reactions" ADD CONSTRAINT "FK_dc714054fc62b698018fcb0ae37" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_a17a1f29bf34ff3d8372aa7df40" FOREIGN KEY ("subscriber_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_f94727d15ad613cd0e651ce299c" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_f94727d15ad613cd0e651ce299c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_a17a1f29bf34ff3d8372aa7df40"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment_reactions" DROP CONSTRAINT "FK_dc714054fc62b698018fcb0ae37"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment_reactions" DROP CONSTRAINT "FK_481c40600b2ee590adb27abb0e6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" DROP CONSTRAINT "FK_93ce08bdbea73c0c7ee673ec35a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" DROP CONSTRAINT "FK_4c675567d2a58f0b07cef09c13d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" DROP CONSTRAINT "FK_0528681f0d2c6e89116dd3eb3f4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "video_reactions" DROP CONSTRAINT "FK_119b9e05b9aa06fda68e5a81001"`,
    );
    await queryRunner.query(
      `ALTER TABLE "video_reactions" DROP CONSTRAINT "FK_b260ec9a671397dc435249c040c"`,
    );
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
    await queryRunner.query(
      `ALTER TABLE "videos" DROP COLUMN "comments_count"`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" DROP COLUMN "dislikes_count"`,
    );
    await queryRunner.query(`ALTER TABLE "videos" DROP COLUMN "likes_count"`);
    await queryRunner.query(
      `ALTER TABLE "channels" DROP COLUMN "subscribers_count"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_49df83134e2c0b755868bd7026"`,
    );
    await queryRunner.query(`DROP TABLE "subscriptions"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a883c2a09d16ce1d0db8b9758d"`,
    );
    await queryRunner.query(`DROP TABLE "comment_reactions"`);
    await queryRunner.query(`DROP TYPE "public"."comment_reactions_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_121627628a5cf3e84d7f4a4fe9"`,
    );
    await queryRunner.query(`DROP TABLE "comments"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3dd378126c2292642543ab79ae"`,
    );
    await queryRunner.query(`DROP TABLE "video_reactions"`);
    await queryRunner.query(`DROP TYPE "public"."video_reactions_type_enum"`);
  }
}
