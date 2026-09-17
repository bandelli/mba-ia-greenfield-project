---
kind: phase
name: phase-07-home-search-launch
sources_mtime:
  docs/project-plan.md: "2026-09-16T22:49:40Z"
  docs/decisions/technical-decisions-home-search-launch.md: "2026-09-16T23:40:02Z"
  docs/decisions/technical-decisions-next-frontend-msw-foundation.md: "2026-09-16T22:49:40Z"
  docs/decisions/technical-decisions-next-frontend-openapi-typing.md: "2026-09-08T00:58:17Z"
  docs/decisions/technical-decisions-next-frontend-config-base.md: "2026-09-08T00:58:17Z"
  docs/decisions/technical-decisions-openapi-docs-nestjs.md: "2026-09-16T22:49:40Z"
  docs/phases/phase-01-configuracao-base/context.md: "2026-09-16T22:49:40Z"
  docs/phases/phase-02-auth/context.md: "2026-09-16T22:49:40Z"
  docs/phases/phase-02-auth-frontend/context.md: "2026-09-16T22:49:40Z"
  docs/phases/phase-03-videos/context.md: "2026-09-16T22:49:40Z"
  docs/phases/phase-04-video-channel-management/context.md: "2026-09-16T22:49:40Z"
  docs/phases/phase-05-video-watch-page/context.md: "2026-09-16T22:49:40Z"
  docs/phases/phase-06-social-interactions/context.md: "2026-09-16T22:49:40Z"
  .claude/skills/testing-guide-nestjs-project/SKILL.md: "2026-09-08T00:58:17Z"
  .claude/skills/testing-guide-next-frontend/SKILL.md: "2026-09-08T00:58:17Z"
  docs/inventories/screen-inventory-phase-07-home-search-launch.md: "2026-09-16T23:14:13Z"
---

# phase-07-home-search-launch — Context

## Scope

**Phase name:** Home Page, Search, and Wrap-up

**Capabilities** (literal, `docs/project-plan.md`):

- Home page with a video grid (thumbnail, title, channel, views, and publish time)
- Video filter by category on the home page
- Search bar (search by title and channel)
- Header/navbar with logo, search bar, login/avatar button, and navigation
- Pagination or infinite scroll in video listings
- Responsive layout for mobile devices
- Tests for the platform's main flows
- Production environment and deployment

**Out of scope:** Not specified in `docs/project-plan.md`. Resolved during `/screen-inventory`: the "LIVE" broadcast card variant and the "verified channel" badge are visible in the Figma source but explicitly out of scope for this phase (user decision, 2026-09-16). Search has no dedicated results screen — it filters the Home grid inline via `?q=`.

**Deliverables:** home page, search, navigation, responsiveness, tests completed, and production environment configured.

**Affected subprojects:** Not explicitly named in the phase's project-plan.md text (no `Subprojects:` line). In practice: `nestjs-project/` (global listing/search endpoint) and `next-frontend/` (home screen, shared header/navbar shell) per the decisions doc and screen inventory; deployment/CI work is repo-wide with no dedicated subproject directory.

**Deferred subprojects:** None.

**Sequencing notes:** "Depends on: all previous phases" — Phase 07 is the wrap-up phase, following Phases 01–06.

**Neighbors (for boundary detection only):**

- **Phase 06:** Social Interactions (Likes, Comments, Subscriptions) — depends on Phase 02, Phase 05.
- **Phase 08:** None — Phase 07 is the last phase in `docs/project-plan.md` (the next section is "4. Points of Attention", not another phase).

## Decisions Index

| Ref | Source | Scope | Topic | Status | Decision | Libraries |
|-----|--------|-------|-------|--------|----------|-----------|
| home-search-launch/TD-01 | phase | Cross-layer | Home Feed Listing & Search Query Contract | decided | A | — |
| home-search-launch/TD-02 | phase | Cross-layer | Home Feed Pagination Strategy | decided | A | — |
| home-search-launch/TD-03 | phase | Frontend | Frontend Home Feed Data-Fetching & Infinite Scroll Pattern | decided | B | — |
| home-search-launch/TD-04 | phase | Frontend | Header/Navbar Architecture & Mobile Navigation Pattern | decided | B | — |
| home-search-launch/TD-05 | phase | Repo-wide | Production Deployment Topology, Hosting & Storage Provider | decided | C | — |
| home-search-launch/TD-06 | phase | Repo-wide | CI Pipeline — Automated Gates & Main-Flow Test Execution | decided | B | — |

_Source files:_

- home-search-launch — `docs/decisions/technical-decisions-home-search-launch.md` (scope_type: phase, related_phases: [7])

## Capability Coverage

| Capability (from project-plan.md) | Covered by |
|-----------------------------------|------------|
| Home page with a video grid (thumbnail, title, channel, views, and publish time) | home-search-launch/TD-01, home-search-launch/TD-03 |
| Video filter by category on the home page | home-search-launch/TD-01 |
| Search bar (search by title and channel) | home-search-launch/TD-01 |
| Header/navbar with logo, search bar, login/avatar button, and navigation | home-search-launch/TD-04 |
| Pagination or infinite scroll in video listings | home-search-launch/TD-02, home-search-launch/TD-03 |
| Responsive layout for mobile devices | home-search-launch/TD-04 |
| Tests for the platform's main flows | home-search-launch/TD-06 |
| Production environment and deployment | home-search-launch/TD-05, home-search-launch/TD-06 |

## Decisions Detail

### home-search-launch/TD-01

**Recommendation:** zero new infrastructure, and consistent with this project's repeated pattern (pg-boss over BullMQ in Phase 03, Server Components over TanStack Query in Phase 04) of preferring the tool already in the stack until the catalog's real scale demands a purpose-built one. Relevance ranking (B) and a dedicated search engine (C) are both premature for a platform whose current catalog is the output of one course project.
**Libraries:** —

### home-search-launch/TD-02

