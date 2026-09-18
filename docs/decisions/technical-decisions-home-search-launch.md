---
scope_type: phase
related_phases: [7]
status: decided
date: 2026-09-16
scope_description: "Home page video feed, category filter, search (title + channel), global header/navbar with mobile navigation, pagination/infinite scroll for the home feed, and production deployment (hosting topology, object storage provider, CI pipeline with main-flow test execution) for Phase 07"
---

# Technical Decisions — Phase 07: Home Page, Search, and Wrap-up

_Subprojects in scope:_

- `nestjs-project/` — owns the new global (cross-channel) video listing endpoint backing the home feed: the search/category query contract (TD-01) and its pagination mechanic (TD-02). No new domain entities — reuses `Video`, `VideoCategory` (`phase-04-video-channel-management/TD-01`), and `Channel` unchanged.
- `next-frontend/` — receives the home page screen, the first shared header/navbar + mobile nav shell in the app (TD-04), and the client side of both cross-layer contracts (TD-01, TD-02) via the data-fetching/infinite-scroll pattern decided in TD-03.
- Repo-wide (no dedicated subproject directory) — this phase introduces the project's first production deployment target and CI pipeline (TD-05, TD-06); today both subprojects run only via their own separate dev `compose.yaml`, and no `.github/` workflows exist.

---

## TD-01: Home Feed Listing & Search Query Contract

**Scope:** Cross-layer

**Capability:** Transversal — covers: "Home page with a video grid (thumbnail, title, channel, views, and publish time)", "Video filter by category on the home page", "Search bar (search by title and channel)"

**Context:** No global "list all public videos" endpoint exists today — every listing endpoint so far is channel-scoped (`GET /channels/:nickname/videos`, `GET /channels/me/videos`, per `phase-04-video-channel-management/TD-05`) or anchor-relative (`GET /videos/public/:publicId/suggested`, per `phase-05-video-watch-page/TD-03`). Phase 07 needs the first cross-channel, platform-wide feed: `published` + `visibility = public` videos from any channel, optionally narrowed by `category` (the existing `VideoCategory` enum) and/or a free-text query matching the video title OR the owning channel's name/nickname. Filtering by `category` alone is a plain equality `WHERE`, already resolved by this project's established TypeORM conventions — the only genuinely open question is the title/channel-name search strategy, which this TD covers.

**Options:**

### Option A: `ILIKE` substring match with trigram indexes (`pg_trgm`)
- `WHERE videos.title ILIKE '%:q%' OR channels.name ILIKE '%:q%'`, backed by `CREATE EXTENSION pg_trgm` + GIN trigram indexes on `title` and the channel's `name`/`nickname` so substring scans stay fast as the catalog grows.
- **Pros:** matches any substring anywhere in the title/name, with no query syntax for the user to learn; trivial to express with TypeORM's QueryBuilder; `pg_trgm` is a stock Postgres extension — no new infrastructure.
- **Cons:** no relevance ranking (only match/no-match) — ordering falls entirely to whatever TD-02 settles (e.g., recency); weaker typo-tolerance than real full-text search.

### Option B: PostgreSQL full-text search (`tsvector`/`tsquery`, GIN index, `ts_rank`)
- A generated `search_vector tsvector` column (title + description) plus a separate `plainto_tsquery` match against the joined channel name, GIN-indexed; results ordered by `ts_rank`.
- **Pros:** real relevance ranking and stemming/stop-word handling, still zero new infrastructure (native Postgres feature).
- **Cons:** stemming is tuned for prose, not creator/brand names — exactly what channel-name matching needs — so a `tsvector` rank on titles and a separate plain match on channel names end up as two different matching semantics inside one query; more SQL surface than Option A for a catalog this project's scale does not yet require ranking for.

