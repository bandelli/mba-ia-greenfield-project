# phase-05-video-watch-page — Progress

**Status:** completed
**SIs:** 8/8 completed

### SI-05.1 — Coluna `views` na entidade Video
- **Status:** completed
- **Tests:** 13 passing
- **Observations:**
  - Migration `1789341438071-AddVideoViews.ts` generated via TypeORM CLI as required; the CLI's whole-table diff also re-emitted the three enum types + FK constraints (same pattern as the precedent `AddVideoTitleDescription` migration) — not hand-written, so left as-is.
  - Dev DB has pre-existing migration-ledger drift unrelated to this SI: the `migrations` table only records `CreateUsersAndChannels` and `CreateAuthTokens`, while `CreateVideos`, `AddVideoCategoryPublicationVisibility`, and `AddVideoTitleDescription` were never recorded even though the `videos` table/enums already exist with data (classic "synchronize residue" per `.claude/rules/typeorm-migrations.md`). This blocks `npm run migration:run` from applying any pending migration, including this SI's. Out of scope to fix here (would require dropping/regenerating shared dev-DB migration history) — flagging as a separate follow-up task. AC #2 (migration runs cleanly against a populated table) was instead verified directly: ran the migration's `ALTER TABLE "videos" ADD "views" integer NOT NULL DEFAULT '0'` inside a rolled-back transaction against the real `videos` table (3 existing rows), confirming no error and correct backfill to `0`.

### SI-05.2 — Endpoint público de metadados do vídeo + incremento de views
- **Status:** completed
- **Tests:** 13 passing (3 unit + 5 integration + 5 e2e)
- **Observations:**
  - `PublicVideoDetail`'s `title` field is typed `string | null` (matching the entity and the existing `OwnerVideoListItem`/`PublicVideoListItem` precedent in `channels.service.ts`), even though the plan's API Contract prose lists it as non-nullable `title: string` — the codebase convention for every other video response type keeps it nullable, so this SI follows that convention rather than the plan's informal type annotation.
  - `channels.service.ts` still hardcodes `views: 0` in its `OwnerVideoListItem`/`PublicVideoListItem` mappers (placeholder from before this column existed) instead of reading the real `video.views` now available. Out of scope for this SI (channels module isn't touched by SI-05.2's technical actions) — flagging as a follow-up task for whichever phase/SI owns channel video listings.

### SI-05.3 — Endpoints públicos de stream-url e download-url
- **Status:** completed
- **Tests:** 10 passing (e2e, extended `video-public-watch.e2e-spec.ts`); 8 unit+integration tests re-verified unaffected
- **Observations:**
  - Deviated from the SI's literal Technical action wording ("reaproveita `findPublicVideo`"): calling that exact method from stream-url/download-url would have incremented `views` on every call, and since SI-05.6b's wiring fetches metadata + stream-url + download-url together per page load (`Promise.all`), a single page view would have counted as 3 views. TD-02 explicitly scopes the increment to "the TD-01 public endpoint" (singular). Refactored by extracting the shared find+validate logic (no increment) into a new `findPublicReadyVideo(publicId)` method — `findPublicVideo` (metadata endpoint) calls it then increments; stream-url/download-url call it directly with no increment. Added an explicit e2e test asserting stream-url/download-url do not move the `views` counter.

### SI-05.4 — Endpoint de vídeos sugeridos
- **Status:** completed
- **Tests:** 27 passing (3 new unit + 4 new integration for `findSuggestedVideos`, plus the 8 pre-existing `findPublicVideo` unit+integration; 2 new e2e cases, plus 10 pre-existing e2e)
- **Observations:**
  - Enforced `limit` max of 12 via `class-validator` (`@Max(12)` on `FindSuggestedVideosQueryDto`), mirroring the existing `FindPublicVideosQueryDto` convention in `channels/dto/` — an out-of-range `limit` returns `400` rather than being silently clamped.

