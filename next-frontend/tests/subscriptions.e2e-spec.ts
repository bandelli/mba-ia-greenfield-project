import type { Page } from "@playwright/test"

import { expect, test } from "./fixtures"

// Upstream is faked server-side by mocks/ MSW via instrumentation.ts.
// GET /users/me/subscriptions (mocks/handlers/subscriptions.ts) returns 22
// fixture channels ("Channel 2".."Channel 23") — more than
// app/(main)/subscriptions/page.tsx's DEFAULT_LIMIT of 20, so page 1 has 20 items
// and page 2 has the remaining 2, giving a genuine second page with no
// reserved trigger needed. Requesting a page beyond both (e.g. ?page=3)
// naturally yields an empty items array, exercising the empty state. The
// handler also adds a small fixed delay so app/(main)/subscriptions/loading.tsx's
// skeleton is observable.
// No page.route() of /api/** — that would short-circuit the real Route Handlers.
test.describe("subscriptions", () => {
  // 1. Acesso e autenticação

  test("1.1 renderizar-lista-de-canais-seguidos", async ({ page }) => {
    await loginAsSubscriber(page)
    await page.goto("/subscriptions")

    // Scoped to `main` — the sidebar's own "Subscribed channels" section
    // (Gap 2) renders a real fetch of the same fixture data, so "Channel 2"
    // now also appears there; `main` disambiguates from that landmark.
    const list = page.getByRole("main")
    const firstRow = list.getByRole("link", { name: "Channel 2", exact: true })
    await expect(firstRow).toBeVisible()
    await expect(firstRow).toHaveAttribute("href", "/channel/channel-2")

    const lastRowOnPage1 = list.getByRole("link", { name: "Channel 21", exact: true })
    await expect(lastRowOnPage1).toBeVisible()
    await expect(lastRowOnPage1).toHaveAttribute("href", "/channel/channel-21")
  })

  test("1.2 acesso-anonimo-redireciona-para-login", async ({ page }) => {
    await page.goto("/subscriptions")

    await expect(page).toHaveURL(/\/login$/)
  })

  test("1.3 exibir-estado-vazio-sem-inscricoes", async ({ page }) => {
    await loginAsSubscriber(page)
    // Beyond both pages of the 22-item fixture (page 1 + page 2) — real
    // offset/limit slicing naturally yields an empty items array.
    await page.goto("/subscriptions?page=3")

    await expect(page.getByText("No subscriptions yet")).toBeVisible()
    await expect(
      page.getByText("You haven't subscribed to any channel yet.")
    ).toBeVisible()
  })

  // 2. Paginação e carregamento

  test("2.1 navegar-para-segunda-pagina", async ({ page }) => {
    await loginAsSubscriber(page)
    await page.goto("/subscriptions")

    await page.getByRole("link", { name: "Next page" }).click()

    await expect(page).toHaveURL(/\/subscriptions\?page=2$/)
    await expect(page.getByRole("link", { name: "Channel 22", exact: true })).toBeVisible()
    await expect(page.getByRole("link", { name: "Channel 23", exact: true })).toBeVisible()
  })

  test("2.2 exibir-skeleton-durante-carregamento", async ({ page }) => {
    await loginAsSubscriber(page)

    const navigation = page.goto("/subscriptions")
    await expect(page.locator('[data-slot="skeleton"]').first()).toBeVisible()
    await navigation

    // Scoped to `main` — see the "1.1" comment above re: the sidebar's own
    // "Subscribed channels" section also rendering a "Channel 2" row.
    await expect(
      page.getByRole("main").getByRole("link", { name: "Channel 2", exact: true })
    ).toBeVisible()
  })
})

async function loginAsSubscriber(page: Page) {
  await page.goto("/login")
  await page.getByLabel("Email address").fill("subscriber@example.com")
  await page.getByLabel("Password", { exact: true }).fill("secret123")
  const loginResponse = page.waitForResponse(
    (r) => r.url().includes("/api/auth/login") && r.request().method() === "POST"
  )
  await page.getByRole("button", { name: "Sign in" }).click()
  await loginResponse
}
