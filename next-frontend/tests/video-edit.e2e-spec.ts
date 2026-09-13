import type { Page } from "@playwright/test"

import { expect, test } from "./fixtures"

// Upstream is faked server-side by mocks/ MSW via instrumentation.ts. The
// "own video" fetch (GET /videos/:id) always succeeds with a fixture video
// whose public_id echoes the route param; per-scenario outcomes on the
// mutating endpoints use reserved trigger ids in the route path
// (trigger-validation-error, trigger-video-not-ready — see
// mocks/handlers/videos.ts). No page.route() of /api/** — that would
// short-circuit the real Route Handlers.
test.describe("video-edit", () => {
  // 1. Edição e publicação de vídeo

  test("1.1 editar-campos-e-salvar-como-rascunho", async ({ page }) => {
    await loginAsOwner(page)
    await page.goto("/dashboard/videos/pub123/edit")

    await page.getByLabel("Title (required)").fill("Updated title")
    await page.getByRole("button", { name: "Save as draft" }).click()

    await expect(page.getByText("Saved")).toBeVisible()
  })

  test("1.2 publicar-video-pronto", async ({ page }) => {
    await loginAsOwner(page)
    await page.goto("/dashboard/videos/pub123/edit")

    const publishRequest = page.waitForRequest(
      (r) =>
        r.url().includes("/api/videos/pub123/publish") &&
        r.method() === "POST"
    )
    await page.getByRole("button", { name: "Publish" }).click()
    await publishRequest

    await expect(page).toHaveURL(/\/dashboard\/videos$/)
  })

  test("1.3 exibir-erro-inline-de-categoria-invalida", async ({ page }) => {
    await loginAsOwner(page)
    await page.goto("/dashboard/videos/trigger-validation-error/edit")

    await page.getByRole("button", { name: "Save as draft" }).click()

    await expect(page.locator("[data-slot='form-error']")).toContainText(
      "Validation failed"
    )
  })

  test("1.4 exibir-toast-ao-tentar-publicar-video-nao-pronto", async ({
    page,
  }) => {
    await loginAsOwner(page)
    await page.goto("/dashboard/videos/trigger-video-not-ready/edit")

    await page.getByRole("button", { name: "Publish" }).click()

    await expect(
      page.getByText(/still processing/i)
    ).toBeVisible()
    await expect(page).toHaveURL(/\/dashboard\/videos\/trigger-video-not-ready\/edit$/)
  })

  test("1.5 redirecionar-usuario-nao-autenticado", async ({ page }) => {
    await page.goto("/dashboard/videos/pub123/edit")

    await expect(page).toHaveURL(/\/login$/)
  })

  test("1.6 bloquear-submit-com-titulo-acima-do-limite", async ({ page }) => {
    await loginAsOwner(page)
    await page.goto("/dashboard/videos/pub123/edit")

    const requests: string[] = []
    page.on("request", (r) => {
      if (r.url().includes("/api/videos/pub123") && r.method() === "PATCH") {
        requests.push(r.method())
      }
    })

    const title = page.getByLabel("Title (required)")
    await title.fill("x".repeat(201))
    await page.getByRole("button", { name: "Save as draft" }).click()

    await expect(
      page.getByText("Title must be at most 200 characters")
    ).toBeVisible()
    expect(requests).toHaveLength(0)
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