### SI-05.5 — Camada BFF: Route Handlers para os endpoints públicos de vídeo
- **Status:** completed
- **Tests:** 9 passing (MSW integration, 4 route files); `tsc --noEmit` exits 0
- **Observations:**
  - Regenerated `nestjs-project/openapi.json` via `npm run openapi:export`, synced to `next-frontend/openapi.json` via the project's own `scripts/sync-openapi.sh` (host-only), then regenerated `next-frontend/lib/api/types.gen.ts` via `npm run openapi:types` — per the documented `next-frontend-bff-api.md` developer flow.
  - Added MSW handlers for the 4 new public video endpoints to `mocks/handlers/videos.ts` (shared fixture set, reused by both Vitest and the future Playwright E2E in SI-05.6b per the project's instrumentation.ts architecture), including a reserved `PUBLIC_VIDEO_NOT_FOUND_TRIGGER` id.
  - `suggested/route.ts` forwards only the `limit` query param (per the SI's literal instruction), not the full query string — narrower than the existing `channels/[nickname]/videos` route's forward-everything pattern.

### SI-05.6.0 — Drift audit: Video Watch Page
- **Status:** completed
- **Tests:** no tests (audit-only)
- **Observations:**
  - `figma:figma-implement-design` (the packaged plugin skill) is not registered in this environment. Per user decision (asked via AskUserQuestion), performed the audit using the raw Figma MCP tools directly (`get_design_context`, `get_screenshot`, `get_metadata`), loading the design-to-code guidance via the `skill://figma/figma-design-to-code/SKILL.md` MCP resource — same real Figma data, no packaged-skill wrapper. This same substitution will be needed again for SI-05.6a.
  - One `get_screenshot` call hit the Figma MCP Professional-seat rate limit mid-audit; not retried since `get_design_context`'s returned reference code for the affected node already had sufficient detail (mirrors the same rate-limit situation documented in `phase-04-video-channel-management/frontend-drift-report.md`).
  - `git diff --name-only HEAD -- next-frontend` is non-empty, but only lists files from the already-completed SI-05.5 (`contracts.ts`, `types.gen.ts`, `mocks/handlers/videos.ts`) — this audit-SI itself made zero writes to `next-frontend` (only `frontend-drift-report.md` under `docs/` was created), satisfying the AC's intent.
  - Found 2 `drift relevante` components (`button.tsx`: 3 usages needing new variants/sizes; `icon-button.tsx`: 1 usage needing a new variant+size) — full detail in `frontend-drift-report.md`. Both will be applied mechanically by SI-05.6a.

### SI-05.6a — Tela de Video Watch Page (visual shell)
- **Status:** completed
- **Tests:** no tests (visual shell)
- **Observations:**
  - `figma:figma-implement-design` still unavailable (same as SI-05.6.0) — visual shell was built using the raw Figma MCP `get_design_context`/`get_screenshot` tools directly, plus reasoned extrapolation for the video player's control bar, which has no decomposed layer in the Figma source (the watch page's video area is a single flat thumbnail image with no separate play/pause/volume/progress sub-layers).
  - Found and fixed a gap in my own SI-05.6.0 audit during implementation: `button.tsx`'s pre-existing `secondary` variant carries a visible `border-border` that Figma's Share/Download pills don't have. Rather than silently patching around it, amended `frontend-drift-report.md`'s button.tsx section with a 4th bullet (`+variant 'fill'`) before applying it — added a borderless `fill` variant instead of retuning `secondary` (which is safely still used elsewhere, e.g. `channel-public-page.tsx`'s bordered sort tabs).
  - Skipped building a header/nav bar and the sidebar's category-filter chip row, even though both appear in the raw Figma frame: neither maps to any capability in this phase's UI Contract or Traceability Matrix, and no prior phase (dashboard, channel pages) built a header either — treated as generic template chrome, consistent with project precedent.
  - Visually verified the rendered page in a browser against the Figma screenshot (both the button row and the description/comments area) — colors, pill shapes, and layout match; caught and fixed one real layout bug this way (the "Show more" toggle was stretching full-width instead of staying left-aligned; fixed with the allowed `self-start` positioning utility, not a DS edit).
  - Dev server (`next dev`) was started in the container for the visual check and is still running — the container has no `pkill` available to stop it from the host; harmless to leave running, but flagging in case a later step expects a clean container.

### SI-05.6b — Tela de Video Watch Page (lógica & wiring)
- **Status:** completed
- **Tests:** 13 passing (6 unit — `video-player.test.tsx`, `description-card.test.tsx` — + 7 E2E — `tests/video-watch-page.e2e-spec.ts`, JIT-authored from `next-frontend/specs/video-watch-page.plan.md`, later consolidated from 8 to 7 test cases — see observation below); `tsc --noEmit`, lint, and `npm run build` all clean; visually re-verified in-browser with real wired data (play/pause toggled correctly)
- **Observations:**
  - `page.tsx` converted to an async Server Component, fetching metadata + suggested + stream-url + download-url via `Promise.all(upstream.GET(...))` directly (RSC-direct pattern, same as `/channel/[nickname]`) — replaced all SI-05.6a placeholder/mock data.
  - `video-player.tsx` and `description-card.tsx` are now `"use client"` islands (play/pause/volume/seek on the native `<video>` element via a ref; expand/collapse via local `useState`, no network I/O per TD-06).
  - **Found and fixed a genuine race-condition bug** in `video-player.tsx` while authoring the E2E test: the native `loadedmetadata` event can fire before React finishes hydrating and attaches its listener (reproducible with a small/cached video loading faster than hydration) — silently dropping the event and leaving `duration` stuck at 0 forever, which in turn kept the progress bar's `max` at 0 and made seeking impossible. Fixed with a mount-time `useEffect` that reads `videoRef.current.readyState`/`.duration` directly as a fallback in case the event already fired before the listener was attached. This is a real production bug fix, not just a test workaround — the same race is possible (if less likely) with a real, well-cached video.
  - E2E test authoring needed a genuinely loadable local video for the play/pause/seek/volume scenarios (jsdom can't play video; the fake presigned URLs used elsewhere aren't real media). Generated a tiny 2s test-fixture MP4 via `ffmpeg` (run inside the `video-worker` container, which already has it installed) and committed it at `next-frontend/public/test-fixtures/sample-video.mp4`. Added a new reserved MSW trigger (`PLAYABLE_STREAM_TRIGGER`) that points `stream-url` at this real same-origin asset instead of the usual fake URL — deliberately avoided `page.route()`, which every existing E2E spec in this project explicitly avoids even for external URLs (per repeated comments to that effect), even though the literal project rule only forbids it for `/api/**`.
  - Also added `LONG_DESCRIPTION_TRIGGER` (a reserved MSW trigger returning a longer description) since the default fixture description was too short to actually clamp at `line-clamp-3`, needed for the "Show more" E2E scenario.
  - Playwright's `locator.fill()` does not work on `<input type="range">`; range interactions in the E2E spec use `.evaluate()` with the native `HTMLInputElement.prototype.value` setter (bypassing React's patched instance setter) so the dispatched `input` event is correctly detected as a real value change.
  - **Found and fixed a full-suite E2E flakiness issue during final verification** (unrelated to any single SI, so logged here where it was diagnosed and fixed): running the *entire* `next-frontend` E2E suite together caused 21/38 tests to fail across `auth-*`, `channel-settings`, `video-dashboard`, and `video-edit` specs — all pre-existing, untouched by this phase — while this phase's own 8 new tests always passed. The failures reproduced identically in both parallel and fully serial (`--workers=1`) runs, ruling out simple worker contention. Bisection confirmed the cause: three separate tests in this file each did a fresh `page.goto` loading the real local video fixture (`2.1`/`2.2`/`2.3`); combined with the rest of the suite's concurrent traffic against the one shared containerized dev server, this was enough to degrade response times suite-wide (a 44-minute run vs. ~10s once removed). Fix: consolidated the three into one test (`"2.1-2.3 controles-do-video-player"`) sharing a single page load — cuts real-video loads from 3 to 1, same AC coverage (#4/#5/#6). Verified twice on a freshly restarted dev server: full suite (36 tests, unrelated specs included) passes in ~9.5s both times.