**Recommendation:** this is precisely the scenario TD-05 named in advance as cursor pagination's moment to earn its cost: a global, continuously-growing, high-traffic feed where offset's correctness risk stops being theoretical. TD-05's offset/limit contract stays untouched for the channel-scoped lists it already governs. _(Decided A — diverges from this recommendation; see the decisions doc's Note field.)_
**Libraries:** —

### home-search-launch/TD-03

**Recommendation:** this is precisely the UX case TD-06 carved out in advance, and the resolution that fits is a hand-rolled `IntersectionObserver` + `fetch`, not a full client-cache library: true infinite scroll without the second-cache-layer cost this project has declined twice for lesser needs. First-page SSR is kept for SEO/first-paint; only continued scrolling becomes client-driven.
**Libraries:** —

### home-search-launch/TD-04

**Recommendation:** Option A's one-file simplicity is outweighed by silently changing four already-shipped, deliberately chrome-less auth screens; a route group scoped to "everything except auth" gets the same one-shell benefit without that regression. On mobile, the sidebar collapses behind the existing `sidebar-toggle-hamburger.svg` toggle via a local `open` boolean in the `AppShell` client wrapper (no new state-management dependency, consistent with this project's preference for local `useState` over a global store for transient UI flags); the header's search input is a debounced Client Component pushing `?q=` onto the current route via `useRouter().push`, read back by the home page RSC's `searchParams` per TD-01's contract.
**Libraries:** —

### home-search-launch/TD-05

**Recommendation:** the closest match to this project's own stated Docker-first architecture without taking on Option A's full unmanaged-VPS operational burden, disproportionate for one maintainer. Cloudflare R2 fills the "S3-compatible production storage" role the architecture diagram already names, at zero egress cost for a video-heavy workload. Option B's per-service specialization is real but costs the architectural consistency this project has maintained since Phase 01.
**Libraries:** —

### home-search-launch/TD-06

**Recommendation:** this phase is explicitly named for "tests for the platform's main flows," and the Playwright specs that job would run already exist from every phase since 05; the CI job is the missing piece that actually executes them against a real stack. Gate Option A's fast jobs on every PR (required to merge); the slower full-stack job can run on PRs to `dev`/`main` only, or nightly, if wall-clock time becomes real friction — that cadence tuning is a CI-config detail for `implement`, not a further TD.
**Libraries:** —

## Inherited Decisions Detail

### phase-01-configuracao-base/TD-01

**Recommendation:** Option A (@nestjs/config) — Official, core-team-maintained, guaranteed NestJS 11 compatibility. The `registerAs()` factory pattern solves the TypeORM CLI sharing problem: the factory function can be imported as a plain function by `data-source.ts` while also serving as a DI injection token inside NestJS. Building a custom module recreates solved functionality; third-party packages carry maintenance risk.
**Libraries:** `@nestjs/config@^4.x`

### phase-01-configuracao-base/TD-02

**Recommendation:** Option A (Joi) — First-class integration with `@nestjs/config` via `validationSchema`, requiring zero custom wiring. Handles string-to-number coercion natively. Using a different tool for env validation vs. request validation is reasonable — env config is validated once at startup, DTOs are validated per-request. Zod is elegant but adds a third validation paradigm to the project.
**Libraries:** `joi@^17.x`

### phase-01-configuracao-base/TD-03

**Recommendation:** Option B (Namespaced/grouped with registerAs) — The project roadmap explicitly calls for auth, email, and storage in upcoming phases. Namespaced configs provide clear file boundaries per domain, typed injection via `ConfigType<typeof databaseConfig>`, and natural scalability. The `registerAs()` factory is dual-purpose: DI token inside NestJS and plain importable function for `data-source.ts`.
**Libraries:** —

### phase-01-configuracao-base/TD-04

**Recommendation:** Option A (Shared registerAs factory) — Natural outcome of choosing `@nestjs/config` with `registerAs`. The factory is already callable by design. `data-source.ts` imports it, calls `dotenv.config()`, then calls the factory. Zero duplication, minimal code, no extra abstraction.
**Libraries:** `dotenv` (transitive via `@nestjs/config`)

### phase-02-auth/TD-01

**Recommendation:** Argon2id — For a greenfield project in 2026, Argon2id is the OWASP-recommended choice. The native build dependency is a one-time Docker setup cost. The project has no legacy constraints favoring bcrypt. OWASP minimum: 19MiB memory, 2 iterations.
**Libraries:** `argon2@^0.41.x`

### phase-02-auth/TD-02

**Recommendation:** Option A (@nestjs/passport) — The project plan includes only email/password auth for now, but the plugin architecture costs little and future phases may add social login. Aligns with official NestJS docs, making onboarding and maintenance easier.
**Note:** Decision deliberately diverged from the Recommendation during implementation — custom guards were preferred over `@nestjs/passport` to keep the dependency surface smaller; social login is not on the near-term roadmap, so the plugin-architecture benefit did not justify the extra abstraction layer.
**Libraries:** `@nestjs/jwt@^11.0.0`

### phase-02-auth/TD-03

**Recommendation:** Option A (Refresh Token Rotation) — Provides the strongest security model with automatic theft detection. The DB write overhead is acceptable for a video platform (auth refresh is infrequent vs. video operations). PostgreSQL is already in the stack, so no new infrastructure needed. Race conditions can be mitigated with a short grace period for the old token.
**Libraries:** —

### phase-02-auth/TD-04

**Recommendation:** Option B (Random Opaque Tokens in DB) — Revocability is important: when a user requests a new password reset, previous tokens should be invalidated. The DB table is trivial to implement, and the tokens table can also serve future needs (e.g., API keys). Keeps email tokens decoupled from the JWT auth system.
**Libraries:** —

### phase-02-auth/TD-05

**Recommendation:** Option A (@nestjs-modules/mailer) — Best NestJS integration with minimal boilerplate. Supports SMTP (matching the architecture diagram), works with MailHog/Mailpit for local development without external dependencies, and scales to any SMTP provider in production. Template engine support (Handlebars) simplifies email formatting. No vendor lock-in.
**Libraries:** `@nestjs-modules/mailer@^2.x`, `handlebars@^4.x`

