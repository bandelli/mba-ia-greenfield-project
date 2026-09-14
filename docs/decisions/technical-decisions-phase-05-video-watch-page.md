---
scope_type: phase
related_phases: [5]
status: decided
date: 2026-09-13
scope_description: "Anonymous video watch page — public access authorization for metadata/stream/download, view counting, suggested videos selection, and player implementation"
---

# Technical Decisions — Phase 05: Video Watch Page

_Subprojects in scope:_

- `nestjs-project/` — new public (anonymous) read surface for video metadata/stream/download, real view-count persistence, suggested-videos query.
- `next-frontend/` — watch page composition (player, description, sidebar), video player implementation.

---

## TD-01: Public/anonymous access model for video metadata, streaming and download

**Scope:** Cross-layer

**Capability:** Transversal — covers: "Anonymous access to video viewing", "Video download button", "Unlisted videos accessible only via direct link (not shown in listings)"

**Context:** Every existing video-read endpoint (`GET /videos/:id`, `GET /videos/:id/stream-url`, `GET /videos/:id/download-url`) requires a JWT and enforces ownership via `findOwnedReadyVideo`/`getOwnedVideo` (built in Phase 04 for the dashboard/edit flow). Phase 05 needs an anonymous visitor to load a watch page, stream, and download any video that is `public` OR `unlisted` and `status = ready`, addressed by its opaque `public_id` (`phase-03-videos/TD-05`) rather than the internal `uuid`. Draft/processing/error videos, and any attempt to fetch via the internal `uuid` id, must stay blocked. This needs an explicit authorization model, not a tweak to the existing owner-only guard logic.

**Options:**

