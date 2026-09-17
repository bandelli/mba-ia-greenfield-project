import { defineConfig, devices } from "@playwright/test"

// Full-stack main-flow journeys (home-search-launch/SI-07.7, TD-06 Option B
// part 2) — real nestjs-api + Postgres + Mailpit, next-frontend's dev server
// started WITHOUT MSW_ENABLED. Separate from playwright.config.ts (which
// explicitly testIgnores this directory) because the two run against
// fundamentally different upstream setups and must never be mixed in one
// `npx playwright test` invocation.
//   docker compose exec -d next-frontend sh -c "npm run dev"   (no MSW_ENABLED)
//   npx playwright test --config=playwright.fullstack.config.ts
export default defineConfig({
  testDir: "./tests/full-stack",
  testMatch: "**/*.e2e-spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "html",
  // Higher than the 5s default: unlike playwright.config.ts's MSW-backed
  // run, this hits a genuinely cold dev server (just restarted for this
  // pass) talking to a real upstream — Turbopack lazily compiles each route
  // on its first real request, and `router.refresh()` after a mutation is a
  // real round trip to the real nestjs-api, not a mocked one.
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
