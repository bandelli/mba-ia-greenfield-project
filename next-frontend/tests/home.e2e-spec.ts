import type { Page } from "@playwright/test"

import { expect, test } from "./fixtures"

// Upstream is faked server-side by mocks/ MSW via instrumentation.ts.
// GET /videos/public (mocks/handlers/videos.ts homeFeedFixtures) returns 26
// fixture items: "Building a home page" (technology, Alice), "Relaxing music
// mix" (music, Bob), plus 24 "Bonus video N" filler items (entertainment,
// Alice) — more than app/(main)/page.tsx's DEFAULT_LIMIT of 24, so page 1
// has 24 items and page 2 has the remaining 2, giving a genuine second page
// for the infinite-scroll scenario with no reserved trigger needed (same
// strategy as tests/subscriptions.e2e-spec.ts).
// No page.route() of /api/** — that would short-circuit the real Route Handlers.
test.describe("home", () => {
  // 1. Grade inicial e filtro por categoria

  test("1.1 renderizar-grade-inicial-anonima", async ({ page }) => {
    await page.goto("/")

    await expect(page).toHaveURL(/\/$/)

    const homePageCard = page.locator("a").filter({ hasText: "Building a home page" })
    await expect(homePageCard.getByRole("heading", { name: "Building a home page" })).toBeVisible()
    await expect(homePageCard.getByText("Alice")).toBeVisible()
    await expect(homePageCard.getByText(/4,200 views/)).toBeVisible()

    const musicCard = page.locator("a").filter({ hasText: "Relaxing music mix" })
    await expect(musicCard.getByRole("heading", { name: "Relaxing music mix" })).toBeVisible()
    await expect(musicCard.getByText("Bob")).toBeVisible()
    await expect(musicCard.getByText(/9,800 views/)).toBeVisible()
  })

  test("1.2 filtrar-por-categoria-atualiza-url-e-grade", async ({ page }) => {
    await page.goto("/")

    await page.getByRole("button", { name: "Music", exact: true }).click()

    await expect(page).toHaveURL(/\?category=music$/)
    await expect(page.getByRole("button", { name: "Music", exact: true })).toHaveAttribute(
      "data-active",
      "true"
    )
    await expect(page.getByRole("heading", { name: "Relaxing music mix" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Building a home page" })).not.toBeVisible()
    await expect(page.getByRole("heading", { name: "Bonus video 1" })).not.toBeVisible()
  })

  // 2. Busca

  test("2.1 buscar-por-titulo-atualiza-url-e-grade", async ({ page }) => {
    await page.goto("/")

    await page.getByRole("searchbox").fill("Building")
    await page.getByRole("button", { name: "Search" }).click()

    await expect(page).toHaveURL(/\?q=Building$/)
    await expect(page.getByRole("heading", { name: "Building a home page" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Relaxing music mix" })).not.toBeVisible()
  })

  test("2.2 busca-sem-resultados-exibe-estado-vazio", async ({ page }) => {
    await page.goto("/")

    await page.getByRole("searchbox").fill("nonexistent-term-xyz")
    await page.getByRole("button", { name: "Search" }).click()

    await expect(page).toHaveURL(/\?q=nonexistent-term-xyz$/)
    await expect(page.getByText("No videos found.")).toBeVisible()
  })

  // 3. Scroll infinito

  test("3.1 rolar-ate-o-fim-carrega-proxima-pagina", async ({ page }) => {
    await page.goto("/")

    await expect(page.getByRole("heading", { name: "Bonus video 22" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Bonus video 23" })).toHaveCount(0)

    const nextPageResponse = page.waitForResponse(
      (r) => r.url().includes("/api/videos/public") && r.url().includes("page=2")
    )
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await nextPageResponse

    await expect(page.getByRole("heading", { name: "Bonus video 23" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Bonus video 24" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Building a home page" })).toHaveCount(1)
  })

  // 4. Account Menu (autenticado)

  test("4.1 abrir-account-menu-exibe-identidade-e-permite-sign-out", async ({ page }) => {
    await loginAsHomeUser(page)
    await page.goto("/")

    await page.getByRole("button", { name: "Open account menu" }).click()

    const menu = page.getByRole("dialog")
    await expect(menu.getByText("Alice", { exact: true })).toBeVisible()
    await expect(menu.getByText("@alice")).toBeVisible()

    const logoutResponse = page.waitForResponse(
      (r) => r.url().includes("/api/auth/logout") && r.request().method() === "POST"
    )
    await menu.getByRole("button", { name: "Sign Out" }).click()
    await logoutResponse

    await expect(page.getByRole("link", { name: "Log in" })).toBeVisible()
  })
})

async function loginAsHomeUser(page: Page) {
  await page.goto("/login")
  await page.getByLabel("Email address").fill("homefeed@example.com")
  await page.getByLabel("Password", { exact: true }).fill("secret123")
  const loginResponse = page.waitForResponse(
    (r) => r.url().includes("/api/auth/login") && r.request().method() === "POST"
  )
  await page.getByRole("button", { name: "Sign in" }).click()
  await loginResponse
}
