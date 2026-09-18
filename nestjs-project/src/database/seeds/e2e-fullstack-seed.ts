// One-off seed for SI-07.7's full-stack Playwright pass: creates a single
// real, READY/PUBLIC video (owned by a dedicated, never-logged-in channel)
// so the search→watch and social-interactions journey specs have something
// real to find/watch/comment-on/like/subscribe-to. This is NOT the app's
// upload flow (that UI doesn't exist yet — see phase-07-home-search-launch
// progress.md's SI-07.7 entry) — it's a direct-repository insert, the same
// pattern `nestjs-project`'s own e2e specs already use via their `createVideo`
// test helpers (e.g. `test/video-public-listing.e2e-spec.ts`).
//
// Idempotent: safe to re-run against a DB that already has this row (skips
// instead of erroring on the unique nickname), which matters for local
// verification against a persistent dev DB — CI's fresh-per-run Postgres
// never hits the skip path.
import { AppDataSource } from '../data-source';
import { User } from '../../users/entities/user.entity';
import { Channel } from '../../channels/entities/channel.entity';
import {
  Video,
  VideoCategory,
  VideoStatus,
  VideoVisibility,
} from '../../videos/entities/video.entity';

export const E2E_SEED_CHANNEL_NICKNAME = 'e2e-fullstack-seed-channel';
export const E2E_SEED_VIDEO_TITLE = 'E2E Fullstack Seed Video';

async function runSeed(): Promise<void> {
  await AppDataSource.initialize();

  const channelRepository = AppDataSource.getRepository(Channel);
  const existing = await channelRepository.findOneBy({
    nickname: E2E_SEED_CHANNEL_NICKNAME,
  });
  if (existing) {
    console.log('E2E fullstack seed already present — skipping.');
    await AppDataSource.destroy();
    return;
  }

  const userRepository = AppDataSource.getRepository(User);
  const videoRepository = AppDataSource.getRepository(Video);

  const user = await userRepository.save(
    userRepository.create({
      email: 'e2e-fullstack-seed-owner@example.com',
      // Never logged into by any test — placeholder, not a real bcrypt hash.
      password: 'not-a-real-hash-this-account-never-logs-in',
      is_confirmed: true,
    }),
  );

  const channel = await channelRepository.save(
    channelRepository.create({
      name: 'E2E Fullstack Seed Channel',
      nickname: E2E_SEED_CHANNEL_NICKNAME,
      user_id: user.id,
    }),
  );

  await videoRepository.save(
    videoRepository.create({
      user_id: user.id,
      channel_id: channel.id,
      storage_key: 'videos/e2e-fullstack-seed.mp4',
      status: VideoStatus.READY,
      visibility: VideoVisibility.PUBLIC,
      title: E2E_SEED_VIDEO_TITLE,
      category: VideoCategory.TECHNOLOGY,
      duration_seconds: 42,
      views: 0,
      published_at: new Date(),
    }),
  );

  console.log('E2E fullstack seed created.');
  await AppDataSource.destroy();
}

runSeed().catch((error: unknown) => {
  console.error('E2E fullstack seed failed:', error);
  process.exit(1);
});