### Option C: External search engine (Meilisearch / Typesense / Algolia)
- Videos and channels indexed into a dedicated search service on write; the home page's search calls the engine instead of Postgres.
- **Pros:** typo-tolerant, sub-10ms search, and category+search faceting at any catalog size — the standard answer for a mature product's search.
- **Cons:** a brand-new infrastructure service (self-hosted = another Compose service plus index-sync-on-write plumbing; hosted = a new external dependency and cost) for a catalog with no evidence it will ever need this — against this project's stated principle of not designing for hypothetical future scale.

**Recommendation:** **Option A** — zero new infrastructure, and consistent with this project's repeated pattern (pg-boss over BullMQ in Phase 03, Server Components over TanStack Query in Phase 04) of preferring the tool already in the stack until the catalog's real scale demands a purpose-built one. Relevance ranking (B) and a dedicated search engine (C) are both premature for a platform whose current catalog is the output of one course project.

**Decision:** A (`ILIKE` + `pg_trgm`)
**Libraries:** —

---

## TD-02: Home Feed Pagination Strategy

**Scope:** Cross-layer

**Capability:** "Pagination or infinite scroll in video listings"

**Context:** `phase-04-video-channel-management/TD-05` chose offset/limit for the app's first two paginated lists — both explicitly channel-scoped and low-insert-rate — and named this exact moment in advance: "Phase 07's home page — a global, much higher-traffic feed — is the point where [cursor pagination]'s stability guarantee starts to matter." This TD is that flagged revisit, scoped only to the new home-feed endpoint from TD-01; the existing channel-scoped lists (dashboard, public channel page) keep TD-05's offset/limit contract unchanged.

**Options:**

### Option A: Keep offset/limit (`?page=&limit=`), same contract as every existing list
- Reuses the exact `{ items, total, page, limit }` shape and `skip`/`take` QueryBuilder pattern TD-05's two lists already established.
- **Pros:** zero new code pattern anywhere in the stack; trivially supports a numbered-page UI if ever wanted.
- **Cons:** the concurrent-insert instability TD-05 explicitly deemed a non-issue for channel-scoped lists is now live — videos publish continuously across the whole platform, so a page boundary can skip or duplicate a row mid-scroll, exactly as TD-05's own analysis predicted for this scenario.

### Option B: Cursor/keyset pagination (`?cursor=&limit=`, opaque cursor on `(published_at, id)`)
- **Pros:** stable under concurrent writes — a newly published video never shifts or duplicates rows a user has already scrolled past; consistent query performance regardless of how deep the cursor is, unlike `OFFSET n` which degrades as `n` grows on a fast-growing table.
- **Cons:** no numbered-page UI (immaterial — the phase bullet asks for "pagination OR infinite scroll," and infinite scroll is naturally cursor-shaped); more implementation surface (cursor encode/decode, tie-breaker column) than offset math, a cost TD-05's own analysis already scoped precisely for this later phase.

**Recommendation:** **Option B** — this is precisely the scenario TD-05 named in advance as cursor pagination's moment to earn its cost: a global, continuously-growing, high-traffic feed where offset's correctness risk stops being theoretical. TD-05's offset/limit contract stays untouched for the channel-scoped lists it already governs.

**Decision:** A (Keep offset/limit, same contract as every existing list)
**Note:** Decision deliberately diverged from the Recommendation — the user chose to keep the existing offset/limit contract uniform across every list in the app rather than introduce a second pagination shape (cursor) for the home feed alone. Revisit if the global feed's concurrent-insert instability becomes an observed problem in production.
**Libraries:** —

---

## TD-03: Frontend Home Feed Data-Fetching & Infinite Scroll Pattern

**Scope:** Frontend

**Capability:** Transversal — covers: "Home page with a video grid (thumbnail, title, channel, views, and publish time)", "Pagination or infinite scroll in video listings"

**Context:** `phase-04-video-channel-management/TD-06` picked Server Component + `searchParams` (no client cache) for the app's first two lists, and explicitly deferred TanStack Query/SWR "for Phase 07's home page if that phase's UX genuinely calls for infinite scroll... Option C cannot express well." TD-02 above settles the wire contract (cursor pagination); this TD settles how the home page screen consumes it.

**Options:**