### phase-02-auth/TD-06

**Recommendation:** Option A (class-validator + class-transformer) — This is a backend-only project (no shared schemas with frontend), so Zod's single-source-of-truth advantage is less impactful. class-validator is the documented NestJS approach, and the project already uses decorators extensively (TypeORM entities, NestJS DI). Fewer integration surprises with NestJS 11.
**Libraries:** `class-validator@^0.14.x`, `class-transformer@^0.5.x`

### phase-02-auth/TD-07

**Recommendation:** Option A (Custom Domain Exception Filter) — Provides machine-readable error codes that the Next.js frontend can switch on, without the overhead of RFC 9457's URI-based type system. The project is single-consumer (first-party frontend), so a simple `{ statusCode, error, message }` format with domain codes balances clarity and simplicity.
**Libraries:** —

### phase-02-auth/TD-08

**Recommendation:** Option A (@nestjs/throttler) — Native NestJS integration is decisive: the guard system allows scoping rate limiting to `AuthModule` only via module-level `APP_GUARD`, with `@SkipThrottle()` for exemptions. The project is single-instance with no distributed requirements, so in-memory storage is sufficient.
**Libraries:** `@nestjs/throttler@^6.x`

### phase-02-auth/TD-09

**Recommendation:** Option B (Opaque) — Since DB lookup is mandatory (TD-03), JWT signature adds no security value. Opaque tokens are shorter, leak no data, and are simpler to generate.
**Note:** Decision deliberately diverged from the Recommendation — JWT was kept to reuse the access-token signing/verification infrastructure (`@nestjs/jwt`), trading token size and base64-readability for a single token format across the codebase.
**Libraries:** `@nestjs/jwt@^11.0.0`

### phase-02-auth/TD-10

**Recommendation:** Option A — The platform is a video sharing service with URL-based channel handles. A strict `[a-z0-9_]` allowlist is the simplest and most portable choice: no extra dependencies, no edge cases around hyphen positioning, and the `user_<random>` fallback provides a valid handle even for extreme email prefixes.
**Libraries:** —

### phase-02-auth-frontend/TD-01

**Recommendation:** Three reasons. (1) **Architectural fit.** The strict-BFF model in `next-frontend-config-base/TD-03` already nominates the Route Handler as the only NestJS caller; cookie-based sessions are the natural match, and Auth.js's framework adds layers between the BFF and the cookie that buy nothing because the backend is the auth authority. (2) **Smaller blast radius.** A ~50-LOC session helper is grep-friendly, debuggable, and test-friendly via the existing MSW+BFF integration test pattern. (3) **Compatibility with Next.js 16 / React 19.** Built-in `next/headers` `cookies()` is the canonical primitive both runtimes already use. Option C is rejected as unsafe (`localStorage` for refresh tokens) and architecturally regressive (loses RSC personalization).
**Libraries:** —

### phase-02-auth-frontend/TD-02

**Recommendation:** Three reasons. (1) **Defense in depth on the cookie content** — `httpOnly` blocks JS, encryption blocks accidental log/proxy inspection; the marginal cost is one ~3KB dep. (2) **Single cookie to manage** simplifies logout (one `session.destroy()` call) and avoids the orphan-cookie failure mode of Option A. (3) **Room to carry minimal user metadata** (`userId`, `email`, `channelSlug`) lets `app/layout.tsx` RSC render the authenticated chrome without a per-render `/auth/me` round-trip. Option A is a viable downgrade if `iron-session` is rejected; Option C is rejected as solving a problem the project does not have.
**Libraries:** iron-session

### phase-02-auth-frontend/TD-03

**Recommendation:** The single-flight detail is non-trivial and goes in the helper from day one — tested by MSW with a "two concurrent intercepted upstream calls; one refresh expected" assertion. Option B's client-driven pattern is rejected because it doesn't replace Option A (RSC still needs server-side refresh). Option C's pre-emptive timer is rejected because the failure modes (multiple tabs, sleep/wake) outweigh the latency saving.
**Libraries:** —

### phase-02-auth-frontend/TD-04

**Recommendation:** Three reasons. (1) **Decoupled from TD-05** — works with Route Handlers OR Server Actions. (2) **Aligned with shadcn's canonical form primitive** — the project already commits to `radix-nova` shadcn; `npx shadcn@latest add form` produces react-hook-form wrappers. (3) **Zod-first developer ergonomics match the rest of the FE foundation** — `next-frontend-config-base/TD-01` chose Zod 4 for env; the same pattern carries to forms. Option B is rejected for impedance with shadcn's primitive; Option C is rejected for per-field boilerplate and loss of client-side feedback.
**Libraries:** react-hook-form, @hookform/resolvers

### phase-02-auth-frontend/TD-05

**Recommendation:** Three reasons. (1) **Strict-BFF alignment.** `next-frontend-config-base/TD-03` named Route Handlers as the BFF surface; Option A keeps every mutation visible under `app/api/**`. (2) **Test scaffold already exists** — `next-frontend/CLAUDE.md` § Testing and `next-frontend-msw-foundation` were authored for Route-Handlers-as-functions. (3) **Single mutation surface** — Phase 02 sets the precedent for Phases 03–07; uniformity beats per-mutation idiom-picking. Option B is rejected for fragmenting the BFF surface.
**Libraries:** —

### phase-02-auth-frontend/TD-06

**Recommendation:** Two reinforcing reasons. (1) **No first-render flicker, no round-trip** — the session is delivered in the same response as the page HTML; the Client Provider hydrates with the correct initial state. (2) **No new BFF endpoint** — the cookie is the source of truth, RSC reads it, the Provider broadcasts it. The `router.refresh()` requirement after mid-session mutations is a small price. Option B is rejected for the double-read-and-flicker; Option C is dominated by Option B.
**Libraries:** —

### phase-02-auth-frontend/TD-07

