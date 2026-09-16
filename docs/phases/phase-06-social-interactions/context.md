---
kind: phase
name: phase-06-social-interactions
sources_mtime:
  docs/project-plan.md: "2026-09-10T22:11:45"
  docs/decisions/technical-decisions-social-interactions.md: "2026-09-14T23:03:53"
  docs/decisions/technical-decisions-next-frontend-msw-foundation.md: "2026-09-10T22:11:45"
  docs/decisions/technical-decisions-next-frontend-openapi-typing.md: "2026-09-07T21:58:17"
  docs/phases/phase-01-configuracao-base/context.md: "2026-09-10T22:11:45"
  docs/phases/phase-02-auth/context.md: "2026-09-10T22:11:45"
  docs/phases/phase-02-auth-frontend/context.md: "2026-09-10T22:11:45"
  docs/phases/phase-03-videos/context.md: "2026-09-10T22:11:45"
  docs/phases/phase-04-video-channel-management/context.md: "2026-09-13T13:08:28"
  docs/phases/phase-05-video-watch-page/context.md: "2026-09-14T22:41:23"
  docs/inventories/screen-inventory-phase-06-social-interactions.md: "2026-09-14T23:39:11"
  .claude/skills/testing-guide-nestjs-project/SKILL.md: "2026-09-07T21:58:17"
  .claude/skills/testing-guide-next-frontend/SKILL.md: "2026-09-07T21:58:17"
---

# phase-06-social-interactions — Context

## Scope

**Phase name:** Social Interactions (Likes, Comments, Subscriptions)

**Capabilities** (literal, `docs/project-plan.md`):

- Like and dislike on videos (authenticated users)
- Comments on videos (authenticated users)
- Replies to comments (nested comments)
- Like and dislike on comments (authenticated users)
- Channel subscriptions (follow/unfollow)
- Followed-channels area with quick access to their videos
- Subscriber count on the channel page
- Complete comments, likes, and subscriptions interface

**Out of scope:** _Not specified._

**Deliverables:** working likes/dislikes, comments with replies, channel subscriptions, followed-channels listing.

**Affected subprojects:** (none explicitly named in `docs/project-plan.md` for this phase — no `Subprojects:` line and no explicit subproject path mentions; per the decisions doc, both `nestjs-project/` and `next-frontend/` are in scope)

**Deferred subprojects:** _None._

**Sequencing notes:** Depends on: Phase 02, Phase 05

**Neighbors (for boundary detection only):**

- **Phase 05:** Video Watch Page — Page where the user watches the video with a functional player, description, suggestions, and anonymous access.
- **Phase 07:** Home Page, Search, and Wrap-up — Home page with video listing, search, general navigation, responsiveness, and production readiness.

## Decisions Index

| Ref | Source | Scope | Topic | Status | Decision | Libraries | Renders in |
|-----|--------|-------|-------|--------|----------|-----------|------------|
| social-interactions/TD-01 | phase | Backend | Counter Consistency Strategy (likes, dislikes, counts) | decided | A | — | — |
| social-interactions/TD-02 | phase | Backend | Social Relation Data Model — Dedicated vs. Polymorphic | decided | A | — | — |
| social-interactions/TD-03 | phase | Cross-layer | Toggle-Action API Design & Idempotency (reactions) | decided | A | — | — |
| social-interactions/TD-04 | phase | Cross-layer | Nested Comments — Data Model, Depth Policy & Fetch Strategy | decided | A | — | — |
| social-interactions/TD-05 | phase | Cross-layer | Followed-Channels Feature Surface & Data Shape | decided | A | — | — |
| social-interactions/TD-06 | phase | Frontend | Frontend Interaction Pattern for Social Actions | decided | A | — | frontend-runtime |

_Source files:_

- social-interactions — `docs/decisions/technical-decisions-social-interactions.md` (scope_type: phase, related_phases: [6])

## Capability Coverage

| Capability (from project-plan.md) | Covered by |
|-----------------------------------|------------|
| Like and dislike on videos (authenticated users) | social-interactions/TD-01, social-interactions/TD-02, social-interactions/TD-03, social-interactions/TD-06 |
| Comments on videos (authenticated users) | social-interactions/TD-04, social-interactions/TD-06 |
| Replies to comments (nested comments) | social-interactions/TD-04, social-interactions/TD-06 |
| Like and dislike on comments (authenticated users) | social-interactions/TD-01, social-interactions/TD-02, social-interactions/TD-03, social-interactions/TD-06 |
| Channel subscriptions (follow/unfollow) | social-interactions/TD-02, social-interactions/TD-03, social-interactions/TD-06 |
| Followed-channels area with quick access to their videos | social-interactions/TD-05 |
| Subscriber count on the channel page | social-interactions/TD-01 |
| Complete comments, likes, and subscriptions interface | social-interactions/TD-06 |

