import type { Page } from "@playwright/test"

import { expect, test } from "./fixtures"

// Upstream is faked server-side by mocks/ MSW via instrumentation.ts.
// GET /channels/me (mocks/handlers/channels.ts) returns a fixture channel;
// PATCH /channels/me echoes the body back, except the reserved nickname
// trigger ("taken_nickname" — NICKNAME_TAKEN_TRIGGER), which returns
// 409 CHANNEL_NICKNAME_TAKEN. No page.route() of /api/** — that would
// short-circuit the real Route Handlers.
test.describe("channel-settings", () => {
  // 1. Edição de informações do canal

  test("1.1 editar-e-salvar-informacoes-do-canal", async ({ page }) => {
    await loginAsOwner(page)
    await page.goto("/dashboard/channel")

    await page.getByLabel("Channel Name").fill("Updated Channel Name")
    await page.getByRole("button", { name: "Save Changes" }).click()

    await expect(page.getByText("Channel updated")).toBeVisible()
  })

  test("1.2 exibir-erro-inline-de-nickname-duplicado", async ({ page }) => {
    await loginAsOwner(page)
    await page.goto("/dashboard/channel")

    await page.getByLabel("Nickname").fill("taken_nickname")
    await page.getByRole("button", { name: "Save Changes" }).click()

    await expect(page.getByText("This nickname is already taken")).toBeVisible()
  })

  test("1.3 redirecionar-usuario-nao-autenticado", async ({ page }) => {
    await page.goto("/dashboard/channel")

    await expect(page).toHaveURL(/\/login$/)
  })

  test("1.4 bloquear-submit-com-nickname-em-formato-invalido", async ({ page }) => {
    await loginAsOwner(page)
    await page.goto("/dashboard/channel")

    await page.getByLabel("Nickname").fill("Invalid Nickname!")

    await expect(
      page.getByText("Nickname can only contain lowercase letters, numbers, and underscores")
    ).toBeVisible()
    await expect(page.getByRole("button", { name: "Save Changes" })).toBeDisabled()
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