### Option A: New parallel public endpoints
- `GET /videos/public/:publicId`, `GET /videos/public/:publicId/stream-url`, `GET /videos/public/:publicId/download-url`, marked `@Public()` (the decorator already used by `ChannelsController`'s public routes), each doing one explicit check — `(visibility = public OR unlisted) AND status = ready` — before returning data or issuing a presigned URL. The existing owner-only `:id` endpoints are untouched.
- **Pros:** zero risk to the already-shipped, already-tested Phase 04 owner/dashboard flow; one single-purpose guard per route (matches the existing `@Public()` pattern on `ChannelsController`'s `:nickname` and `:nickname/videos`); a security review only needs to reason about one predicate.
- **Cons:** two "identity" routes now reach the same underlying video (uuid-keyed owner routes, public_id-keyed public routes).

### Option B: Relax existing endpoints to branch on bearer-token presence
- The same `:id` handlers accept either an owner (JWT + uuid) or an anonymous (`public_id`) caller, branching internally on whether a token was supplied.
- **Pros:** fewer total routes.
- **Cons:** mixes two fundamentally different authorization models (strict ownership vs. visibility-based public access) inside one handler, which is exactly the kind of conditional-guard logic the project's `@Public()` global-guard-override pattern was designed to avoid; a mistake here risks leaking a draft or private video.

### Option C: Nest the public read surface under `ChannelsController` (`/channels/:nickname/videos/:publicId`)
- **Pros:** keeps all public-facing channel/video reads in one controller.
- **Cons:** would require the channel nickname in the watch URL, defeating `phase-03-videos/TD-05`'s decision that `public_id` is a short, opaque, non-enumerable identifier deliberately decoupled from the channel; couples a Phase 05 read path to the Phase 04 controller for no structural reason.

**Recommendation:** Option A — leaves Phase 04's owner-only surface completely untouched (no regression risk to its existing test suite), matches the single-purpose-guard convention already established for `@Public()` routes, and preserves Phase 03's public_id-only URL decision.

**Decision:** A

---

## TD-02: View count tracking strategy

**Scope:** Backend

**Capability:** "View count"

**Context:** `channels.service.ts` currently hardcodes `views: 0` for every video, with a comment stating view tracking is deferred to a later phase — this is that phase. The project's stack has no cache layer (PostgreSQL only, no Redis); `pg-boss` (`phase-03-videos/TD-02`) exists but is scoped to video processing jobs.

**Options:**

### Option A: Naive atomic counter
- A `views` integer column on `videos`, incremented via an atomic `UPDATE videos SET views = views + 1 WHERE id = :id` every time the TD-01 public endpoint successfully serves a ready public/unlisted video.
- **Pros:** trivial to implement and test — one atomic SQL statement, no new table or infra; consistent with the project's lean-stack pattern.
- **Cons:** inflatable by refreshes or bots; not deduplicated per viewer.

### Option B: Deduplicated counter via a view-log table
- A `video_views` table with a partial unique constraint on `(video_id, viewer_key, date_bucket)` (`viewer_key` derived from a hash of IP + user agent, no auth required); only a viewer's first hit in the bucket increments the count.
- **Pros:** closer to a "real" view count, resistant to refresh spam within the dedup window.
- **Cons:** new table, hashing logic, and either a scheduled aggregate or a `COUNT()` on every read — meaningful extra implementation surface for a metric this phase only needs to *display*, not analyze.

### Option C: Asynchronous increment via the existing job queue
- The watch endpoint enqueues a `video.viewed` job on `pg-boss`; a worker consumes it and performs the increment off the request's critical path.
- **Pros:** removes the write from the request path.
- **Cons:** `pg-boss` was adopted specifically for video processing (`phase-03-videos/TD-02`, TD-03's "Notes" dependency); reusing it for a single low-latency SQL increment adds queue latency and worker code for a statement that is already fast and atomic.

**Recommendation:** Option A — the phase only asks to display a view count, not to build an anti-fraud analytics system; a plain atomic increment matches the project's pattern of keeping infrastructure narrowly scoped to what a capability actually needs. Can be revisited later if inflation becomes a real product problem.

**Decision:** A

---

## TD-03: Suggested videos selection algorithm

**Scope:** Backend

**Capability:** "Suggested videos from the same category in the sidebar"

**Context:** No query exists yet for "videos related to this one." Needs a selection rule (same `category` enum, `phase-04-video-channel-management/TD-01`), an exclusion rule (never suggest the video currently being watched), an ordering, and a result-count bound.

**Options:**

### Option A: Latest-first, same category
- Same `category`, `status = ready`, `visibility = public` (never surface an `unlisted` video as someone else's suggestion), excluding the current video, ordered by `published_at DESC`, capped at a fixed count (e.g. 12).
- **Pros:** reuses the exact predicate `channels.service.findPublicVideos` already applies for `sort=latest` (`phase-04-video-channel-management/TD-05`) plus one added filter; deterministic and trivial to test.
- **Cons:** a prolific single channel can dominate the sidebar; no personalization.

### Option B: Popularity-first, same category
- Same predicate as A, ordered by `views DESC` (depends on TD-02 existing).
- **Pros:** surfaces the category's best-performing content.
- **Cons:** winner-take-all effect — the same few videos get suggested everywhere; no freshness signal.

### Option C: Randomized sample, same category
- Same predicate as A, random order (e.g. `ORDER BY random()` or an application-level shuffle over a larger candidate pool).
- **Pros:** even exposure across the catalog.
- **Cons:** `ORDER BY random()` is a known Postgres perf anti-pattern at scale (full scan + sort); not reproducible for testing without seeding/mocking.

**Recommendation:** Option A — reuses an already-decided, already-implemented predicate and ordering with one added filter, keeping the query trivial and the behavior deterministic and easy to test; popularity- or randomness-based ranking can be layered on later without changing the access pattern.

**Decision:** A

---

## TD-04: Video player implementation

**Scope:** Frontend

**Capability:** "Video player with controls: play/pause, volume, and progress bar"

**Context:** No video player exists in `next-frontend` yet. `phase-03-videos/TD-07` already decided delivery is a direct/presigned object-storage URL to a single progressive MP4 — no adaptive-bitrate/HLS packaging was built — so the player only ever needs to play one direct media URL, never select between renditions.

**Options:**

### Option A: Native `<video>` + fully custom controls
- Native `HTMLMediaElement` (play/pause/volume/`currentTime`) plus controls built from the project's existing design-system primitives (`components/ui/button.tsx`, `icon-button.tsx`, custom SVG icons, `<input type="range">` for progress/volume).
- **Pros:** zero new runtime dependency, consistent with the project's established convention of no external icon/UI libraries; full visual control to match Figma exactly; sufficient because the only sources are single progressive MP4 files (TD-07) — none of the adaptive-streaming machinery these libraries exist for is needed.
- **Cons:** play/pause, volume, and seek keyboard/ARIA behavior must be hand-built and hand-tested, with no library baseline.

### Option B: Media Chrome (`@mux/media-chrome`) wrapping a native `<video>`
- Framework-agnostic, accessible web-component controls (keyboard, ARIA solved) layered over a real `<video>` element — TD-07's direct-URL delivery keeps working unchanged.
- **Pros:** accessibility already solved; controls themeable via CSS parts.
- **Cons:** new dependency whose web-component styling model (CSS parts/slots) doesn't compose with the project's Tailwind + `cva` + semantic-token system as directly as plain HTML elements; would be the first web-component-based UI in a codebase that is 100% React components elsewhere.

### Option C: Vidstack Player (React bindings)
- Full-featured React-first player: adaptive streaming providers, HLS/DASH, captions, chapters, strong built-in accessibility.
- **Pros:** richest feature set; React-first API.
- **Cons:** bundle and feature surface aimed at problems this phase doesn't have (no adaptive streaming, no captions/chapters/multi-provider in scope) — the heaviest of the three options for a use case that is "one MP4, three controls."

**Recommendation:** Option A — the capability list asks for exactly three controls (play/pause, volume, progress bar) against a single progressive MP4 source, so native `<video>` plus the same custom-primitive pattern used everywhere else in the app is proportionate. Introducing an external player library (B or C) would be the project's first non-design-system UI dependency, for feature sets (adaptive streaming, multi-provider support) this phase does not need.

**Decision:** A

---

## TD-05: Page layout composition strategy for the watch page

**Scope:** Frontend

**Capability:** "Page layout: main video + information + sidebar with suggestions"

**Context:** The screen inventory (`docs/inventories/screen-inventory-phase-05-video-watch-page.md`) confirms a two-column layout — a ~968px main column (player, title, channel row, description, comments-stub) and a 400px sidebar (suggested videos), with no persistent left nav (confirmed "theater mode" per user decision during inventorying). Needs a composition mechanism for this fixed+fluid two-column split.

**Options:**

### Option A: CSS Grid two-column layout inlined in the page component
- The page component (`app/watch/[publicId]/page.tsx`) composes a `grid` with a fluid main-content track and a fixed `400px` sidebar track directly; no dedicated layout wrapper.
- **Pros:** matches Figma's fixed-width sidebar exactly; Grid is the idiomatic Tailwind tool for a fixed+fluid split; zero new components.
- **Cons:** none significant.

### Option B: Flexbox two-column layout
- `flex` container with `flex-1` main content and a fixed-width `aside`.
- **Pros:** equally simple; matches Flexbox patterns already used elsewhere in the project (e.g., `video-dashboard-list.tsx`).
- **Cons:** Grid is marginally more idiomatic than Flex when both a fixed and a fluid track need to coexist predictably, but Flex still works.

### Option C: Dedicated reusable `WatchPageLayout` wrapper component
- Extract the two-column shell into its own component, anticipating reuse if a similar layout appears in a future phase.
- **Pros:** reusable if the pattern recurs.
- **Cons:** premature abstraction for a single screen — conflicts with the project's own stated principle against designing for hypothetical future requirements (root `CLAUDE.md` → Working Principles).

**Recommendation:** Option A — CSS Grid inlined directly in the page component is the idiomatic Tailwind tool for this fixed+fluid split, and avoids Option C's premature abstraction for what is currently a single screen.

**Decision:** A

---

## TD-06: Description expand/collapse interaction pattern

**Scope:** Frontend

**Capability:** "Video description with expand/collapse"

**Context:** Video descriptions can be arbitrarily long (multi-paragraph, with timestamps and links per the Figma content). Needs a mechanism for showing a clamped/truncated description with a "Show more" control, matching the Figma affordance (clamped text + bottom fade-out gradient + "Show more" button).

**Options:**

### Option A: Client-side `useState` + Tailwind `line-clamp` utility
- A boolean toggles a `line-clamp-N` class on the description container; the "Show more" button reuses `components/ui/button.tsx` (ghost/link variant); the fade-out gradient overlay is an absolutely-positioned div shown only while clamped.
- **Pros:** no new dependency (`line-clamp` is a Tailwind v4 core utility, already available); simple, well-understood pattern; naturally supports the Figma fade-out gradient affordance.
- **Cons:** truncates by line count, not exact character count, so the cut point isn't pixel-identical across all descriptions — acceptable for a cosmetic affordance, not a data constraint.

### Option B: Native `<details>`/`<summary>` element
- Uses the browser's built-in disclosure element for the toggle.
- **Pros:** zero JS for the toggle itself; free keyboard/screen-reader semantics.
- **Cons:** the default disclosure triangle and browser-inconsistent styling need heavy CSS overrides to match Figma's plain "Show more" text-button look; doesn't naturally support the fade-out gradient overlay shown in Figma.

### Option C: Server-side character-count truncation
- Slice the description string at a fixed character count before sending it to the client; full text revealed on toggle.
- **Pros:** precise, deterministic truncation point.
- **Cons:** a hardcoded character threshold doesn't adapt to different font sizes, container widths, or viewport breakpoints — exactly the problem `line-clamp` (Option A) already solves responsively.

**Recommendation:** Option A — Tailwind's `line-clamp` utility plus a simple client toggle matches the Figma affordance with zero new dependencies, avoiding Option C's brittle hardcoded threshold.

**Decision:** A

---

## Decisions Summary

| ID | Scope | Decision | Recommendation | Choice |
|----|-------|----------|---------------|--------|
| TD-01 | Cross-layer | Public/anonymous access model for video metadata, streaming and download | A (New parallel `@Public()` endpoints keyed by `public_id`) | A |
| TD-02 | Backend | View count tracking strategy | A (Naive atomic counter) | A |
| TD-03 | Backend | Suggested videos selection algorithm | A (Latest-first, same category) | A |
| TD-04 | Frontend | Video player implementation | A (Native `<video>` + fully custom controls) | A |
| TD-05 | Frontend | Page layout composition strategy for the watch page | A (CSS Grid inlined in the page component) | A |
| TD-06 | Frontend | Description expand/collapse interaction pattern | A (Client `useState` + Tailwind `line-clamp`) | A |

---

## Notes for downstream pipeline

- **TD-03 → TD-02 dependency.** TD-03's Option B (popularity-first) would require TD-02 to be decided first (and not Option A/C's async variants delaying visibility of a fresh increment) — moot as long as TD-03's recommended Option A (latest-first) is chosen, since it doesn't read `views` at all.
- **TD-01 → TD-04 dependency.** TD-04's player only ever receives a single presigned URL string from whichever stream endpoint TD-01 lands on — the player implementation is agnostic to which of TD-01's options is chosen, as long as one public stream-URL endpoint exists.