**Recommendation:** Three reasons. (1) **First-paint-correct** — the user sees the right outcome on the first paint, no skeleton, no flicker. (2) **Single integration pattern across both flows** — confirmation is RSC-only; reset is RSC + Client form (TD-04, TD-05 patterns reused). (3) **Email-prefetch behavior** is solved at the backend's idempotent-confirmation level. Option B's Route-Handler-as-link-target adds redirects for no clean gain. Option C is dominated.
**Libraries:** —

### phase-03-videos/TD-01

**Recommendation:** it is the dependency `@tus/s3-store` (TD-06's recommended option) already requires, so choosing it avoids a second S3 client in the tree. `endpoint` + `forcePathStyle` make the same code path work against MinIO (dev) and S3-compatible storage (prod) without branching, and `@aws-sdk/s3-request-presigner` directly serves TD-07's presigned-URL delivery mechanism.
**Libraries:** @aws-sdk/client-s3

### phase-03-videos/TD-02

**Recommendation:** the project's infrastructure footprint today is exactly PostgreSQL + an email service; introducing Redis (Option A) is justified when queue throughput or sub-second dispatch latency actually matters, and neither applies to a single-user-triggered, minutes-long video-processing job. pg-boss delivers the same retry/backoff/dead-letter primitives on infrastructure already operated and backed up.
**Libraries:** pg-boss

### phase-03-videos/TD-03

**Recommendation:** delivers the process isolation the architecture diagram calls for (API availability is never at the mercy of a stuck FFmpeg job) without paying Option C's cost of a second codebase. The only new cost over Option B is one additional Compose service and Dockerfile target, which TD-08 accounts for.
**Libraries:** —

### phase-03-videos/TD-04

**Recommendation:** directly matches the architecture diagram's self-hosted FFmpeg worker, covers both required operations (metadata via `ffprobe`, thumbnail via `screenshots()`) with a mature, well-documented API, and avoids both Option B's needless reimplementation and Option C's unwarranted vendor dependency for a scope this narrow.
**Libraries:** fluent-ffmpeg
**Revisions:**
- 2026-09-08 — Fixes the frame-selection rule for the automatic thumbnail: captures at the smaller of 1 second and 10% of the video's total duration (`min(1s, 10% of duration)`), passed as `timestamps` to `.screenshots()`. Rationale: avoids black opening/fade-in frames in both short and long videos, without requiring a second scene-detection pass.

### phase-03-videos/TD-05

**Recommendation:** the shortest URLs among the non-enumerable options, decoupled from whatever internal PK strategy the `Video` entity ends up using, and the only option that cleanly satisfies both "sem conflito" now and "unlisted, access only via link" in `phase-04` without revisiting this decision.
**Libraries:** nanoid

### phase-03-videos/TD-06

**Recommendation:** it is the only option where resumability (an explicit project-plan.md requirement) is a property of the protocol rather than custom code the team must get right for every edge case. It also gives the "automatic pre-registration when the upload starts" bullet a precise, well-documented implementation point (`onUploadCreate`). The cost — a non-REST protocol mounted as middleware — is confined to a single upload route.
**Libraries:** @tus/server, @tus/s3-store
**Revisions:**
- 2026-09-08 — Fixes the ownership model of the draft created in `onUploadCreate`: the upload endpoint requires an authenticated user (reusing the JWT guard from `phase-02-auth`), and the hook records `userId`/`channelId` on the draft `Video` at the same moment it is created — before any byte of the file is transferred. Rationale: authenticated, immediate ownership — avoids orphan drafts.

### phase-03-videos/TD-07

**Recommendation:** it is the only option that keeps video bytes off the API and BFF processes entirely, which is what "sem impacto na performance" demands once applied symmetrically to playback and download, not just upload. The CORS/exposure cost is small and well-understood; Option C solves a scaling problem this phase does not yet have.
**Libraries:** @aws-sdk/s3-request-presigner

### phase-03-videos/TD-08

**Recommendation:** every new service this phase introduces (storage, optional queue backend, worker) is consumed exclusively by `nestjs-project/`; TD-07 deliberately avoids creating a case where `next-frontend/` needs network-level access to this infrastructure. Extending the existing backend compose file is the smallest change consistent with the current one-file-per-subproject convention.
**Libraries:** —

### phase-03-videos/TD-09

**Recommendation:** it is the only option that avoids wasting upload bandwidth on obviously-wrong files (Option A's gap) while never trusting spoofable client-declared metadata as the sole guard (Option B's gap). Both checkpoints reuse hooks and dependencies TD-06 and TD-04 already require, and `@tus/server`'s own documentation demonstrates exactly this reject-and-`store.remove()` pattern in `onUploadFinish`.
**Libraries:** —

### phase-03-videos/TD-10

**Recommendation:** it is the only option that reaches both required terminal states (`ready` and `error`) under normal operation while not wasting a whole upload on a failure that a bounded retry would have recovered from for free. `pg-boss`'s `retryLimit`/`retryBackoff` options (TD-02's own dependency) implement the bounded-retry mechanics directly — no new library.
**Libraries:** —

### phase-04-video-channel-management/TD-01

**Recommendation:** it mirrors the `VideoStatus` convention already established on the same entity, requires no new table or endpoint, and the already-decided OpenAPI codegen pipeline delivers full type-safety to `next-frontend/` for free. Option B's flexibility solves a problem (admin-managed categories) that no phase of this project defines.
**Libraries:** —

### phase-04-video-channel-management/TD-02

**Recommendation:** `published_at` directly answers the dashboard's "publish time" column, `visibility` stays a clean independent concern, and a dedicated `VideoPublicationService` keeps this lifecycle out of `VideoStatusService`'s explicitly documented scope, honoring the Single Responsibility principle this project already enforces on the same entity.
**Libraries:** —

### phase-04-video-channel-management/TD-03

**Recommendation:** a thumbnail is small enough that the memory-buffering concern Option B avoids is not material, and staying inside NestJS's ordinary controller/pipe pipeline with declarative `ParseFilePipe` validation is simpler to build and reason about than adding a new CORS `PUT` surface for a marginal benefit at this file size. Option C solves a large-file problem this upload does not have.
**Libraries:** —