### Option A: Server Component + `searchParams` cursor, "Load more" `<Link>` (extends TD-06 unchanged)
- The home page RSC reads `?cursor=` from `searchParams`, fetches that page server-side, and renders a "Load more" link whose `href` carries the next cursor.
- **Pros:** zero new dependency, consistent with every screen shipped so far; no second cache layer.
- **Cons:** each "Load more" click re-renders the whole grid segment rather than appending to it — for a feed meant to feel like continuous scrolling, this is materially worse than true infinite scroll, and is exactly the gap TD-06 flagged for this phase to resolve.

### Option B: Client Component + `IntersectionObserver`, fetching pages via the BFF, appended to local state
- A sentinel element triggers a `fetch()` against the BFF (`/api/videos/public?cursor=...`) when scrolled into view; new items are appended to a `useState` array. First page still renders server-side (SEO, first paint) via the existing RSC pattern; only subsequent pages are client-appended.
- **Pros:** true infinite scroll with zero new dependency — extends this project's repeated preference for native browser/framework primitives over a client-cache library to the one screen whose UX genuinely needs it, exactly the carve-out TD-06 anticipated.
- **Cons:** the first hand-rolled client-side fetch/loading/error state in the app — `TanStack Query`'s `useInfiniteQuery` would handle this generically, here it is written once, for one screen.

### Option C: TanStack Query (`useInfiniteQuery`)
- **Pros:** the purpose-built solution — richest infinite-scroll ergonomics, request dedup, background refetch.
- **Cons:** reopens the exact new-client-cache-layer cost this project has declined twice already (Phase 02, Phase 04); adopting it for one screen while every other list stays on the Server Component pattern creates the two-competing-data-fetching-philosophies problem `social-interactions/TD-06`'s own analysis already flagged as worth avoiding project-wide.

**Recommendation:** **Option B** — this is precisely the UX case TD-06 carved out in advance, and the resolution that fits is a hand-rolled `IntersectionObserver` + `fetch`, not a full client-cache library: true infinite scroll without the second-cache-layer cost this project has declined twice for lesser needs. First-page SSR is kept for SEO/first-paint; only continued scrolling becomes client-driven.

**Decision:** B (Client Component + `IntersectionObserver`, fetching pages via the BFF, appended to local state)
**Note:** The fetch target uses `?page=` (not `?cursor=`) per TD-02's decision to keep offset/limit pagination uniform across the app — this TD's Option B prose above predates that decision and mentions `?cursor=` illustratively; the query param name changes, the client-fetch architecture does not.
**Libraries:** —

---

## TD-04: Header/Navbar Architecture & Mobile Navigation Pattern

**Scope:** Frontend

**Capability:** Transversal — covers: "Header/navbar with logo, search bar, login/avatar button, and navigation", "Responsive layout for mobile devices" (narrowed to navigation-specific responsiveness — general grid/content reflow elsewhere in the app already follows the Tailwind mobile-first conventions used since Phase 01, no TD needed there)

**Context:** No shared header or navigation shell exists in `next-frontend/` today — `app/layout.tsx` renders only `{children}`; every screen shipped so far is a self-contained route with no persistent chrome, and `social-interactions/TD-01`'s own context note explicitly named this phase as the owner of the header/navbar to avoid duplicating the work early. The visual design already exists: Phase 04's Figma pass committed the full icon set (`sidebar-toggle-hamburger.svg`, `header-search-icon.svg`, `header-create-camera-icon.svg`, `nav-home-icon.svg`, `nav-subscriptions-icon.svg`, `nav-your-videos-icon.svg`, `nav-liked-videos-icon.svg`) under `docs/phases/phase-04-video-channel-management/figma-assets/`, unused until now. What remains open is the technical architecture: where the shell lives in the App Router tree, how the search input syncs to the URL, and how the sidebar collapses on mobile.

> Note: the committed `nav-liked-videos-icon.svg` implies a "Liked videos" nav destination, but no phase in `docs/project-plan.md` commissions a "Liked videos" page. Out of scope for this document — a capability gap to flag for the user, not a TD to resolve here.

