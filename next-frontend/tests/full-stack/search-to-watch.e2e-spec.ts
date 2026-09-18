import { expect, test } from "@playwright/test"

// FULL-STACK JOURNEY — home-search-launch/TD-06 (main-flow #4: busca →
// assistir). Runs against the REAL stack (real nestjs-api, real Postgres) —
// see tests/full-stack/signup-to-login.e2e-spec.ts's header comment for why
// this directory is excluded from the regular MSW-based Playwright run.
//
// Finds the video seeded by `nestjs-project`'s `npm run seed:e2e-fullstack`
// (see src/database/seeds/e2e-fullstack-seed.ts) — a real READY/PUBLIC video,
// not an upload-flow product (that UI doesn't exist yet, see this phase's
// progress.md SI-07.7 entry). Anonymous access throughout — no login step.
const SEED_VIDEO_TITLE = "E2E Fullstack Seed Video"
const SEED_CHANNEL_NAME = "E2E Fullstack Seed Channel"

test.describe("search-to-watch (full-stack)", () => {
  test("1.1 buscar-video-real-e-assistir", async ({ page }) => {
    await page.goto("/")

    await page.getByRole("searchbox").fill(SEED_VIDEO_TITLE)
    await page.getByRole("button", { name: "Search" }).click()

    await expect(page).toHaveURL(/\?q=/)
    const resultCard = page.getByRole("heading", { name: SEED_VIDEO_TITLE })
    await expect(resultCard).toBeVisible()

    await page
      .locator("a")
      .filter({ hasText: SEED_VIDEO_TITLE })
      .first()
      .click()

    await expect(page).toHaveURL(/\/watch\//)
    await expect(
      page.getByRole("heading", { name: SEED_VIDEO_TITLE })
    ).toBeVisible()
    await expect(page.getByText(SEED_CHANNEL_NAME)).toBeVisible()
  })
})
