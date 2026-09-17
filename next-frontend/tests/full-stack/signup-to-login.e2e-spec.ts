import type { APIRequestContext } from "@playwright/test"
import { expect, test } from "@playwright/test"

// FULL-STACK JOURNEY — home-search-launch/TD-06 (main-flow #1: cadastro →
// confirmação → login). Runs against the REAL stack, not MSW:
//   - next-frontend dev server started WITHOUT MSW_ENABLED (real Route
//     Handlers hit the real nestjs-api).
//   - Confirmation email is captured by a real Mailpit instance; this spec
//     reads it back via Mailpit's REST API (http://localhost:8025/api/v1)
//     and follows the real confirmation link — no fixture/trigger shortcut.
// This file lives in tests/full-stack/ specifically so the regular
// (MSW-based) `npx playwright test` run does NOT pick it up — see
// playwright.config.ts's testIgnore and playwright.fullstack.config.ts.
const MAILPIT_URL = "http://localhost:8025"

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

// Polls Mailpit's message list until the real confirmation email for `email`
// shows up (MailService really sends it via SMTP — no fixture shortcut),
// then fetches its body and extracts the real confirm-email link.
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

test.describe("signup-to-login (full-stack)", () => {
  test("1.1 cadastro-confirmacao-real-via-mailpit-e-login", async ({
    page,
    request,
  }) => {
    const email = `e2e-fullstack-signup-${Date.now()}@example.com`
    const password = "Password1"

    await page.goto("/signup")
    await page.getByLabel("Full Name").fill("Fullstack Journey")
    await page.getByLabel("Email address").fill(email)
    await page.getByLabel("Password", { exact: true }).fill(password)
    await page.getByLabel("Confirm Password").fill(password)
    await page.getByRole("checkbox").check()
    await page.getByRole("button", { name: "Create account" }).click()

    await expect(page.getByRole("status")).toContainText("Conta criada!")

    const confirmUrl = await findConfirmationLink(request, email)
    const confirmResponse = await request.get(confirmUrl)
    expect(confirmResponse.status()).toBe(204)

    // Real login — no MSW trigger email, this account genuinely exists now.
    // The login page has no post-login redirect of its own (LoginForm only
    // calls router.refresh(), never router.push()) — every other spec in
    // this project's suite follows the same pattern of navigating away
    // manually after the login response settles, rather than asserting an
    // automatic redirect that doesn't exist.
    await page.goto("/login")
    await page.getByLabel("Email address").fill(email)
    await page.getByLabel("Password", { exact: true }).fill(password)
    const loginResponse = page.waitForResponse(
      (r) => r.url().includes("/api/auth/login") && r.request().method() === "POST"
    )
    await page.getByRole("button", { name: "Sign in" }).click()
    await loginResponse

    const cookies = await page.context().cookies()
    expect(cookies.some((c) => c.name.includes("session"))).toBe(true)

    await page.goto("/")
    await expect(page.getByRole("button", { name: "Open account menu" })).toBeVisible()
  })
})