**Options:**

### Option A: Header + sidebar rendered in the root `app/layout.tsx`, wrapping every route
- A single `<AppShell>` (header + collapsible sidebar) added directly to the root layout, so every route — home, watch, dashboard, channel, subscriptions, auth — gets the same chrome.
- **Pros:** one implementation, no duplication; matches the Figma pass's evidently generic (not home-page-specific) icon set.
- **Cons:** the four auth screens were deliberately built chrome-less — a focused, one-task screen per `phase-02-auth-frontend`'s established pattern — and wrapping them in the same shell regresses that intentional focus without any capability asking for it.

### Option B: Header + sidebar rendered in a route-group layout (e.g., `app/(main)/layout.tsx`), auth routes excluded
- The same `<AppShell>`, placed in a new route group's `layout.tsx` covering home/watch/dashboard/channel/subscriptions; the auth route group keeps its existing bare, chrome-less layout.
- **Pros:** every "browsing" screen gets the shell in one place while preserving the auth flow's established chrome-less pattern — no regression, no per-screen duplication.
- **Cons:** requires moving several already-shipped route folders into a new route group — a mechanical, low-risk refactor, but a real file move across prior phases' work.

**Recommendation:** **Option B** — Option A's one-file simplicity is outweighed by silently changing four already-shipped, deliberately chrome-less auth screens; a route group scoped to "everything except auth" gets the same one-shell benefit without that regression. On mobile, the sidebar collapses behind the existing `sidebar-toggle-hamburger.svg` toggle via a local `open` boolean in the `AppShell` client wrapper (no new state-management dependency, consistent with this project's preference for local `useState` over a global store for transient UI flags); the header's search input is a debounced Client Component pushing `?q=` onto the current route via `useRouter().push`, read back by the home page RSC's `searchParams` per TD-01's contract.

**Decision:** B (Route-group layout, auth routes excluded)
**Libraries:** —

---

## TD-05: Production Deployment Topology, Hosting Platform & Object Storage Provider

**Scope:** Repo-wide

**Capability:** "Production environment and deployment"

**Context:** Nothing in this repository targets production today — both subprojects run exclusively via their own dev `compose.yaml` (deliberately separate stacks per `next-frontend-config-base/TD-03`), the architecture diagram names "S3-compatible storage" for production without naming a provider (MinIO is dev-only, per `phase-03-videos/TD-01`), and the root `CLAUDE.md` states the project "runs entirely in Docker containers." The background video-processing worker (`phase-03-videos/TD-03`: a dedicated, long-running process consuming `pg-boss` jobs) rules out a pure-serverless target for the backend — whatever hosts `nestjs-api` must also run `video-worker` as a persistent process, not a request-triggered function.

**Options:**

### Option A: Single VPS, root-level `compose.yaml`, self-hosted everything
- One host (e.g., Hetzner/DigitalOcean) runs `docker compose up` for every service — `next-frontend`, `nestjs-api`, `video-worker`, `db`, `minio`, an SMTP relay — unifying the two subprojects' currently-separate compose files into one root-level file for the first time.
- **Pros:** literally "runs entirely in Docker containers," the architecture principle already stated; cheapest at this project's scale (roughly $5–10/mo); zero platform-specific rewrites — the same Dockerfiles built for dev run in prod.
- **Cons:** every operational concern (OS patching, TLS, backups, zero-downtime deploys, monitoring, single point of failure) becomes this project's own responsibility with no managed safety net — a meaningful burden for a course project with one maintainer.

