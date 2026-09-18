import { join } from "path"
import type { APIRequestContext, Page } from "@playwright/test"
import { expect, test } from "@playwright/test"

// FULL-STACK JOURNEY — home-search-launch/TD-06 (main-flow #2: upload real →
// publicar → assistir). Runs against the REAL stack (real nestjs-api, real
// Postgres, real Mailpit, real video-worker) — see
// tests/full-stack/signup-to-login.e2e-spec.ts's header comment for why this
// directory is excluded from the regular MSW-based Playwright run.
//
// Fixture: a tiny (~8KB, 1s) synthetic .mp4 committed at
// fixtures/tiny-video.mp4 (generated via `ffmpeg -f lavfi -i
// testsrc=duration=1:size=320x240:rate=15`) rather than generated at
// CI-run time — Playwright runs on the runner HOST here (never inside a
// container — see playwright.config.ts's header comment), which has no
// guaranteed `ffmpeg`, unlike nestjs-api's own container.
const MAILPIT_URL = "http://localhost:8025"
const FIXTURE_PATH = join(__dirname, "fixtures", "tiny-video.mp4")

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
  await page.getByLabel("Full Name").fill("Upload Journey")
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

// The video-worker processes the upload asynchronously (real ffprobe +
// thumbnail extraction via the video.uploaded pg-boss job) — publish
// requires status === 'ready' (VideoNotReadyException otherwise), so this
// polls the edit page (reloading it — it's a Server Component, no live
// data) until the worker flips it, mirroring findConfirmationLink's
// Mailpit-poll shape above.
async function waitUntilReady(page: Page, editUrl: string): Promise<void> {
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    await page.goto(editUrl)
    const status = await page.getByTestId("video-status").textContent()
    if (status === "ready") return
    if (status === "error") {
      throw new Error(`Video processing failed (status: error) at ${editUrl}`)
    }
    await sleep(1000)
  }
  throw new Error(`Video did not reach 'ready' before the deadline (${editUrl})`)
}

test.describe("upload-to-watch (full-stack)", () => {
  test("2.1 upload-real-publicar-e-assistir", async ({ page, request }) => {
    const email = `e2e-fullstack-upload-${Date.now()}@example.com`
    await signupConfirmLogin(page, request, email, "Password1")

    await page.goto("/dashboard/videos/upload")
    await page.getByLabel("Video file").setInputFiles(FIXTURE_PATH)

    await expect(page).toHaveURL(/\/dashboard\/videos\/.+\/edit/)
    const editUrl = page.url()

    await waitUntilReady(page, editUrl)

    const title = `E2E Upload Journey Video (${Date.now()})`
    await page.getByLabel("Title (required)").fill(title)
    await page.getByRole("button", { name: "Publish" }).click()
    // On success, VideoEditForm's submitVideo("publish") navigates to
    // /dashboard/videos (no "Saved" confirmation — that's the draft-only
    // path) — see components/video/video-edit-form.tsx.
    await expect(page).toHaveURL(/\/dashboard\/videos$/)

    const publicId = editUrl.match(/\/dashboard\/videos\/(.+)\/edit/)?.[1]
    await page.goto(`/watch/${publicId}`)
    await expect(page.getByRole("heading", { name: title })).toBeVisible()
  })
})
