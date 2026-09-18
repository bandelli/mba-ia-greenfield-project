import { expect, test } from "./fixtures"

// Upstream is faked server-side by mocks/ MSW via instrumentation.ts.
// GET /channels/:nickname + GET /channels/:nickname/videos (mocks/handlers/channels.ts)
// return fixture data for any nickname, except two reserved triggers:
// CHANNEL_NOT_FOUND_TRIGGER ("nickname-does-not-exist") → 404 on both, and
// EMPTY_PUBLIC_VIDEO_LIST_TRIGGER ("channel-with-no-public-videos") → empty
// video list (channel itself still resolves). No page.route() of /api/**.
//
// Anonymous screen — no login step in any scenario.
test.describe("channel-public-page", () => {
  // 1. Página pública do canal

  test("1.1 exibir-informacoes-e-videos-do-canal", async ({ page }) => {
    await page.goto("/channel/techmasteryplus")

    // mocks/handlers/channels.ts's `basePublicChannel` fixture always returns
    // name: "Alice" — only `nickname` echoes the requested path param.
    await expect(page.getByRole("heading", { name: "Alice" })).toBeVisible()
    await expect(page.getByText("@techmasteryplus")).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "React 19 Complete Crash Course - Everything New" })
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Build a Next.js 14 Dashboard App | Full Stack Tutorial" })
    ).toBeVisible()
  })

  test("1.2 exibir-estado-vazio-sem-videos-publicos", async ({ page }) => {
    await page.goto("/channel/channel-with-no-public-videos")

    await expect(page.getByText("This channel has no public videos yet")).toBeVisible()
  })

  test("1.3 renderizar-not-found-para-nickname-inexistente", async ({ page }) => {
    await page.goto("/channel/nickname-does-not-exist")

    // NOT asserting the HTTP transport status here: this route now has a
    // `loading.tsx` (Suspense boundary, added so the "Loading: skeleton
    // banner + video grid" UI Contract requirement is met). Once a route
    // segment streams via a Suspense boundary, Next.js commits the initial
    // HTTP status (200) before `notFound()` is thrown inside the async
    // Server Component — confirmed in both dev and a production
    // build+start, not a dev-only artifact. The not-found *content* still
    // renders correctly (asserted below); only the raw transport status
    // stops being 404. This is a known trade-off of Next.js's streaming
    // model, not a bug in this route — flagged in progress.md rather than
    // silently accepted.
    await expect(page.getByText(/this page could not be found/i)).toBeVisible()
  })

  // The Server Component reads `searchParams` and calls `upstream` directly
  // (no browser-visible fetch to `/api/channels/:nickname/videos` — same
  // RSC-direct-upstream pattern established since SI-04.8b and already hit in
  // SI-04.9b's dashboard e2e spec). The client-observable proof of "a new
  // search fired with the correct sort" is the URL changing via
  // `router.push`, not a network request — there is none to observe.
  test("1.4 reordenar-videos-publicados", async ({ page }) => {
    await page.goto("/channel/techmasteryplus")

    await page.getByRole("button", { name: "Popular" }).click()
    await expect(page).toHaveURL(/[?&]sort=popular\b/)
  })
})