## Decisions Detail

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

## Inherited Decisions Detail

### phase-01-configuracao-base/TD-01

**Recommendation:** Option A (@nestjs/config) — Official, core-team-maintained, guaranteed NestJS 11 compatibility. The `registerAs()` factory pattern solves the TypeORM CLI sharing problem: the factory function can be imported as a plain function by `data-source.ts` while also serving as a DI injection token inside NestJS. Building a custom module recreates solved functionality; third-party packages carry maintenance risk.
**Libraries:** @nestjs/config@^4.x

### phase-01-configuracao-base/TD-02

**Recommendation:** Option A (Joi) — First-class integration with `@nestjs/config` via `validationSchema`, requiring zero custom wiring. Handles string-to-number coercion natively. Using a different tool for env validation vs. request validation is reasonable — env config is validated once at startup, DTOs are validated per-request. Zod is elegant but adds a third validation paradigm to the project.
**Libraries:** joi@^17.x

### phase-01-configuracao-base/TD-03

**Recommendation:** Option B (Namespaced/grouped with registerAs) — The project roadmap explicitly calls for auth, email, and storage in upcoming phases. Namespaced configs provide clear file boundaries per domain, typed injection via `ConfigType<typeof databaseConfig>`, and natural scalability. The `registerAs()` factory is dual-purpose: DI token inside NestJS and plain importable function for `data-source.ts`. Initial files for Phase 01: `src/config/database.config.ts`, `src/config/app.config.ts`.
**Libraries:** —

### phase-01-configuracao-base/TD-04

**Recommendation:** Option A (Shared registerAs factory) — Natural outcome of choosing `@nestjs/config` with `registerAs`. The factory is already callable by design. `data-source.ts` imports it, calls `dotenv.config()`, then calls the factory. Zero duplication, minimal code, no extra abstraction.
**Libraries:** dotenv (transitive via @nestjs/config)

### phase-02-auth/TD-01

**Recommendation:** Argon2id — For a greenfield project in 2026, Argon2id is the OWASP-recommended choice. The native build dependency is a one-time Docker setup cost. The project has no legacy constraints favoring bcrypt. OWASP minimum: 19MiB memory, 2 iterations.
**Libraries:** argon2@^0.41.x

### phase-02-auth/TD-02

**Recommendation:** Option A (@nestjs/passport) — The project plan includes only email/password auth for now, but the plugin architecture costs little and future phases may add social login. Aligns with official NestJS docs, making onboarding and maintenance easier.
**Note:** Decision deliberately diverged from the Recommendation during implementation — custom guards were preferred over `@nestjs/passport` to keep the dependency surface smaller; social login is not on the near-term roadmap, so the plugin-architecture benefit did not justify the extra abstraction layer.
**Libraries:** @nestjs/jwt@^11.0.0

### phase-02-auth/TD-03

**Recommendation:** Option A (Refresh Token Rotation) — Provides the strongest security model with automatic theft detection. The DB write overhead is acceptable for a video platform (auth refresh is infrequent vs. video operations). PostgreSQL is already in the stack, so no new infrastructure needed. Race conditions can be mitigated with a short grace period for the old token.
**Libraries:** —

### phase-02-auth/TD-04

**Recommendation:** Option B (Random Opaque Tokens in DB) — Revocability is important: when a user requests a new password reset, previous tokens should be invalidated. The DB table is trivial to implement, and the tokens table can also serve future needs (e.g., API keys). Keeps email tokens decoupled from the JWT auth system.
**Libraries:** —

### phase-02-auth/TD-05

**Recommendation:** Option A (@nestjs-modules/mailer) — Best NestJS integration with minimal boilerplate. Supports SMTP (matching the architecture diagram), works with MailHog/Mailpit for local development without external dependencies, and scales to any SMTP provider in production. Template engine support (Handlebars) simplifies email formatting. No vendor lock-in.
**Libraries:** @nestjs-modules/mailer@^2.x, handlebars@^4.x