### Option B: Managed multi-provider split (Vercel for `next-frontend`, a container platform for `nestjs-api`/`video-worker`, managed Postgres, S3-compatible storage)
- `next-frontend` deploys to Vercel (its own build pipeline, not the project's Dockerfile); `nestjs-api` and `video-worker` deploy as two services to a container platform from the existing `nestjs-project/Dockerfile`; Postgres via a managed provider; object storage via Cloudflare R2 or AWS S3.
- **Pros:** each piece runs on infrastructure purpose-built for it — Vercel's Next.js optimizations, a managed Postgres with backups out of the box, R2's zero egress fees matching the "large video files" cost concern already named in `docs/project-plan.md`'s Points of Attention.
- **Cons:** **diverges from the stated "runs entirely in Docker containers" architecture** for the frontend specifically (Vercel does not run this project's Dockerfile); four-plus separate provider accounts to configure and keep credentials in sync across, for a project that has minimized external dependencies at every prior phase (pg-boss over BullMQ, Server Components over a client-cache library).

### Option C: Single managed container platform running Docker images for every service, no VPS
- One platform account (e.g., Render or Railway), multiple services each built from the existing Dockerfiles (`next-frontend`, `nestjs-api`, `video-worker`), plus that platform's managed Postgres add-on; object storage via Cloudflare R2 (the researched platforms have no native S3-compatible storage of their own).
- **Pros:** keeps the "everything is a Docker container built from this repo's Dockerfiles" principle — unlike Option B's Vercel piece — while removing Option A's VPS ops burden: the platform handles TLS, zero-downtime deploys, and basic monitoring. Current pricing research (September 2026) confirms Render still offers a genuinely free compute tier with no credit card required, sufficient for a course project's traffic.
- **Cons:** still several services to wire together (frontend, api, worker, storage) across two dashboards (the platform + Cloudflare R2) — more moving parts than Option A's single host; free-tier services sleep on inactivity, adding cold-start latency unless upgraded to a paid instance.

**Recommendation:** **Option C** — the closest match to this project's own stated Docker-first architecture without taking on Option A's full unmanaged-VPS operational burden, disproportionate for one maintainer. Cloudflare R2 fills the "S3-compatible production storage" role the architecture diagram already names, at zero egress cost for a video-heavy workload. Option B's per-service specialization is real but costs the architectural consistency this project has maintained since Phase 01.

**Decision:** C (Single managed container platform running Docker images for every service, no VPS — e.g. Render or Railway, with Cloudflare R2 for object storage)
**Libraries:** —

---

## TD-06: CI Pipeline — Automated Gates & Main-Flow Test Execution

**Scope:** Repo-wide

**Capability:** Transversal — covers: "Tests for the platform's main flows", "Production environment and deployment"

**Context:** No CI exists in this repository (`.github/` is absent) despite the root `CLAUDE.md`'s Definition of Done requiring the full test suite, `tsc --noEmit`, and lint to pass before any task is finished — today that is entirely manual, self-reported discipline per PR. This phase's "tests for the platform's main flows" bullet, arriving alongside the first real production target (TD-05), is the natural point to automate those gates and decide whether a full-stack journey test (signup → upload → publish → watch → comment, spanning every phase built so far) runs in CI — a real run needs Postgres + MinIO/R2 + the FFmpeg-based worker actually processing a file, not just mocked collaborators.

**Options:**

### Option A: GitHub Actions — lint + `tsc --noEmit` + unit/integration tests per subproject on every PR; main-flow E2E excluded from CI
- Two jobs (one per subproject), each against a Postgres service container; no MinIO/FFmpeg service, so the full upload→process→watch journey is never exercised in CI.
- **Pros:** fast (minutes), no new infra to stand up in the runner, immediately covers the large majority of regressions — this project's existing 250+ backend tests plus the frontend's equivalent suite.
- **Cons:** the literal "main flows" capability — a real cross-phase user journey — stays untested by CI; an end-to-end-only regression (e.g., a broken presigned-URL handshake between `nestjs-api` and object storage) ships undetected until manual QA.

### Option B: GitHub Actions — Option A's gates, plus a full-stack main-flow job running the existing Playwright `.e2e-spec.ts` suite (already authored per-phase via `plan-test-specs`) against a real `docker compose` stack
- Adds one job spinning up Postgres, object storage, `nestjs-api`, `video-worker`, and `next-frontend` via Docker Compose, then runs the Playwright specs this project has already been producing every phase (`subscriptions.e2e-spec.ts`, `video-watch-page.e2e-spec.ts`, etc.) plus new cross-phase journey specs, against the real stack.
- **Pros:** genuinely exercises "the platform's main flows," reusing test files this project already authors each phase — no new test-authoring tool, just a CI job that runs them against real infrastructure instead of only ever running once, manually, on a developer's machine; catches integration failures Option A's mocked/unit-scoped tests structurally cannot.
- **Cons:** materially slower CI (full Compose boot plus real FFmpeg processing takes real wall-clock time) and a larger runner footprint (Postgres, storage, two Node apps, and FFmpeg simultaneously) — a cost this project has not had to reason about before.

**Recommendation:** **Option B** — this phase is explicitly named for "tests for the platform's main flows," and the Playwright specs that job would run already exist from every phase since 05; the CI job is the missing piece that actually executes them against a real stack. Gate Option A's fast jobs on every PR (required to merge); the slower full-stack job can run on PRs to `dev`/`main` only, or nightly, if wall-clock time becomes real friction — that cadence tuning is a CI-config detail for `implement`, not a further TD.

**Decision:** B (GitHub Actions — fast gates on every PR + full-stack main-flow E2E job). Main-flow journeys scope (per `AMB-2` resolution): signup→confirmation→login; upload→publish→watch; comment/like/subscribe; search→watch — one happy-path run per capability area, not per-phase edge cases.
**Libraries:** —

---

## Decisions Summary

| ID | Scope | Decision | Recommendation | Choice |
|----|-------|----------|---------------|--------|
| TD-01 | Cross-layer | Home feed listing & search query contract | A (`ILIKE` + `pg_trgm`) | A |
| TD-02 | Cross-layer | Home feed pagination strategy | B (Cursor/keyset) | A (diverged — see Note) |
| TD-03 | Frontend | Home feed data-fetching & infinite scroll pattern | B (Client `IntersectionObserver` + `fetch`, no library) | B |
| TD-04 | Frontend | Header/navbar architecture & mobile navigation | B (Route-group layout, auth excluded) | B |
| TD-05 | Repo-wide | Production deployment topology, hosting & object storage | C (Managed container platform, single Docker-first host) | C |
| TD-06 | Repo-wide | CI pipeline & main-flow test execution | B (GitHub Actions + full-stack E2E job) | B |

---

## Sources consulted during research

- `docs/project-plan.md` — Phase 07 capability bullets and Points of Attention.
- `docs/decisions/technical-decisions-phase-04-video-channel-management.md` (TD-01 category model, TD-05 pagination, TD-06 FE data-fetching) — both TD-05 and TD-06 explicitly name Phase 07 as the point to revisit their choices.
- `docs/decisions/technical-decisions-phase-03-videos.md` (TD-01 storage client, TD-02/TD-03 queue/worker deployment model, TD-08 Compose topology) — constrains the production deployment options (persistent worker process, S3-compatible storage, no Redis).
- `docs/decisions/technical-decisions-social-interactions.md` — TD-01's context note naming Phase 07 as owner of the header/navbar; TD-06's cross-cutting-data-fetching-philosophy argument reused in TD-03 above.
- `docs/decisions/technical-decisions-next-frontend-config-base.md` — BFF/env conventions, separate-Compose-stacks precedent.
- `docs/phases/phase-04-video-channel-management/figma-reference.md` — existing header/sidebar icon set committed but unused.
- `nestjs-project/src/videos/videos.controller.ts`, `videos.service.ts`, `channels.controller.ts` — current listing/query conventions (`page`/`limit`, `createQueryBuilder`, response shapes).
- `next-frontend/app/layout.tsx`, `app/page.tsx` — confirmed no shared header/nav shell exists; home page is still the framework scaffold.
- Web search, September 2026: Render/Railway/Fly.io pricing and free-tier landscape for TD-05 (Render articles, "Platforms with a real free tier for developers in 2026"; dev.to and independent 2026 pricing comparisons) — confirms Render's free compute tier and managed Postgres pricing are current as of this research.
