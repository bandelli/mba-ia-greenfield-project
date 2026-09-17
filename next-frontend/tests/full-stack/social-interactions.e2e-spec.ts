import type { APIRequestContext, Page } from "@playwright/test"
import { expect, test } from "@playwright/test"

// FULL-STACK JOURNEY — home-search-launch/TD-06 (main-flow #3: comentário /
// like / inscrição). Runs against the REAL stack (real nestjs-api, real
// Postgres, real Mailpit) — see tests/full-stack/signup-to-login.e2e-spec.ts's
// header comment for why this directory is excluded from the regular
// MSW-based Playwright run.
//
// Targets the video seeded by `nestjs-project`'s `npm run seed:e2e-fullstack`
// (src/database/seeds/e2e-fullstack-seed.ts). The actor is a freshly,
// genuinely signed-up + confirmed + logged-in user (reuses the same real
// Mailpit-confirmation mechanism as signup-to-login.e2e-spec.ts) — never the
// seed script's own channel owner, which never logs in.
const MAILPIT_URL = "http://localhost:8025"
const SEED_VIDEO_TITLE = "E2E Fullstack Seed Video"
const SEED_CHANNEL_NICKNAME = "e2e-fullstack-seed-channel"

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function findConfirmationLink(
  request: APIRequestContext,
  email: string
): Promise<string> {
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    const res = await request.get(`${MAILPIT_URL}/api/v1/messages`)
    const body = (await res.json()) as {
      messages: { ID: string; To: { Address: string }[] }[]
    }
    const found = body.messages.find((m) =>
      m.To.some((to) => to.Address === email)
    )
    if (found) {
      const detailRes = await request.get(
        `${MAILPIT_URL}/api/v1/message/${found.ID}`
      )
      const detail = (await detailRes.json()) as { Text: string }
      const link = detail.Text.match(
        /https?:\/\/\S+\/auth\/confirm-email\?token=\S+?(?=\s|\))/
      )?.[0]
      if (link) return link
      throw new Error("Confirmation link not found in email body")
    }
    await sleep(500)
  }
  throw new Error(`Confirmation email for ${email} never arrived in Mailpit`)
}

async function signupConfirmLogin(
  page: Page,
  request: APIRequestContext,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/signup")
  await page.getByLabel("Full Name").fill("Social Interactions Journey")
  await page.getByLabel("Email address").fill(email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByLabel("Confirm Password").fill(password)
  await page.getByRole("checkbox").check()
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page.getByRole("status")).toContainText("Conta criada!")

  const confirmUrl = await findConfirmationLink(request, email)
  const confirmResponse = await request.get(confirmUrl)
  expect(confirmResponse.status()).toBe(204)

  // The login page has no post-login redirect of its own (LoginForm only
  // calls router.refresh(), never router.push()) — navigate away manually
  // after the login response settles, matching every other spec's pattern.
  await page.goto("/login")
  await page.getByLabel("Email address").fill(email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  const loginResponse = page.waitForResponse(
    (r) => r.url().includes("/api/auth/login") && r.request().method() === "POST"
  )
  await page.getByRole("button", { name: "Sign in" }).click()
  await loginResponse
  await page.goto("/")
}

test.describe("social-interactions (full-stack)", () => {
  test("1.1 comentar-curtir-e-inscrever-se-em-jornada-real", async ({
    page,
    request,
  }) => {
    const email = `e2e-fullstack-social-${Date.now()}@example.com`
    await signupConfirmLogin(page, request, email, "Password1")

    // Navigate to the seeded video via real search (exercises the same
    // BFF-backed search path as search-to-watch.e2e-spec.ts).
    await page.getByRole("searchbox").fill(SEED_VIDEO_TITLE)
    await page.getByRole("button", { name: "Search" }).click()
    await page
      .locator("a")
      .filter({ hasText: SEED_VIDEO_TITLE })
      .first()
      .click()
    await expect(page).toHaveURL(/\/watch\//)

    // Comment
    const commentText = `Great video! (${Date.now()})`
    await page.getByPlaceholder("Add a comment...").fill(commentText)
    await page.getByRole("button", { name: "Comment", exact: true }).click()
    await expect(page.getByText(commentText)).toBeVisible()

    // Like — `exact: true` since a substring match on "Like" would also hit
    // the comment's own "Like comment" reaction button.
    const likeButton = page.getByRole("button", { name: "Like", exact: true })
    await expect(likeButton).toHaveAttribute("aria-pressed", "false")
    await likeButton.click()
    await expect(likeButton).toHaveAttribute("aria-pressed", "true")

    // Subscribe — the real, wired Subscribe action lives on the channel's
    // own public page, not the decorative (onClick-less) button rendered on
    // the watch page's description card (per components/video/description-card.tsx).
    await page.goto(`/channel/${SEED_CHANNEL_NICKNAME}`)
    const subscribeButton = page.getByRole("button", { name: "Subscribe" })
    await subscribeButton.click()
    await expect(page.getByRole("button", { name: "Subscribed" })).toBeVisible()
  })
})