### phase-02-auth/TD-06

**Recommendation:** Option A (class-validator + class-transformer) — This is a backend-only project (no shared schemas with frontend), so Zod's single-source-of-truth advantage is less impactful. class-validator is the documented NestJS approach, and the project already uses decorators extensively (TypeORM entities, NestJS DI). Fewer integration surprises with NestJS 11.
**Libraries:** class-validator@^0.14.x, class-transformer@^0.5.x

### phase-02-auth/TD-07

**Recommendation:** Option A (Custom Domain Exception Filter) — Provides machine-readable error codes that the Next.js frontend can switch on, without the overhead of RFC 9457's URI-based type system. The project is single-consumer (first-party frontend), so a simple `{ statusCode, error, message }` format with domain codes balances clarity and simplicity. The custom filter cost is low — two small files.
**Libraries:** —

### phase-02-auth/TD-08

**Recommendation:** Option A (@nestjs/throttler) — Native NestJS integration is decisive: the guard system allows scoping rate limiting to `AuthModule` only via module-level `APP_GUARD`, with `@SkipThrottle()` for exemptions. The project is single-instance with no distributed requirements, so in-memory storage is sufficient. Using express-rate-limit would bypass NestJS's DI and guard lifecycle for no clear benefit.
**Libraries:** @nestjs/throttler@^6.x

### phase-02-auth/TD-09

**Recommendation:** Option B (Opaque) — Since DB lookup is mandatory (TD-03), JWT signature adds no security value. Opaque tokens are shorter, leak no data, and are simpler to generate.
**Note:** Decision deliberately diverged from the Recommendation — JWT was kept to reuse the access-token signing/verification infrastructure (`@nestjs/jwt`), trading token size and base64-readability for a single token format across the codebase.
**Libraries:** @nestjs/jwt@^11.0.0

### phase-02-auth/TD-10

**Recommendation:** Option A — The platform is a video sharing service with URL-based channel handles. A strict `[a-z0-9_]` allowlist is the simplest and most portable choice: no extra dependencies, no edge cases around hyphen positioning, and the `user_<random>` fallback provides a valid handle even for extreme email prefixes. Hyphens can always be added in a future iteration if user feedback justifies it.
**Libraries:** —

### phase-02-auth-frontend/TD-01

**Recommendation:** Three reasons. (1) Architectural fit — the strict-BFF model already nominates the Route Handler as the only NestJS caller; cookie-based sessions are the natural match. (2) Smaller blast radius — a ~50-LOC session helper is grep-friendly, debuggable, and test-friendly. (3) Compatibility with Next.js 16 / React 19 — built-in `next/headers` `cookies()` is the canonical primitive both runtimes already use.
**Libraries:** —

### phase-02-auth-frontend/TD-02

**Recommendation:** Three reasons. (1) Defense in depth on the cookie content — `httpOnly` blocks JS, encryption blocks accidental log/proxy inspection. (2) Single cookie to manage simplifies logout. (3) Room to carry minimal user metadata (`userId`, `email`, `channelSlug`) lets `app/layout.tsx` RSC render authenticated chrome without a per-render round-trip.
**Libraries:** iron-session

### phase-02-auth-frontend/TD-03

**Recommendation:** Transparent BFF refresh on upstream 401 with per-request single-flight — tested by MSW with a "two concurrent intercepted upstream calls; one refresh expected" assertion.
**Libraries:** —

### phase-02-auth-frontend/TD-04

**Recommendation:** Three reasons. (1) Decoupled from the mutation-pathway TD — works with Route Handlers regardless of later revisits. (2) Aligned with shadcn's canonical form primitive. (3) Zod-first developer ergonomics match the rest of the FE foundation.
**Libraries:** react-hook-form, @hookform/resolvers

### phase-02-auth-frontend/TD-05

**Recommendation:** Three reasons. (1) Strict-BFF alignment — every mutation visible under `app/api/**`. (2) Test scaffold already exists for Route-Handlers-as-functions. (3) Single mutation surface sets the precedent for later phases.
**Libraries:** —

### phase-02-auth-frontend/TD-06

**Recommendation:** Two reinforcing reasons. (1) No first-render flicker, no round-trip — the session is delivered in the same response as the page HTML. (2) No new BFF endpoint — the cookie is the source of truth, RSC reads it, a Client Provider broadcasts it.
**Libraries:** —