### phase-04-video-channel-management/TD-04

**Recommendation:** matches this project's existing domain-exception/error-envelope convention exactly, keeps the user in control of their chosen nickname, and avoids building live-availability infrastructure (Option C) that nothing in the current scope requires. Option C remains a reasonable later enhancement if real usage shows submit-time rejection is too disruptive.
**Libraries:** —

### phase-04-video-channel-management/TD-05

**Recommendation:** both lists this phase introduces are channel-scoped, where the concurrent-insert instability Option A protects against is a low-probability, low-impact edge case; simplicity now matches this project's principle against designing for hypothetical future requirements. Phase 07's home page — a global, much higher-traffic feed — is the point where Option A's stability guarantee starts to matter, and can be adopted there without this phase's channel-scoped endpoints needing to change.
**Libraries:** —

### phase-04-video-channel-management/TD-06

**Recommendation:** every screen shipped in this project so far has favored the App Router's server-first primitives over a client-side cache library, and this phase's lists are channel-scoped and moderate in size, not the global feed Phase 07 will eventually build; introducing TanStack Query or SWR now would add a second cache abstraction this phase's scope does not need. Revisit for Phase 07's home page if that phase's UX genuinely calls for infinite scroll or optimistic interactions Option C cannot express well.
**Libraries:** —

### phase-05-video-watch-page/TD-01

**Recommendation:** leaves Phase 04's owner-only surface completely untouched (no regression risk to its existing test suite), matches the single-purpose-guard convention already established for `@Public()` routes, and preserves Phase 03's public_id-only URL decision.
**Libraries:** —

### phase-05-video-watch-page/TD-02

**Recommendation:** the phase only asks to display a view count, not to build an anti-fraud analytics system; a plain atomic increment matches the project's pattern of keeping infrastructure narrowly scoped to what a capability actually needs. Can be revisited later if inflation becomes a real product problem.
**Libraries:** —

### phase-05-video-watch-page/TD-03

**Recommendation:** reuses an already-decided, already-implemented predicate and ordering with one added filter, keeping the query trivial and the behavior deterministic and easy to test; popularity- or randomness-based ranking can be layered on later without changing the access pattern.
**Libraries:** —

### phase-05-video-watch-page/TD-04

**Recommendation:** the capability list asks for exactly three controls (play/pause, volume, progress bar) against a single progressive MP4 source, so native `<video>` plus the same custom-primitive pattern used everywhere else in the app is proportionate. Introducing an external player library (B or C) would be the project's first non-design-system UI dependency, for feature sets this phase does not need.
**Libraries:** —

### phase-05-video-watch-page/TD-05

**Recommendation:** CSS Grid inlined directly in the page component is the idiomatic Tailwind tool for this fixed+fluid split, and avoids Option C's premature abstraction for what is currently a single screen.
**Libraries:** —

### phase-05-video-watch-page/TD-06

**Recommendation:** Tailwind's `line-clamp` utility plus a simple client toggle matches the Figma affordance with zero new dependencies, avoiding Option C's brittle hardcoded threshold.
**Libraries:** —

### social-interactions/TD-01

**Recommendation:** this project already chose and shipped the denormalized-atomic-counter pattern for the structurally identical `views` problem one phase ago; reusing it keeps one consistency strategy for "count of things that reference this row" across the whole app, and avoids adding 3-4 aggregate queries to the watch-page and channel-page hot paths.
**Libraries:** —

### social-interactions/TD-02

**Recommendation:** the codebase has never used a polymorphic association, real FK constraints are exactly the kind of database-enforced correctness this project has favored throughout (e.g., the `videos_status_enum`/`videos_category_enum` Postgres enums, the `channels.user_id` unique-one-to-one constraint), and three concrete tables for three concrete features is not premature abstraction avoidance — it is the simpler option outright.
**Libraries:** —

### social-interactions/TD-03

**Recommendation:** idempotency matters here specifically because `TD-06` below is expected to use optimistic UI, and an idempotent "set state" call is the only one of the three options where the client-computed optimistic state and the eventual server-confirmed state are the same request/response shape, with no separate reconciliation logic needed.
**Libraries:** —

### social-interactions/TD-04

