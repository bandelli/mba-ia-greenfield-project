import { expect, test } from "./fixtures"

// Upstream is faked server-side by mocks/ MSW via instrumentation.ts.
// GET /videos/public/:publicId (+ stream-url/download-url/suggested siblings)
// are handled by mocks/handlers/videos.ts, which return fixture data for any
// publicId except reserved triggers:
//   - PUBLIC_VIDEO_NOT_FOUND_TRIGGER ("trigger-public-video-not-found") →
//     404 VIDEO_NOT_FOUND on every one of the four endpoints.
//   - LONG_DESCRIPTION_TRIGGER ("trigger-long-description") → a description
//     long enough to be clamped by description-card.tsx's line-clamp-3.
//   - PLAYABLE_STREAM_TRIGGER ("trigger-playable-stream") → stream-url
//     resolves to a real same-origin static asset
//     (public/test-fixtures/sample-video.mp4) instead of the normal fake
//     presigned URL, so the player-control scenarios exercise a genuinely
//     loadable <video> element without a real network dependency.
// No page.route() of /api/** or of any third-party URL.
//
// Anonymous screen — no login step in any scenario.
test.describe("video-watch-page", () => {
  // 1. Video Watch Page — acesso anônimo

  test("1.1 renderizar-pagina-com-video-publico", async ({ page }) => {
    await page.goto("/watch/pub123")

    await expect(page.locator("video")).toHaveAttribute(
      "src",
      "https://storage.example.com/stream-presigned-url"
    )
    await expect(page.getByRole("heading", { name: "Fixture title" })).toBeVisible()
    await expect(page.getByText("Alice", { exact: true })).toBeVisible()
    await expect(page.getByText("Fixture description")).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Another Great Video" })
    ).toBeVisible()
  })

  test("1.2 renderizar-pagina-com-video-nao-listado", async ({ page }) => {
    // mocks/handlers/videos.ts's fixture doesn't gate on visibility (that
    // predicate is enforced backend-side, covered by SI-05.2/05.3 tests) —
    // any non-trigger publicId exercises the same direct-link render path.
    await page.goto("/watch/pub456")

    await expect(page.getByRole("heading", { name: "Fixture title" })).toBeVisible()
    await expect(page.getByText("Alice", { exact: true })).toBeVisible()
  })

  test("1.3 renderizar-not-found-para-public-id-inexistente", async ({ page }) => {
    await page.goto("/watch/trigger-public-video-not-found")

    await expect(page.getByText(/this page could not be found/i)).toBeVisible()
  })

  // 2. Controles do Video Player
  //
  // Consolidated into a single test/page load (rather than one per control)
  // — three separate real-video loads across this spec's tests, combined
  // with the rest of the E2E suite's concurrent traffic against the one
  // shared containerized dev server, was enough to degrade response times
  // suite-wide and cause unrelated specs to time out. One real video load
  // covering all three controls keeps the same AC coverage (#4 play/pause,
  // #5 seek, #6 volume) at a third of the resource footprint.

  test("2.1-2.3 controles-do-video-player (play-pause, seek, volume)", async ({
    page,
  }) => {
    await page.goto("/watch/trigger-playable-stream")
    const video = page.locator("video")

    // 2.1 play-pause-do-video
    await page.getByRole("button", { name: "Play" }).click()
    await expect(video).toHaveJSProperty("paused", false)

    await page.getByRole("button", { name: "Pause" }).click()
    await expect(video).toHaveJSProperty("paused", true)

    // 2.2 seek-via-barra-de-progresso
    // The progress range's `max` is bound to React `duration` state, updated
    // by the video's `onLoadedMetadata` handler — waiting on the element's
    // native `readyState` isn't enough, since React may not have re-rendered
    // with the new `max` yet; setting `value` while `max` is still "0" would
    // get silently clamped back to 0. Wait for the DOM `max` itself instead.
    await page.waitForFunction(
      () =>
        Number(
          (document.querySelector('input[aria-label="Video progress"]') as HTMLInputElement | null)
            ?.max
        ) > 0,
      { timeout: 10_000 }
    )

    // Range inputs aren't fillable via locator.fill() in Playwright. Setting
    // `.value` directly goes through React's patched instance setter (which
    // only tracks the value, it doesn't diff/fire onChange) — the native
    // prototype setter must be used instead so React detects a real change
    // when the subsequent "input" event is dispatched.
    const progress = page.getByLabel("Video progress")
    await progress.evaluate((el: HTMLInputElement, value) => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )!.set!
      nativeSetter.call(el, value)
      el.dispatchEvent(new Event("input", { bubbles: true }))
      el.dispatchEvent(new Event("change", { bubbles: true }))
    }, "1")

    await expect(video).toHaveJSProperty("currentTime", 1)

    // 2.3 ajustar-volume
    const volume = page.getByLabel("Volume")
    await volume.evaluate((el: HTMLInputElement, value) => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )!.set!
      nativeSetter.call(el, value)
      el.dispatchEvent(new Event("input", { bubbles: true }))
      el.dispatchEvent(new Event("change", { bubbles: true }))
    }, "0.5")

    await expect(video).toHaveJSProperty("volume", 0.5)
  })

  // 3. Descrição e download

  test("3.1 expandir-descricao-com-show-more", async ({ page }) => {
    await page.goto("/watch/trigger-long-description")

    const description = page.getByText(/This comprehensive tutorial covers/)
    await expect(description).toHaveClass(/line-clamp-3/)

    await page.getByRole("button", { name: "Show more" }).click()

    await expect(description).not.toHaveClass(/line-clamp-3/)
    await expect(page.getByRole("button", { name: "Show less" })).toBeVisible()
  })

  test("3.2 botao-download-aponta-para-url-presigned", async ({ page }) => {
    await page.goto("/watch/pub123")

    await expect(page.getByRole("link", { name: "Download" })).toHaveAttribute(
      "href",
      "https://storage.example.com/download-presigned-url"
    )
  })
})