### phase-02-auth-frontend/TD-07

**Recommendation:** Three reasons. (1) First-paint-correct — the user sees the right outcome on the first paint. (2) Single integration pattern across both flows (confirmation is RSC-only; reset is RSC + Client form). (3) Email-prefetch behavior solved at the backend's idempotent-confirmation level.
**Libraries:** —

### phase-03-videos/TD-01

**Recommendation:** it is the dependency `@tus/s3-store` already requires, so choosing it avoids a second S3 client in the tree. `endpoint` + `forcePathStyle` make the same code path work against MinIO (dev) and S3-compatible storage (prod).
**Libraries:** @aws-sdk/client-s3

### phase-03-videos/TD-02

**Recommendation:** the project's infrastructure footprint today is exactly PostgreSQL + an email service; introducing Redis is justified when queue throughput or sub-second dispatch latency actually matters, and neither applies to a single-user-triggered, minutes-long video-processing job. If future phases need Redis for an unrelated reason (e.g., real-time pub/sub for Phase 06), that becomes free to reconsider.
**Libraries:** pg-boss

### phase-03-videos/TD-03

**Recommendation:** delivers the process isolation the architecture diagram calls for without paying the cost of a second codebase.
**Libraries:** —

### phase-03-videos/TD-04

**Recommendation:** directly matches the architecture diagram's self-hosted FFmpeg worker, covers both required operations (metadata via `ffprobe`, thumbnail via `screenshots()`).
**Libraries:** fluent-ffmpeg
**Revisions:**
- 2026-09-08 — Fixes the frame-selection rule for the automatic thumbnail: captures at `min(1s, 10% of duration)`. Rationale: avoids black opening/fade-in frames in both short and long videos.

### phase-03-videos/TD-05

**Recommendation:** the shortest URLs among the non-enumerable options, decoupled from whatever internal PK strategy the `Video` entity ends up using.
**Libraries:** nanoid

### phase-03-videos/TD-06

**Recommendation:** it is the only option where resumability is a property of the protocol rather than custom code the team must get right for every edge case.
**Libraries:** @tus/server, @tus/s3-store
**Revisions:**
- 2026-09-08 — Fixes the ownership model of the draft created in `onUploadCreate`: requires an authenticated user, records `userId`/`channelId` before any byte transfers. Rationale: avoids orphan drafts.

### phase-03-videos/TD-07

**Recommendation:** it is the only option that keeps video bytes off the API and BFF processes entirely.
**Libraries:** @aws-sdk/s3-request-presigner

### phase-03-videos/TD-08

**Recommendation:** every new service this phase introduces is consumed exclusively by `nestjs-project/`; extending the existing backend compose file is the smallest change consistent with the current one-file-per-subproject convention.
**Libraries:** —

### phase-03-videos/TD-09

**Recommendation:** it is the only option that avoids wasting upload bandwidth on obviously-wrong files while never trusting spoofable client-declared metadata as the sole guard.
**Libraries:** —

### phase-03-videos/TD-10

**Recommendation:** it is the only option that reaches both required terminal states (`ready` and `error`) under normal operation while not wasting a whole upload on a failure that a bounded retry would have recovered from for free.
**Libraries:** —

### phase-04-video-channel-management/TD-01

**Recommendation:** it mirrors the `VideoStatus` convention already established on the same entity, requires no new table or endpoint, and the already-decided OpenAPI codegen pipeline delivers full type-safety to `next-frontend/` for free.
**Libraries:** —

### phase-04-video-channel-management/TD-02

**Recommendation:** `published_at` directly answers the dashboard's "publish time" column, `visibility` stays a clean independent concern, and a dedicated `VideoPublicationService` keeps this lifecycle out of `VideoStatusService`'s explicitly documented scope.
**Libraries:** —

### phase-04-video-channel-management/TD-03

**Recommendation:** a thumbnail is small enough that the memory-buffering concern of a presigned-upload alternative is not material, and staying inside NestJS's ordinary controller/pipe pipeline with declarative `ParseFilePipe` validation is simpler.
**Libraries:** —

### phase-04-video-channel-management/TD-04

**Recommendation:** matches this project's existing domain-exception/error-envelope convention exactly, keeps the user in control of their chosen nickname, and avoids building live-availability infrastructure that nothing in the current scope requires.
**Libraries:** —