**Recommendation:** single-level replies is both the simpler data model and the one every comparable video-platform UI (including this one's stated inspiration) actually ships; nothing in the project plan or the Figma source calls for deeper threads, so `Option B`'s unlimited-depth machinery would be built against a requirement that does not exist.
**Libraries:** —

### social-interactions/TD-05

**Recommendation:** matches this project's own precedent of not building shared navigation chrome before the phase that owns it (Phase 07), keeps this phase's scope limited to the social-interaction capabilities it is actually responsible for, and still satisfies the literal capability text ("quick access to their videos" via one click into the channel's existing video listing).
**Libraries:** —

### social-interactions/TD-06

**Recommendation:** it is the only option that delivers the instant-feedback UX this phase's interactions genuinely need without introducing the client-cache-library trade-off this project has twice declined for lesser reasons; it also keeps `TD-05`'s followed-channels list and this phase's reaction/comment/subscribe islands on the same "App Router primitives first" philosophy the rest of the app already follows.
**Renders in:** frontend-runtime
**Libraries:** —

### next-frontend-msw-foundation/TD-01

**Recommendation:** Three reasons. (1) **MSW's own best-practice recommends it** — the project should not invent its own scheme when the official one is documented and matches the codebase's domain orientation. (2) **Domain ownership tracks the codebase**, not the project plan — `components/`, `app/api/`, and any future feature folders will be organized by domain (auth, videos, channels), so handler files mirror that vocabulary and remain stable as phases come and go. (3) **Append-only growth with minimal merge conflicts** — each phase touches a new file plus one line in the barrel, which is the smallest practical concurrent-PR footprint.
**Libraries:** —

### next-frontend-msw-foundation/TD-02

**Recommendation:** The browser worker is a future capability with no documented current consumer; wiring it now (Option B) is speculative investment, and wiring it incoherently (Option C) actively misleads developers into thinking interception works when it doesn't under strict BFF. Option A keeps the foundation minimal, aligns 1:1 with everything CLAUDE.md and the existing rules currently document, and is non-breaking to extend.
**Libraries:** —

### next-frontend-msw-foundation/TD-03

**Recommendation:** (1) **Option B's determinism + readability is the right baseline** — every fixture in Phase 02 is naturally hand-written, and the diff-revealing override pattern is the highest-value benefit. (2) **Bulk-collection cases will arrive (Phase 07 home page grid, Phase 06 comment threads) and inline hand-written lists of 20+ items are genuinely tedious** — keeping faker available as a scoped tool is pragmatic. (3) **Per-fixture local seeding eliminates the global-cursor pitfall** that makes Option C structurally fragile.
**Libraries:** —

### next-frontend-msw-foundation/TD-04

**Recommendation:** The user's "import only what it needs" requirement is satisfied at the *authoring* layer by TD-01 (per-domain files; each phase adds one file). At the *runtime* layer, loading all handlers is the canonical MSW v2 model and imposes no cost on tests that don't fetch the extra URLs. `onUnhandledRequest: "error"` enforces that a phase's test cannot accidentally invoke a route outside its scope.
**Libraries:** —

### next-frontend-openapi-typing/TD-01

**Recommendation:** (1) **Strict BFF makes the SDK surface valueless on the client.** Only Route Handlers ever call the upstream Nest; they already use `fetch`. (2) **Types-first matches the rest of the FE foundation.** `paths` is the natural extension — one `.d.ts` file imported wherever the contract is touched. (3) **MSW typing is solved by the same `paths` symbol.** Adds `openapi-fetch` (~6KB, server-side only) to remove `fetch(API_URL + path, {...})` boilerplate in each Route Handler while staying within the BFF model.
**Libraries:** openapi-typescript, openapi-fetch

### next-frontend-openapi-typing/TD-02

**Recommendation:** (1) **Preserves the compose-stack independence** — neither subproject's compose file references the other. (2) **Drift is eliminated structurally when paired with TD-03's CI freshness check.** (3) **The committed local file is a real artifact in PR review** — reviewers see the contract change in `next-frontend/openapi.json`'s diff at the same time as the backend change.
**Libraries:** —

### next-frontend-openapi-typing/TD-03

**Recommendation:** It is the only option that makes contract drift both visible (in PR diffs) and impossible to merge accidentally (CI fail). The complexity premium over Option A is one CI step. Start at C; apply the same script-and-check pattern to any future generated artifact.
**Libraries:** —

### next-frontend-openapi-typing/TD-04

**Recommendation:** It is the only option that (i) handles pass-through and reshape with the same mechanism, (ii) gives a single grep target for "what shape does the BFF expose", and (iii) decouples Component imports from App Router file paths. `lib/api/contracts.ts` is the only file that imports `paths` from `types.gen.ts`; every other consumer imports from `contracts.ts`.
**Libraries:** —

### next-frontend-openapi-typing/TD-05

**Recommendation:** (1) **Determinism over auto-generation** — BFF integration tests assert on specific values. (2) **Coherence with TD-01** — `openapi-typescript`'s `paths` type is the single contract anchor. (3) **Scale fit** — Phase 02 introduces few endpoints; manual cost is negligible at this stage. Supersede with a generator later if authoring overhead becomes real, without touching TD-01's `paths` import sites.
**Libraries:** —

### next-frontend-config-base/TD-01

**Recommendation:** (1) **Type-inference matches the FE's strict-TS culture** — `lib/env.ts` exports a typed `env` object with no `as` casts. (2) **Ecosystem gravity in Next.js / React 19** — Zod is the de-facto schema language for App Router. (3) **Direct enablement of TD-02 Option A (`@t3-oss/env-nextjs`)** — t3-env's first-citizen validator.
**Libraries:** zod

### next-frontend-config-base/TD-02

**Recommendation:** The only option that combines (i) type-level `NEXT_PUBLIC_` prefix enforcement, (ii) runtime Proxy-based leak detection, and (iii) single-file, single-import-path consumer ergonomics. The marginal cost over a hand-rolled schema is one ~3KB dep — well-spent for the strongest boundary among the three options.
**Libraries:** @t3-oss/env-nextjs

### next-frontend-config-base/TD-03

**Recommendation:** Aligned with the BFF testing strategy and architectural commitment already documented in `next-frontend/CLAUDE.md` (Route Handlers as the only NestJS caller; BFF tests stub `fetch` via MSW). Eliminates CORS, eliminates public exposure of the backend URL, and produces the smallest correct foundation. Adding a public key later is a non-breaking change, while removing one is breaking.
**Libraries:** —

### openapi-docs-nestjs/TD-01

**Recommendation:** it is the only option that preserves the prior decisions (`class-validator` in phase-02-auth/TD-06) without a re-platform; the CLI plugin with `classValidatorShim: true` leverages the existing `class-validator` decorators to infer schemas, keeping boilerplate low.
**Libraries:** @nestjs/swagger
**Revisions:**
- 2026-05-12 — Clarifies that the CLI plugin (`classValidatorShim: true`) covers only DTO schema inference from `class-validator`; operation documentation, per-status responses, error contracts, and examples require explicit decorators (`@ApiOperation`, `@ApiResponse`, `@ApiBody`, `@ApiParam`, `@ApiQuery`, `@ApiExtraModels`). Rationale: enrichment via explicit decorators is part of the chosen Option A, not out-of-scope work.

### openapi-docs-nestjs/TD-02

**Recommendation:** the marginal cost over Option A is just one npm script, and the benefit is a correct foundation for future FE integration (offline codegen) without losing the interactive UI dev/QA use. Combining runtime UI + exported `openapi.json` dominates either alone.
**Libraries:** —

### openapi-docs-nestjs/TD-03

**Recommendation:** aligns with the defensive posture already established in phase 02 and doesn't compromise legitimate consumers (the `openapi.json` committed under TD-02 fulfills the role of "spec inspectable outside the UI"). Reopening as public is trivial in the future if a public-API use case emerges.
**Libraries:** —

## Inherited Conventions

- Backend config uses `@nestjs/config` with namespaced `registerAs(name, () => ({...}))` factories — one file per domain. _(from phase 01)_
- Env variables are validated by a Joi schema in `src/config/env.validation.ts`, passed to `ConfigModule.forRoot`. _(from phase 01)_
- Config is injected via `ConfigType<typeof xxxConfig>` and `@Inject(xxxConfig.KEY)`; factory is also importable outside DI. _(from phase 01)_
- `data-source.ts` loads `.env` via `import 'dotenv/config'` at the top, then imports the relevant config factory and calls it as a plain function. _(from phase 01)_
- Database connection parameters are sourced from a single `databaseConfig` factory — never duplicated between `AppModule`/`data-source.ts`. _(from phase 01)_
- `TypeOrmModule.forRootAsync` is used (not `forRoot`), with `imports: [ConfigModule]`, `inject: [databaseConfig.KEY]`, `useFactory`. _(from phase 01)_
- Password/auth: Argon2id hashing, `@nestjs/jwt`-based custom guards (not `@nestjs/passport`), refresh-token rotation, opaque tokens. _(from phase 02)_
- `class-validator` + `class-transformer` for all request validation; domain exceptions mapped by a custom exception filter. _(from phase 02)_
- `@nestjs/throttler` for rate limiting, scoped per-module via `APP_GUARD`. _(from phase 02)_
- Strict-BFF model: browser never calls the NestJS API directly; every mutation goes through a same-origin Route Handler. _(from phase 02-auth-frontend)_
- Session: `iron-session`-encrypted single cookie carrying access + refresh + minimal user fingerprint; RSC reads it server-side. _(from phase 02-auth-frontend)_
- Forms: `react-hook-form` + `@hookform/resolvers/zod`; mutation submission via Route Handler `POST` + client `fetch`. _(from phase 02-auth-frontend)_
- Uploads/storage: presigned S3-compatible URLs (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`), never proxying bytes. _(from phase 03)_
- Background jobs via `pg-boss` (Postgres-backed queue, no Redis) — bounded retry/backoff via `retryLimit`/`retryBackoff`. _(from phase 03)_
- Public/short IDs generated via `nanoid`, decoupled from the internal UUID primary key. _(from phase 03)_
- `VideoStatus`/`VideoCategory`/`VideoVisibility` are Postgres enum columns on the `Video` entity, mirrored 1:1 in TS enums. _(from phase 04)_
- Channel-scoped list endpoints use **offset/limit** pagination (not cursor) — reserved for global high-concurrency feeds. _(from phase 04)_
- Frontend list screens use **Server Component + `searchParams`, no client-side cache** (no TanStack Query / SWR) for moderate lists. _(from phase 04)_
- Public/anonymous read endpoints follow a single "is this publicly visible" predicate (`published_at IS NOT NULL AND visibility = public`). _(from phase 05)_
- Atomic `UPDATE ... SET col = col + 1 RETURNING col` (via `createQueryBuilder()`) for any concurrently-incremented counter. _(from phase 05)_
- Every route gets a `loading.tsx` skeleton per the project's established convention. _(from phase 05)_

## Inherited Deferred Capabilities

| Capability | Status | Origin phase | Rationale |
|-----------|--------|--------------|-----------|
| "Frontend screens" | deferred | phase-01-configuracao-base | `next-frontend/` is not initialized in this phase; UI surfaces start in a later phase. |
| "Registration, login, account confirmation, and password recovery screens" | deferred | phase-02-auth | `next-frontend/` is not initialized in this phase; UI surfaces start in a later phase. |
| "Account confirmation via email with an activation link" | deferred | phase-02-auth-frontend | FE confirmation landing screen de-scoped 2026-05-14; picked up by a future phase. BE side unchanged in `phase-02-auth`. |
| "Logout" | deferred | phase-02-auth-frontend | Logout button lives inside authenticated chrome — expected home for it is this phase's shared header/navbar shell (TD-04). BE contract (`POST /api/auth/logout`) already exists. |
| "Password recovery (destination screen / set-new-password)" | deferred | phase-02-auth-frontend | `/forgot-password` ships the email step; the reset-password destination screen is absent from Figma — link destination remains a 404 until a later phase delivers the screen. Not in this phase's Figma source either (`docs/phases/phase-07-home-search-launch/figma-reference.md` has no reset-password frame) — still open after this phase. |
| "Registration, login, account confirmation, and password recovery screens" | deferred | phase-02-auth-frontend | Umbrella bullet; the 3 ship-this-phase screens (signup, login, forgot-password) are covered by their own verbs, confirmation/reset-destination remain deferred per the rows above. |

_Note: the "Logout" deferral is directly relevant to this phase — TD-04's screen inventory places "Sign Out" as a menu item inside the new Account User Menu (`home-search-launch` screen inventory, Home screen component table), which is the natural place to finally close this deferral._

## UI Inventory

**Source:** `docs/inventories/screen-inventory-phase-07-home-search-launch.md`
**Screens in scope:** 1

### UI ↔ Capability Join

| Screen | Route | Verb | Capability | Covering Component |
|--------|-------|------|------------|-------------------|
| Home (Catalog Show) | / | Exibir grade de vídeos com thumbnail, título, canal, visualizações e tempo de publicação | "Home page with a video grid (thumbnail, title, channel, views, and publish time)" | VideoGrid / VideoGridCard |
| Home (Catalog Show) | / | Carregar mais vídeos por scroll infinito ao alcançar o fim da grade | "Pagination or infinite scroll in video listings" | VideoGrid |
| Home (Catalog Show) | / | Filtrar vídeos da home por categoria | "Video filter by category on the home page" | CategoryFilterBar / CategoryChip |
| Home (Catalog Show) | / | Buscar vídeos por título ou nome do canal | "Search bar (search by title and channel)" | SearchBar |
| Home (Catalog Show) | / | Exibir botão de login ou avatar conforme sessão do usuário autenticado | "Header/navbar with logo, search bar, login/avatar button, and navigation" | AvatarButton |
| Home (Catalog Show) | / | Exibir identidade do usuário autenticado (avatar, nome do canal, @handle) no menu de conta | "Header/navbar with logo, search bar, login/avatar button, and navigation" | AccountMenuIdentityBlock |

### Server-connected Components

- `VideoGrid` (Home (Catalog Show)) — `Reuse?: new`
- `VideoGridCard` (Home (Catalog Show)) — `Reuse?: new`
- `CategoryFilterBar` (Home (Catalog Show)) — `Reuse?: new`
- `CategoryChip` (Home (Catalog Show)) — `Reuse?: new`
- `SearchBar` (Home (Catalog Show)) — `Reuse?: new`
- `AvatarButton` (Home (Catalog Show)) — `Reuse?: new`
- `SubscribedChannelRow` (Home (Catalog Show)) — `Reuse?: components/subscriptions/subscribed-channel-row.tsx`
- `"Show 12 more" expand control` (Home (Catalog Show)) — `Reuse?: components/subscriptions/pagination-controls.tsx`
- `AccountMenuIdentityBlock` (Home (Catalog Show)) — `Reuse?: new`
- `"Sign Out" menu item` (Home (Catalog Show)) — `Reuse?: new`

### Open Questions from Inventory

- **Sidebar active-item mismatch:** the Figma frame highlights "Liked videos" (`bg-[#272727]`) as the active/hover sidebar item instead of "Home", even though this is the Home screen. Confirm with the designer whether this is a mockup artifact (Home should be visually active on `/`) before implementing the active-state logic.
- **"Liked videos" sidebar destination:** no phase in `docs/project-plan.md` commissions a "Liked videos" page (same gap already flagged in `home-search-launch/TD-04`). The sidebar nav item is designed and will render on every screen via the shared shell (TD-04) — decide whether to build a stub page, disable/hide the item, or redirect it elsewhere before this phase ships.

## Non-UI / Deferred Capabilities

| Capability | Status | Rationale | TD refs |
|-----------|--------|-----------|---------|
| "Liked videos" sidebar nav item / destination page (discovered in Figma, `OQ-8`) | deferred | No phase in `docs/project-plan.md` commissions a "Liked videos" page. User decision (2026-09-16): hide/disable the sidebar nav item for now rather than build a stub or redirect it; revisit once a future phase defines the page. | home-search-launch/TD-04 |
| "Responsive layout for mobile devices" (`UIG-1`) | non-ui | Implemented entirely via `SidebarToggleButton`, a Local-interactive component (client-side sidebar collapse, no server call) — by the screen-inventory skill's own classification rules, only Server-connected components produce a Verbs-of-intent row, so this capability structurally never has one to give. | home-search-launch/TD-04 |
| "Tests for the platform's main flows" (`UIG-2`) | non-ui | CI/testing concern with no UI surface to inventory — covered by the CI pipeline decision, not a screen component. | home-search-launch/TD-06 |
| "Production environment and deployment" (`UIG-3`) | non-ui | Infrastructure/hosting concern with no UI surface to inventory — covered by the deployment topology decision, not a screen component. | home-search-launch/TD-05, home-search-launch/TD-06 |

## Testing Requirements

### nestjs-project

| Artifact created | Required tests |
|---|---|
| Entity (`*.entity.ts`) | Integration: constraints, defaults, `select: false` |
| Service with branching + DB | Unit: branch logic (mock repo) + Integration: DB contract |
| Service with DB only (no branching) | Integration: DB contract |
| Service with configured lib (JWT, cache) | Unit: real lib with test config |
| Service with side-effect dep (email, storage) | Integration: real capture service (Mailpit) or local adapter |
| Module with configured imports | Unit: compilation test |
| Controller | E2E only — do NOT write unit tests |
| DTO | E2E: one validation wiring test per endpoint |
| Guard (delegates to service for business logic) | E2E + Unit if complex internal logic |
| Guard (simple, delegates to Passport) | E2E only |
| Strategy (Passport) | E2E via guard |
| Pipe (custom transformation/validation) | Unit |
| Interceptor (response transform, logging) | Unit and/or E2E |
| Exception Filter | Unit + E2E |
| Middleware | E2E |

### next-frontend

| Artifact created | Required tests |
|---|---|
| Page — sync RSC, static, no logic | None at component level; cover only if part of a critical flow → `*.e2e-spec.ts` |
| Page — sync RSC composing client children | Test client children directly; cover rendered page via `*.e2e-spec.ts` |
| Page — async RSC (`async function Page()` with `await`) | `*.e2e-spec.ts` only — Vitest cannot render it |
| Layout (`layout.tsx`) | None unless it adds logic (auth gate, conditional render); else via E2E |
| Client component (`"use client"`) with state/handlers | `*.test.tsx` — RTL + `jsdom` docblock, mock `next/navigation`, MSW for fetch |
| Feature component (server, composes primitives) | Skip unit; cover via the page's E2E |
| shadcn UI primitive (`components/ui/*`) | None — trust the library; cover via consumers |
| Icon (`components/icons/*`) | None |
| `lib/` utility / boundary module with branching or shape assumptions | `*.test.ts` |
| Custom hook (`hooks/*`) | `*.test.ts(x)` with `renderHook`, `jsdom` docblock |
| Route handler (`app/api/**/route.ts`) — proxy or with branching | `*.integration.test.ts` with MSW (+ `*.test.ts` for extracted pure logic) |
| Server action / middleware / error-loading-not-found / metadata | See `artifacts/future-types.md` — depends on type |

_Note: `next-frontend`'s Playwright suite is confirmed installed and running as of Phase 05/06 (`next-frontend/tests/*.e2e-spec.ts`) — the testing guide's "not yet installed" caveat (dated 2026-05) is stale relative to this phase; treat Playwright as available._
