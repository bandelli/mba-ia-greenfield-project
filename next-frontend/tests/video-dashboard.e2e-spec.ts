import type { Page } from "@playwright/test"

import { expect, test } from "./fixtures"

// Upstream is faked server-side by mocks/ MSW via instrumentation.ts.
// GET /channels/me/videos (mocks/handlers/channels.ts) returns 2 fixture
// videos by default ("pub123"/"pub456"); a reserved `search` trigger value
// (EMPTY_VIDEO_LIST_SEARCH_TRIGGER) yields an empty list, for scenario 1.7.
// No page.route() of /api/** — that would short-circuit the real Route Handlers.
test.describe("video-dashboard", () => {
  // 1. Dashboard de gerenciamento de vídeos do canal

  test("1.1 exibir-lista-paginada-de-videos-do-canal", async ({ page }) => {
    await loginAsOwner(page)
    await page.goto("/dashboard/videos")

    await expect(
      page.getByRole("heading", {
        name: "My Awesome Tech Review 2024 - Best Gadgets of the Year",
      })
    ).toBeVisible()
    await expect(
      page.getByRole("heading", {
        name: "How I Built My First App in 30 Days - Complete Guide",
      })
    ).toBeVisible()
  })

  // Scenarios 1.2-1.4: the Server Component reads `searchParams` and calls
  // `upstream` directly (no browser-visible fetch to `/api/channels/me/videos`
  // — same RSC-direct-upstream pattern already established by SI-04.8b, per
  // next-frontend/CLAUDE.md "Server Components ... can fetch from the upstream
  // API directly"). The client-observable proof that "a new search fired with
  // the correct query params" is the URL itself changing via `router.push`
  // (asserted here), not a network request — there is none to observe.

  test("1.2 filtrar-por-visibilidade-publica", async ({ page }) => {
    await loginAsOwner(page)
    await page.goto("/dashboard/videos")

    await page.getByRole("button", { name: "Public" }).click()
    await expect(page).toHaveURL(/[?&]visibility=public\b/)
  })

  test("1.3 buscar-por-palavra-chave", async ({ page }) => {
    await loginAsOwner(page)
    await page.goto("/dashboard/videos")

    // Scoped to `main` — now that /dashboard/videos renders inside the
    // shared AppShell (Gap 1), the header's own global SearchBar also has a
    // "Search" submit button; `main` disambiguates from this page's local one.
    await page.getByPlaceholder("Search your videos").fill("gadgets")
    await page.getByRole("main").getByRole("button", { name: "Search" }).click()
    await expect(page).toHaveURL(/[?&]search=gadgets\b/)
  })

  test("1.4 reordenar-lista", async ({ page }) => {
    await loginAsOwner(page)
    await page.goto("/dashboard/videos")

    await page.getByRole("combobox").click()
    await page.getByRole("option", { name: "Oldest" }).click()
    await expect(page).toHaveURL(/[?&]sort=oldest\b/)
  })

  test("1.5 navegar-para-edicao-via-menu-de-acoes", async ({ page }) => {
    await loginAsOwner(page)
    await page.goto("/dashboard/videos")

    await page
      .getByRole("link", { name: "Edit My Awesome Tech Review 2024 - Best Gadgets of the Year" })
      .click()

    await expect(page).toHaveURL(/\/dashboard\/videos\/video-1\/edit$/)
  })

  test("1.6 redirecionar-usuario-nao-autenticado", async ({ page }) => {
    await page.goto("/dashboard/videos")

    await expect(page).toHaveURL(/\/login$/)
  })

  test("1.7 exibir-estado-vazio-sem-videos", async ({ page }) => {
    await loginAsOwner(page)
    // Reserved trigger (see mocks/handlers/channels.ts) — simulates the
    // upstream returning `items: []`.
    await page.goto("/dashboard/videos?search=no-videos-match-this-search")

    await expect(page.getByText("You haven't uploaded any videos yet")).toBeVisible()
    await expect(
      page.getByRole("link", { name: /upload video/i }).first()
    ).toBeVisible()
  })
})

async function loginAsOwner(page: Page) {
  await page.goto("/login")
  await page.getByLabel("Email address").fill("owner@example.com")
  await page.getByLabel("Password", { exact: true }).fill("secret123")
  const loginResponse = page.waitForResponse(
    (r) => r.url().includes("/api/auth/login") && r.request().method() === "POST"
  )
  await page.getByRole("button", { name: "Sign in" }).click()
  await loginResponse
}