### phase-04-video-channel-management/TD-05

**Recommendation:** both lists this phase introduces are channel-scoped, where the concurrent-insert instability of cursor pagination protects against is a low-probability, low-impact edge case; simplicity now matches this project's principle against designing for hypothetical future requirements.
**Libraries:** —

### phase-04-video-channel-management/TD-06

**Recommendation:** every screen shipped in this project so far has favored the App Router's server-first primitives over a client-side cache library, and this phase's lists are channel-scoped and moderate in size, not the global feed Phase 07 will eventually build.
**Libraries:** —

### phase-05-video-watch-page/TD-01

**Recommendation:** leaves Phase 04's owner-only surface completely untouched, matches the single-purpose-guard convention already established for `@Public()` routes, and preserves Phase 03's public_id-only URL decision.
**Libraries:** —

### phase-05-video-watch-page/TD-02

**Recommendation:** the phase only asks to display a view count, not to build an anti-fraud analytics system; a plain atomic increment matches the project's pattern of keeping infrastructure narrowly scoped to what a capability actually needs.
**Libraries:** —

### phase-05-video-watch-page/TD-03

**Recommendation:** reuses an already-decided, already-implemented predicate and ordering with one added filter, keeping the query trivial and the behavior deterministic and easy to test.
**Libraries:** —

### phase-05-video-watch-page/TD-04

**Recommendation:** the capability list asks for exactly three controls (play/pause, volume, progress bar) against a single progressive MP4 source, so native `<video>` plus the same custom-primitive pattern used everywhere else in the app is proportionate.
**Libraries:** —

### phase-05-video-watch-page/TD-05

**Recommendation:** CSS Grid inlined directly in the page component is the idiomatic Tailwind tool for this fixed+fluid split, and avoids premature abstraction for what is currently a single screen.
**Libraries:** —

### phase-05-video-watch-page/TD-06

**Recommendation:** Tailwind's `line-clamp` utility plus a simple client toggle matches the Figma affordance with zero new dependencies.
**Libraries:** —

### next-frontend-msw-foundation/TD-01

**Recommendation:** Three reasons. (1) MSW's own best-practice recommends it — the project should not invent its own scheme when the official one is documented and matches the codebase's domain orientation. (2) Domain ownership tracks the codebase, not the project plan — `components/`, `app/api/`, and any future feature folders will be organized by domain (auth, videos, channels), so handler files mirror that vocabulary and remain stable as phases come and go. (3) Append-only growth with minimal merge conflicts — each phase touches a new file plus one line in the barrel. This phase adds `mocks/handlers/reactions.ts` (or similar per-domain file) + one barrel line, following the same pattern every prior phase used.
**Libraries:** —

### next-frontend-msw-foundation/TD-02

**Recommendation:** Test-only, `setupServer` only at the foundation. The browser worker is a future capability with no documented current consumer; wiring it now is speculative investment. This keeps the foundation minimal and aligns 1:1 with everything CLAUDE.md and the existing rules currently document.
**Libraries:** —

### next-frontend-msw-foundation/TD-03

**Recommendation:** Hand-written defaults as the default + opt-in seeded faker for bulk collections. Bulk-collection cases were explicitly anticipated to arrive with "Phase 06 comment threads" — this phase's comment-list fixtures are exactly the case TD-03 pre-approved seeded-faker usage for, via `faker.seed(N)` scoped locally to that fixture's collection-builder run (not a global seed).
**Libraries:** —

### next-frontend-msw-foundation/TD-04

**Recommendation:** Universal handler set + `server.use(...)` overrides + `onUnhandledRequest: "error"`. Loading all handlers is the canonical MSW v2 model and imposes no cost on tests that don't fetch the extra URLs; `onUnhandledRequest: "error"` enforces that this phase's tests cannot accidentally invoke a route outside its scope.
**Libraries:** —

### next-frontend-openapi-typing/TD-01

**Recommendation:** `openapi-typescript` + `openapi-fetch`. Strict BFF makes a generated SDK surface valueless on the client — only Route Handlers ever call the upstream Nest API, and `paths` is the single contract anchor typing both the Route Handlers and the MSW fixtures. This phase's new like/comment/subscription endpoints flow through the exact same `openapi.json` → `types.gen.ts` → `paths` → `lib/api/contracts.ts` chain as every prior phase's endpoints.
**Libraries:** openapi-typescript, openapi-fetch

### next-frontend-openapi-typing/TD-02

**Recommendation:** Committed local copy of `openapi.json` at `next-frontend/openapi.json` + repo-root sync script, preserving compose-stack independence between the two subprojects and making contract drift visible in PR diffs.
**Libraries:** —

### next-frontend-openapi-typing/TD-03

**Recommendation:** Committed + CI freshness check covering `openapi.json` and `types.gen.ts` — the only option that makes contract drift both visible in PR diffs and impossible to merge accidentally.
**Libraries:** —

### next-frontend-openapi-typing/TD-04

**Recommendation:** Single `lib/api/contracts.ts` with explicit aliases — the only file that imports `paths` from `types.gen.ts` directly; every other consumer (including this phase's new components) imports from `contracts.ts`, not from `app/api/**/route.ts` file paths.
**Libraries:** —

### next-frontend-openapi-typing/TD-05

**Recommendation:** Hand-written MSW handlers, typed via `paths` — determinism over auto-generation, and coherence with TD-01's `paths` contract anchor so "spec ↔ handler ↔ assertion" stays one type chain. This phase's fixture count is still small enough that manual authoring cost is negligible.
**Libraries:** —

## Inherited Conventions

- Backend config uses `@nestjs/config` with namespaced `registerAs(name, () => ({...}))` factories — one file per domain in `src/config/`. _(from phase 01)_
- Env variables are validated by a Joi schema in `src/config/env.validation.ts`, passed to `ConfigModule.forRoot({ validationSchema, ... })`. _(from phase 01)_
- Config is injected into modules via `ConfigType<typeof xxxConfig>` and `@Inject(xxxConfig.KEY)`; the same factory is importable as a plain function elsewhere. _(from phase 01)_
- `data-source.ts` loads `.env` via `import 'dotenv/config'` at the top, then imports the relevant config factory and calls it as a plain function. _(from phase 01)_
- Database connection parameters are sourced from a single `databaseConfig` factory — never duplicated between `AppModule` and `data-source.ts`. _(from phase 01)_
- `TypeOrmModule.forRootAsync` is used (not `forRoot`), with `imports: [ConfigModule]`, `inject: [databaseConfig.KEY]`, `useFactory` returning options. _(from phase 01)_
- Password/auth: Argon2id hashing, `@nestjs/jwt`-based custom guards (not `@nestjs/passport`), refresh-token rotation, opaque-but-JWT-formatted tokens for consistency. _(from phase 02)_
- `class-validator` + `class-transformer` for all request validation; domain exceptions mapped to HTTP responses by a custom exception filter (`{ statusCode, error, message }` shape). _(from phase 02)_
- `@nestjs/throttler` for rate limiting, scoped per-module via `APP_GUARD`. _(from phase 02)_
- Strict-BFF model: browser never calls the NestJS API directly; every mutation goes through a same-origin Route Handler under `app/api/**`. _(from phase 02-auth-frontend)_
- Session: `iron-session`-encrypted single cookie carrying access + refresh + minimal user fingerprint; RSC reads it server-side, a Client Context Provider broadcasts it; `router.refresh()` after mutations that change session-relevant state. _(from phase 02-auth-frontend)_
- Forms: `react-hook-form` + `@hookform/resolvers/zod`; mutation submission via Route Handler `POST` + client `fetch` (not Server Actions). _(from phase 02-auth-frontend)_
- Uploads/storage: presigned S3-compatible URLs (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`), never proxying bytes through the API. _(from phase 03)_
- Background jobs via `pg-boss` (Postgres-backed queue, no Redis) — bounded retry/backoff via `retryLimit`/`retryBackoff`. _(from phase 03)_
- Public/short IDs generated via `nanoid`, decoupled from the internal UUID primary key. _(from phase 03)_
- `VideoStatus`/`VideoCategory`/`VideoVisibility` are Postgres enum columns on the `Video` entity, mirrored 1:1 in TS enums — this project's established pattern for closed, platform-defined value sets. _(from phase 04)_
- Channel-scoped list endpoints use **offset/limit** pagination (not cursor) — reserved for genuinely global, high-concurrency feeds (e.g., a future Phase 07 home feed). _(from phase 04)_
- Frontend list screens use **Server Component + `searchParams`, no client-side cache** (no TanStack Query / SWR) for channel-scoped, moderate-size lists — revisit only where a screen's UX genuinely needs optimistic interactions or infinite scroll that this pattern can't express. _(from phase 04)_
- Public/anonymous read endpoints follow a single "is this publicly visible" predicate (`published_at IS NOT NULL AND visibility = public`), applied consistently everywhere a video is looked up by public ID. _(from phase 05)_
- Atomic `UPDATE ... SET col = col + 1 RETURNING col` (via `createQueryBuilder()`) is this project's established pattern for any concurrently-incremented counter column, first used for `videos.views`. _(from phase 05)_
- Every route gets a `loading.tsx` skeleton per the project's established convention. _(from phase 05)_

## Inherited Deferred Capabilities

| Capability | Status | Origin phase | Rationale |
|-----------|--------|--------------|-----------|
| "Frontend screens" | deferred | phase-01-configuracao-base | `next-frontend/` is not initialized in this phase; UI surfaces start in a later phase. |
| "Registration, login, account confirmation, and password recovery screens" | deferred | phase-02-auth | `next-frontend/` is not initialized in this phase; UI surfaces start in a later phase. |
| "Account confirmation via email with an activation link" | deferred | phase-02-auth-frontend | deferred_to_next_phase — UI landing screen de-scoped 2026-05-14; FE confirmation flow (TD-07) picked up by a future phase. BE side unchanged in `phase-02-auth`. |
| "Logout" | deferred | phase-02-auth-frontend | deferred_to_next_phase — logout button lives inside authenticated chrome (typically Phase 04). Phase 02 still implements POST `/api/auth/logout` (BFF route handler + `session.destroy()`) so the contract is ready when the chrome lands. |
| "Password recovery (destination screen / set-new-password)" | deferred | phase-02-auth-frontend | deferred_to_next_phase — `/forgot-password` ships this phase sending the email; the reset-password destination screen is absent from Figma → link destination remains a 404 until a later phase delivers the screen via `/screen-inventory` extension run. Documented as a known gap. |
| "Registration, login, account confirmation, and password recovery screens" | deferred | phase-02-auth-frontend | the account confirmation screen will not be implemented in the current phase, it will be postponed — the umbrella bullet's full coverage requires the confirmation and reset-password destination screens; both are deferred per Non-UI rows above. The 3 ship-this-phase screens (signup, login, forgot-password) are inventoried and covered by their own verbs; the umbrella bullet itself is deferred to the phase that lands the missing screens. |

_None of the above are picked up by this phase — they belong to auth/registration flows unrelated to likes, comments, or subscriptions. Listed here per `phases-reader`'s contract (informational-only; `plan-validate` does not fire issues based on unaddressed entries)._

## UI Inventory

**Source:** `docs/inventories/screen-inventory-phase-06-social-interactions.md`
**Screens in scope:** 3

### UI ↔ Capability Join

| Screen | Route | Verb | Capability | Covering Component |
|--------|-------|------|------------|-------------------|
| Video Watch Page | /watch/[publicId] | Curtir ou descurtir o vídeo | "Like and dislike on videos (authenticated users)" | LikeDislikeButton |
| Video Watch Page | /watch/[publicId] | Inscrever-se ou cancelar inscrição no canal a partir da página do vídeo | "Channel subscriptions (follow/unfollow)" | SubscribeButton |
| Video Watch Page | /watch/[publicId] | Exibir contagem real de inscritos do canal | "Subscriber count on the channel page" | SubscriberCount |
| Video Watch Page | /watch/[publicId] | Exibir contagem real de comentários do vídeo | "Comments on videos (authenticated users)" | CommentCount |
| Video Watch Page | /watch/[publicId] | Publicar um novo comentário no vídeo | "Comments on videos (authenticated users)" | CommentForm |
| Video Watch Page | /watch/[publicId] | Exibir lista de comentários do vídeo | "Comments on videos (authenticated users)" | CommentList |
| Video Watch Page | /watch/[publicId] | Curtir ou descurtir um comentário | "Like and dislike on comments (authenticated users)" | CommentLikeDislikeButton |
| Video Watch Page | /watch/[publicId] | Responder a um comentário | "Replies to comments (nested comments)" | ReplyAction |
| Video Watch Page | /watch/[publicId] | Exibir respostas de um comentário | "Replies to comments (nested comments)" | ReplyItem |
| Channel Public Page (Channel show) | /channel/[nickname] | Inscrever-se ou cancelar inscrição no canal | "Channel subscriptions (follow/unfollow)" | SubscribeButton |
| Channel Public Page (Channel show) | /channel/[nickname] | Exibir contagem real de inscritos do canal | "Subscriber count on the channel page" | ChannelProfileHeader |
| Followed Channels Page | /subscriptions | Exibir lista paginada de canais que o usuário segue | "Followed-channels area with quick access to their videos" | SubscribedChannelsList |
| Followed Channels Page | /subscriptions | Exibir cada canal seguido (avatar + nome) com link para a página do canal | "Followed-channels area with quick access to their videos" | SubscribedChannelRow |
| Followed Channels Page | /subscriptions | Navegar entre páginas da lista de canais seguidos | "Followed-channels area with quick access to their videos" | PaginationControls |

### Server-connected Components

- `LikeDislikeButton` (Video Watch Page) — `Reuse?: components/video/like-dislike-button.tsx`
- `SubscribeButton` (Video Watch Page) — `Reuse?: components/ui/button.tsx`
- `SubscriberCount` (Video Watch Page) — `Reuse?: new`
- `CommentCount` (Video Watch Page) — `Reuse?: new`
- `CommentForm` (Video Watch Page) — `Reuse?: new`
- `CommentList` (Video Watch Page) — `Reuse?: new`
- `CommentItem` (Video Watch Page) — `Reuse?: new`
- `CommentLikeDislikeButton` (Video Watch Page) — `Reuse?: new`
- `ReplyAction` (Video Watch Page) — `Reuse?: new`
- `ReplyItem` (Video Watch Page) — `Reuse?: new`
- `SubscribeButton` (Channel Public Page (Channel show)) — `Reuse?: components/ui/button.tsx`
- `ChannelProfileHeader` (Channel Public Page (Channel show)) — `Reuse?: new`
- `SubscribedChannelRow` (Followed Channels Page) — `Reuse?: new`
- `SubscribedChannelsList` (Followed Channels Page) — `Reuse?: new`
- `PaginationControls` (Followed Channels Page) — `Reuse?: new`

### Open Questions from Inventory

- Carried forward, unresolved, from `phase-04-video-channel-management`'s Open Questions: `NotificationBellButton` (Channel Public Page, node `39:134`) appears in the Figma design but no phase in `docs/project-plan.md` — including this one — documents a notifications capability. Still decorative/inert. May be a real project-scope gap worth a dedicated capability in a future phase, or may simply be out of scope for this project's stated feature list.

## Non-UI / Deferred Capabilities

| Capability | Status | Rationale | TD refs |
|-----------|--------|-----------|---------|
| "Complete comments, likes, and subscriptions interface" | non-ui | Satisfied transversally — this umbrella bullet synthesizes the other 7 capabilities (likes, dislikes, comments, replies, subscriptions), already covered by concrete UI verbs across the Video Watch Page, Channel Public Page, and Followed Channels Page. No independent UI surface of its own is required. | social-interactions/TD-06 |

## Testing Requirements

### nestjs-project

| Artifact created | Required tests |
|---|---|
| Entity (`*.entity.ts`) | Integration: constraints, defaults, `select: false` |
| Service with branching + DB | Unit: branch logic (mock repo) + Integration: DB contract |
| Service with DB only (no branching) | Integration: DB contract |
| Module with configured imports | Unit: compilation test |
| Controller | E2E only — do NOT write unit tests |
| DTO | E2E: one validation wiring test per endpoint |
| Guard (delegates to service for business logic) | E2E + Unit if complex internal logic |
| Guard (simple, delegates to Passport) | E2E only |

### next-frontend

| Artifact created | Required tests |
|---|---|
| Page — sync RSC composing client children | Test client children directly; cover rendered page via `*.e2e-spec.ts` |
| Page — async RSC (`async function Page()` with `await`) | `*.e2e-spec.ts` only — Vitest cannot render it |
| Client component (`"use client"`) with state/handlers | `*.test.tsx` — RTL + `jsdom` docblock, mock `next/navigation`, MSW for fetch |
| Feature component (server, composes primitives) | Skip unit; cover via the page's E2E |
| `lib/` utility / boundary module with branching or shape assumptions | `*.test.ts` |
| Route handler (`app/api/**/route.ts`) — proxy or with branching | `*.integration.test.ts` with MSW (+ `*.test.ts` for extracted pure logic) |
