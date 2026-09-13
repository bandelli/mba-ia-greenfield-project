---
kind: phase
name: phase-04-video-channel-management
sources_mtime:
  docs/project-plan.md: "2026-09-10T22:11:45-03:00"
  docs/decisions/technical-decisions-phase-04-video-channel-management.md: "2026-09-10T22:36:41-03:00"
  docs/decisions/technical-decisions-next-frontend-openapi-typing.md: "2026-09-07T21:58:17-03:00"
  docs/phases/phase-01-configuracao-base/context.md: "2026-09-10T22:11:45-03:00"
  docs/phases/phase-02-auth/context.md: "2026-09-10T22:11:45-03:00"
  docs/phases/phase-02-auth-frontend/context.md: "2026-09-10T22:11:45-03:00"
  docs/phases/phase-03-videos/context.md: "2026-09-10T22:11:45-03:00"
  .claude/skills/testing-guide-nestjs-project/SKILL.md: "2026-09-07T21:58:17-03:00"
  .claude/skills/testing-guide-next-frontend/SKILL.md: "2026-09-07T21:58:17-03:00"
  docs/inventories/screen-inventory-phase-04-video-channel-management.md: "2026-09-11T23:40:17-03:00"
---

# phase-04-video-channel-management — Context

## Scope

**Phase name:** Video and Channel Management

**Capabilities** (literal, `docs/project-plan.md`):

- Video categories available on the platform
- Video information editing: title, description, category, and custom thumbnail
- Video visibility: public (shown to everyone) or unlisted (accessible only via link)
- Draft → publish flow
- Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)
- Editing videos from the dashboard
- Channel information editing: nickname, name, and description
- Public channel page with information and video listing

**Out of scope:** _Not specified._

**Deliverables:** complete video editing, draft/publish, management dashboard, channel editing, public channel page.

**Affected subprojects:** _None explicitly mentioned in this phase's text._ (`docs/decisions/technical-decisions-phase-04-video-channel-management.md` names `nestjs-project/` as primary and `next-frontend/` as receiving the dashboard, video-edit, channel-edit, and public-channel-page screens)

**Deferred subprojects:** _None._

**Sequencing notes:** Depends on: Phase 02, Phase 03

**Neighbors (for boundary detection only):**

- **Phase 03:** Depends on: Phase 01, Phase 02 (Phase 03 — Video Upload and Processing)
- **Phase 05:** Depends on: Phase 03, Phase 04 (Phase 05 — Video Watch Page)

## Decisions Index

| Ref | Source | Scope | Topic | Status | Decision | Libraries |
|-----|--------|-------|-------|--------|----------|-----------|
| phase-04-video-channel-management/TD-01 | phase | Cross-layer | Video Category Data Model & Exposure | decided | A | — |
| phase-04-video-channel-management/TD-02 | phase | Cross-layer | Video Publication State Model (Draft → Publish & Visibility) | decided | A | — |
| phase-04-video-channel-management/TD-03 | phase | Cross-layer | Custom Thumbnail Upload Protocol & Storage Strategy | decided | A | — |
| phase-04-video-channel-management/TD-04 | phase | Cross-layer | Channel Nickname Collision Handling on Edit | decided | B | — |
| phase-04-video-channel-management/TD-05 | phase | Cross-layer | Pagination Strategy for Video & Channel Listings | decided | B | — |
| phase-04-video-channel-management/TD-06 | phase | Frontend | Frontend List Data-Fetching & Pagination Pattern | decided | C | — |

_Source files:_

- phase-04-video-channel-management — `docs/decisions/technical-decisions-phase-04-video-channel-management.md` (scope_type: phase, related_phases: [4])

## Capability Coverage

| Capability (from project-plan.md) | Covered by |
|-----------------------------------|------------|
| Video categories available on the platform | phase-04-video-channel-management/TD-01 |
| Video information editing: title, description, category, and custom thumbnail | phase-04-video-channel-management/TD-01, phase-04-video-channel-management/TD-03 |
| Video visibility: public (shown to everyone) or unlisted (accessible only via link) | phase-04-video-channel-management/TD-02 |
| Draft → publish flow | phase-04-video-channel-management/TD-02 |
| Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status) | phase-04-video-channel-management/TD-05, phase-04-video-channel-management/TD-06 |
| Editing videos from the dashboard | phase-04-video-channel-management/TD-03 |
| Channel information editing: nickname, name, and description | phase-04-video-channel-management/TD-04 |
| Public channel page with information and video listing | phase-04-video-channel-management/TD-05, phase-04-video-channel-management/TD-06 |

## Decisions Detail

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

## Inherited Decisions Detail

### phase-01-configuracao-base/TD-01

**Recommendation:** Option A (@nestjs/config) — Official, core-team-maintained, guaranteed NestJS 11 compatibility. The `registerAs()` factory pattern solves the TypeORM CLI sharing problem: the factory function can be imported as a plain function by `data-source.ts` while also serving as a DI injection token inside NestJS. Building a custom module recreates solved functionality; third-party packages carry maintenance risk.
**Libraries:** `@nestjs/config@^4.x`

### phase-01-configuracao-base/TD-02

**Recommendation:** Option A (Joi) — First-class integration with `@nestjs/config` via `validationSchema`, requiring zero custom wiring. Handles string-to-number coercion natively. Using a different tool for env validation vs. request validation is reasonable — env config is validated once at startup, DTOs are validated per-request. Zod is elegant but adds a third validation paradigm to the project.
**Libraries:** `joi@^17.x`

### phase-01-configuracao-base/TD-03

**Recommendation:** Option B (Namespaced/grouped with registerAs) — The project roadmap explicitly calls for auth, email, and storage in upcoming phases. Namespaced configs provide clear file boundaries per domain, typed injection via `ConfigType<typeof databaseConfig>`, and natural scalability. The `registerAs()` factory is dual-purpose: DI token inside NestJS and plain importable function for `data-source.ts`. Initial files for Phase 01: `src/config/database.config.ts`, `src/config/app.config.ts`.
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

**Recommendation:** Option A (Custom Domain Exception Filter) — Provides machine-readable error codes that the Next.js frontend can switch on, without the overhead of RFC 9457's URI-based type system. The project is single-consumer (first-party frontend), so a simple `{ statusCode, error, message }` format with domain codes balances clarity and simplicity. The custom filter cost is low — two small files.
**Libraries:** —

### phase-02-auth/TD-08

**Recommendation:** Option A (@nestjs/throttler) — Native NestJS integration is decisive: the guard system allows scoping rate limiting to `AuthModule` only via module-level `APP_GUARD`, with `@SkipThrottle()` for exemptions. The project is single-instance with no distributed requirements, so in-memory storage is sufficient. Using express-rate-limit would bypass NestJS's DI and guard lifecycle for no clear benefit.
**Libraries:** `@nestjs/throttler@^6.x`

### phase-02-auth/TD-09

**Recommendation:** Option B (Opaque) — Since DB lookup is mandatory (TD-03), JWT signature adds no security value. Opaque tokens are shorter, leak no data, and are simpler to generate.
**Note:** Decision deliberately diverged from the Recommendation — JWT was kept to reuse the access-token signing/verification infrastructure (`@nestjs/jwt`), trading token size and base64-readability for a single token format across the codebase.
**Libraries:** `@nestjs/jwt@^11.0.0`

### phase-02-auth/TD-10

**Recommendation:** Option A — The platform is a video sharing service with URL-based channel handles. A strict `[a-z0-9_]` allowlist is the simplest and most portable choice: no extra dependencies, no edge cases around hyphen positioning, and the `user_<random>` fallback provides a valid handle even for extreme email prefixes. Hyphens can always be added in a future iteration if user feedback justifies it.
**Libraries:** —

### phase-02-auth-frontend/TD-01

**Recommendation:** Three reasons. (1) **Architectural fit.** The strict-BFF model in `next-frontend-config-base/TD-03` already nominates the Route Handler as the only NestJS caller; cookie-based sessions are the natural match, and Auth.js's framework adds layers between the BFF and the cookie that buy nothing because the backend is the auth authority. (2) **Smaller blast radius.** A ~50-LOC session helper is grep-friendly, debuggable, and test-friendly via the existing MSW+BFF integration test pattern. (3) **Compatibility with Next.js 16 / React 19.** Built-in `next/headers` `cookies()` is the canonical primitive both runtimes already use. Option C is rejected as unsafe (`localStorage` for refresh tokens) and architecturally regressive (loses RSC personalization).
**Libraries:** —

### phase-02-auth-frontend/TD-02

**Recommendation:** Three reasons. (1) **Defense in depth on the cookie content** — `httpOnly` blocks JS, encryption blocks accidental log/proxy inspection. (2) **Single cookie to manage** simplifies logout and avoids the orphan-cookie failure mode of Option A. (3) **Room to carry minimal user metadata** (`userId`, `email`, `channelSlug`) lets `app/layout.tsx` RSC render the authenticated chrome (avatar, channel name) without a per-render `/auth/me` round-trip — **Phase 04+ gains compound here.** Option C is rejected: it solves a problem (server-side revocation) the project does not have.
**Libraries:** iron-session

### phase-02-auth-frontend/TD-03

**Recommendation:** The single-flight detail is non-trivial and goes in the helper from day one — tested by MSW with a "two concurrent intercepted upstream calls; one refresh expected" assertion. Option B's client-driven pattern is rejected because it doesn't replace Option A. Option C's pre-emptive timer is rejected because the failure modes outweigh the latency saving.
**Libraries:** —

### phase-02-auth-frontend/TD-04

**Recommendation:** Three reasons. (1) **Decoupled from TD-05** — works with Route Handlers OR Server Actions. (2) **Aligned with shadcn's canonical form primitive** — the project already commits to `radix-nova` shadcn. (3) **Zod-first developer ergonomics match the rest of the FE foundation** — `next-frontend-config-base/TD-01` chose Zod 4 for env; the same schemas-as-source-of-truth pattern carries to forms. Option B is rejected for impedance with shadcn's primitive; Option C for the per-field boilerplate.
**Libraries:** react-hook-form, @hookform/resolvers

### phase-02-auth-frontend/TD-05

**Recommendation:** Three reasons. (1) **Strict-BFF alignment.** (2) **Test scaffold already exists** — `next-frontend-msw-foundation` was authored for Route-Handlers-as-functions. (3) **Single mutation surface** — Phase 02 sets the precedent for Phases 03–07; uniformity beats per-mutation idiom-picking. Option B fragments the BFF surface; if the team later wants progressive enhancement, the migration A→B is per-form.
**Libraries:** —

### phase-02-auth-frontend/TD-06

**Recommendation:** Two reinforcing reasons. (1) **No first-render flicker, no round-trip** — the session is delivered in the same response as the page HTML. (2) **No new BFF endpoint** — the cookie is the source of truth, RSC reads it, the Provider broadcasts it. The `router.refresh()` requirement after mid-session mutations is a small price. Option B is rejected for the double-read-and-flicker; Option C is dominated.
**Libraries:** —

### phase-02-auth-frontend/TD-07

**Recommendation:** Three reasons. (1) **First-paint-correct** — the user sees the right outcome on the first paint, no skeleton, no flicker. (2) **Single integration pattern across both flows** — confirmation is RSC-only; reset is RSC + Client form, both share the "RSC owns the token, Client Component owns the input" split. (3) **Email-prefetch behavior** is solved at the backend's idempotent-confirmation level. Option B's Route-Handler-as-link-target adds redirects for no clean gain. Option C is dominated.
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

**Recommendation:** it is the only option where resumability (an explicit project-plan.md requirement) is a property of the protocol rather than custom code the team must get right for every edge case. It also gives the "automatic pre-registration when the upload starts" bullet a precise, well-documented implementation point (`onUploadCreate`) instead of an ad-hoc endpoint.
**Libraries:** @tus/server, @tus/s3-store
**Revisions:**
- 2026-09-08 — Fixes the ownership model of the draft created in `onUploadCreate`: the upload endpoint requires an authenticated user (reusing the JWT guard from `phase-02-auth`), and the hook records `userId`/`channelId` on the draft `Video` at the same moment it is created — before any byte of the file is transferred. Rationale: authenticated, immediate ownership — avoids orphan drafts, without depending on a later assignment step in Phase 04.

### phase-03-videos/TD-07

**Recommendation:** it is the only option that keeps video bytes off the API and BFF processes entirely, which is what "sem impacto na performance" demands once applied symmetrically to playback and download, not just upload. The CORS/exposure cost is small and well-understood; Option C solves a scaling problem this phase does not yet have.
**Libraries:** @aws-sdk/s3-request-presigner

### phase-03-videos/TD-08

**Recommendation:** every new service this phase introduces (storage, optional queue backend, worker) is consumed exclusively by `nestjs-project/`; extending the existing backend compose file is the smallest change consistent with the current one-file-per-subproject convention.
**Libraries:** —

### phase-03-videos/TD-09

**Recommendation:** it is the only option that avoids wasting upload bandwidth on obviously-wrong files while never trusting spoofable client-declared metadata as the sole guard. Both checkpoints reuse hooks and dependencies TD-06 and TD-04 already require.
**Libraries:** —

### phase-03-videos/TD-10

**Recommendation:** it is the only option that reaches both required terminal states (`ready` and `error`) under normal operation while not wasting a whole upload on a failure that a bounded retry would have recovered from for free. `pg-boss`'s `retryLimit`/`retryBackoff` options implement the bounded-retry mechanics directly — no new library, no hand-rolled retry/backoff logic.
**Libraries:** —

### next-frontend-openapi-typing/TD-01

**Recommendation:** Three reinforcing reasons. (1) **Strict BFF makes the SDK surface valueless on the client** — only Route Handlers ever call the upstream Nest; they already use `fetch`. (2) **Types-first matches the rest of the FE foundation** — env validation is Zod-derived types, component variants are `cva` types, both TS-first with zero generated runtime. (3) **MSW typing is solved by the same `paths` symbol** — hand-written handlers type their resolver returns off `paths[...]`, giving the contract guarantee without orval/kubb's verbose generated handlers.
**Libraries:** openapi-typescript, openapi-fetch

### next-frontend-openapi-typing/TD-02

**Recommendation:** Three reasons. (1) **Preserves the compose-stack independence** — neither subproject's compose file references the other. (2) **Drift is eliminated structurally when paired with TD-03's CI freshness check.** (3) **The committed local file is a real artifact in PR review** — reviewers see the contract change in `next-frontend/openapi.json`'s diff at the same time as the backend change.
**Libraries:** —

### next-frontend-openapi-typing/TD-03

**Recommendation:** it is the only option that makes contract drift both visible (in PR diffs) and impossible to merge accidentally (CI fail). The complexity premium over the "committed, no check" option is one CI step.
**Libraries:** —

### next-frontend-openapi-typing/TD-04

**Recommendation:** it is the only option that handles pass-through and reshape with the same mechanism, gives a single grep target for "what shape does the BFF expose", and decouples Component imports from App Router file paths. Make `lib/api/contracts.ts` the only file that imports `paths` from `types.gen.ts`; every other consumer imports from `contracts.ts` — a convention this phase's video/channel editing screens must follow for their new contract aliases.
**Libraries:** —

### next-frontend-openapi-typing/TD-05

**Recommendation:** Reasons: (1) **Determinism over auto-generation** — BFF integration tests assert on specific values. (2) **Coherence with TD-01** — `openapi-typescript`'s `paths` type is the single contract anchor. (3) **Scale fit** — the manual cost is negligible at this stage.
**Libraries:** —

## Inherited Conventions

- Backend config uses `@nestjs/config` with namespaced `registerAs(name, () => ({...}))` factories — one file per domain in `src/config/`. _(from phase 02)_
- Env variables are validated by a Joi schema in `src/config/env.validation.ts`, passed to `ConfigModule.forRoot({ validationSchema, validationOptions... })`. _(from phase 02)_
- Config is injected into modules via `ConfigType<typeof xxxConfig>` and `@Inject(xxxConfig.KEY)`; the same factory is importable as a plain function outside DI. _(from phase 02)_
- `data-source.ts` loads `.env` via `import 'dotenv/config'` at the top, then imports `databaseConfig` and calls it as a plain function. _(from phase 02)_
- Database connection parameters (host, port, etc.) are sourced from a single `databaseConfig` factory — never duplicated between `AppModule` and `data-source.ts`. _(from phase 02)_
- `TypeOrmModule.forRootAsync` is used (not `forRoot`), with `imports: [ConfigModule]`, `inject: [databaseConfig.KEY]`, `useFactory` returning options injected via config. _(from phase 02)_
- Backend config uses `@nestjs/config` with namespaced `registerAs(name, () => ({...}))` factories — one file per domain in `src/config/`. _(from phase 03)_
- Env variables are validated by a Joi schema in `src/config/env.validation.ts`, passed to `ConfigModule.forRoot`. _(from phase 03)_
- Config is injected into modules via `ConfigType<typeof xxxConfig>` and `@Inject(xxxConfig.KEY)`; the same factory is importable outside DI. _(from phase 03)_
- `data-source.ts` loads `.env` via `import 'dotenv/config'` at the top, then imports `databaseConfig` and calls it as a plain function. _(from phase 03)_
- Database connection parameters (host, port, etc.) are sourced from a single `databaseConfig` factory — never duplicated between `AppModule` and `data-source.ts`. _(from phase 03)_
- `TypeOrmModule.forRootAsync` is used (not `forRoot`), with `imports: [ConfigModule]`, `inject: [databaseConfig.KEY]`, `useFactory` returning options. _(from phase 03)_

## Inherited Deferred Capabilities

| Capability | Status | Origin phase | Rationale |
|-----------|--------|--------------|-----------|
| Frontend screens | deferred | phase-01-configuracao-base | `next-frontend/` is not initialized in this phase; UI surfaces start in a later phase. |
| Registration, login, account confirmation, and password recovery screens | deferred | phase-02-auth | `next-frontend/` is not initialized in this phase; UI surfaces start in a later phase. |
| "Account confirmation via email with an activation link" | deferred | phase-02-auth-frontend | deferred_to_next_phase — UI landing screen de-scoped 2026-05-14; FE confirmation flow (TD-07) picked up by a future phase. BE side unchanged in `phase-02-auth`. |
| "Logout" | deferred | phase-02-auth-frontend | deferred_to_next_phase — logout button lives inside authenticated chrome (typically Phase 04). Phase 02 still implements POST `/api/auth/logout` (BFF route handler + `session.destroy()`) so the contract is ready when the chrome lands. |
| "Password recovery (destination screen / set-new-password)" | deferred | phase-02-auth-frontend | deferred_to_next_phase — `/forgot-password` ships this phase sending the email; the reset-password destination screen is absent from Figma → link destination remains a 404 until a later phase delivers the screen via `/screen-inventory` extension run. Documented as a known gap. |
| "Registration, login, account confirmation, and password recovery screens" | deferred | phase-02-auth-frontend | the account confirmation screen will not be implemented in the current phase, it will be postponed — the umbrella bullet's full coverage requires the confirmation and reset-password destination screens; both are deferred per Non-UI rows above. The 3 ship-this-phase screens (signup, login, forgot-password) are inventoried and covered by their own verbs; the umbrella bullet itself is deferred to the phase that lands the missing screens. |

## UI Inventory

**Source:** `docs/inventories/screen-inventory-phase-04-video-channel-management.md`
**Screens in scope:** 4

### UI ↔ Capability Join

| Screen | Route | Verb | Capability | Covering Component |
|--------|-------|------|------------|-------------------|
| Tela de edição de vídeo (Edit/Publish Video) | /dashboard/videos/[id]/edit | Editar título do vídeo | "Video information editing: title, description, category, and custom thumbnail" | Title input |
| Tela de edição de vídeo (Edit/Publish Video) | /dashboard/videos/[id]/edit | Editar descrição do vídeo | "Video information editing: title, description, category, and custom thumbnail" | Description textarea |
| Tela de edição de vídeo (Edit/Publish Video) | /dashboard/videos/[id]/edit | Disparar upload de novo thumbnail customizado | "Video information editing: title, description, category, and custom thumbnail" | "Change Thumbnail" button |
| Tela de edição de vídeo (Edit/Publish Video) | /dashboard/videos/[id]/edit | Exibir categorias disponíveis para seleção | "Video categories available on the platform" | Category select |
| Tela de edição de vídeo (Edit/Publish Video) | /dashboard/videos/[id]/edit | Selecionar categoria do vídeo | "Video information editing: title, description, category, and custom thumbnail" | Category select |
| Tela de edição de vídeo (Edit/Publish Video) | /dashboard/videos/[id]/edit | Selecionar visibilidade do vídeo (público ou não listado) | "Video visibility: public (shown to everyone) or unlisted (accessible only via link)" | VisibilityRadioGroup |
| Tela de edição de vídeo (Edit/Publish Video) | /dashboard/videos/[id]/edit | Salvar vídeo como rascunho | "Draft → publish flow" | "Save as draft" button |
| Tela de edição de vídeo (Edit/Publish Video) | /dashboard/videos/[id]/edit | Publicar vídeo | "Draft → publish flow" | "Publish" button |
| Dashboard de gerenciamento de vídeos do canal (My videos list) | /dashboard/videos | Filtrar vídeos do canal por status de visibilidade (Public) | "Video visibility: public (shown to everyone) or unlisted (accessible only via link)" | VisibilityFilterChip "Public" |
| Dashboard de gerenciamento de vídeos do canal (My videos list) | /dashboard/videos | Filtrar/ordenar vídeos do canal por data de publicação | "Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)" | DateFilterChip |
| Dashboard de gerenciamento de vídeos do canal (My videos list) | /dashboard/videos | Buscar vídeos do canal por palavra-chave | "Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)" | SearchVideosInput |
| Dashboard de gerenciamento de vídeos do canal (My videos list) | /dashboard/videos | Exibir contagem total de vídeos do canal | "Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)" | VideoCountLabel |
| Dashboard de gerenciamento de vídeos do canal (My videos list) | /dashboard/videos | Reordenar lista de vídeos do canal | "Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)" | SortByDropdown |
| Dashboard de gerenciamento de vídeos do canal (My videos list) | /dashboard/videos | Exibir vídeo individual do canal na lista do dashboard | "Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)" | VideoRow |
| Dashboard de gerenciamento de vídeos do canal (My videos list) | /dashboard/videos | Exibir thumbnail do vídeo na lista do dashboard | "Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)" | VideoThumbnail |
| Dashboard de gerenciamento de vídeos do canal (My videos list) | /dashboard/videos | Exibir título do vídeo na lista do dashboard | "Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)" | VideoTitle |
| Dashboard de gerenciamento de vídeos do canal (My videos list) | /dashboard/videos | Exibir contagem de visualizações do vídeo | "Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)" | VideoStats |
| Dashboard de gerenciamento de vídeos do canal (My videos list) | /dashboard/videos | Exibir contagem de curtidas do vídeo | "Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)" | VideoStats |
| Dashboard de gerenciamento de vídeos do canal (My videos list) | /dashboard/videos | Exibir contagem de comentários do vídeo | "Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)" | VideoStats |
| Dashboard de gerenciamento de vídeos do canal (My videos list) | /dashboard/videos | Exibir tempo de publicação do vídeo | "Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)" | VideoPublishedAt |
| Dashboard de gerenciamento de vídeos do canal (My videos list) | /dashboard/videos | Exibir status de visibilidade do vídeo (Public/Unlisted) | "Video visibility: public (shown to everyone) or unlisted (accessible only via link)" | VideoStatusBadge |
| Dashboard de gerenciamento de vídeos do canal (My videos list) | /dashboard/videos | Navegar entre páginas da lista de vídeos do canal | "Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)" | PaginationControls |
| Dashboard de gerenciamento de vídeos do canal (My videos list) | /dashboard/videos | Abrir menu de ações do vídeo (entry point para edição) | "Editing videos from the dashboard" | VideoRowMenuButton |
| Edição de informações do canal (Channel Settings) | /dashboard/channel | Editar apelido (nickname) do canal | "Channel information editing: nickname, name, and description" | NicknameField |
| Edição de informações do canal (Channel Settings) | /dashboard/channel | Editar nome do canal | "Channel information editing: nickname, name, and description" | ChannelNameField |
| Edição de informações do canal (Channel Settings) | /dashboard/channel | Editar descrição do canal | "Channel information editing: nickname, name, and description" | DescriptionField |
| Edição de informações do canal (Channel Settings) | /dashboard/channel | Salvar alterações das informações do canal | "Channel information editing: nickname, name, and description" | SaveChangesButton |
| Página pública do canal (Channel show) | /channel/[nickname] | Exibir informações públicas do canal (banner, avatar, nome, @nickname, contagem de inscritos, contagem de vídeos, descrição) | "Public channel page with information and video listing" | ChannelProfileHeader |
| Página pública do canal (Channel show) | /channel/[nickname] | Exibir lista de vídeos publicados (visibilidade pública) do canal | "Public channel page with information and video listing" | VideoCard |
| Página pública do canal (Channel show) | /channel/[nickname] | Reordenar lista de vídeos publicados do canal (mais recentes / populares / mais antigos) | "Public channel page with information and video listing" | VideoSortControl |

### Server-connected Components

- `Title input` (Tela de edição de vídeo) — `Reuse?: new`
- `Description textarea` (Tela de edição de vídeo) — `Reuse?: new`
- `"Change Thumbnail" button` (Tela de edição de vídeo) — `Reuse?: new`
- `Category select` (Tela de edição de vídeo) — `Reuse?: new`
- `VisibilityRadioGroup` (Tela de edição de vídeo) — `Reuse?: new`
- `"Save as draft" button` (Tela de edição de vídeo) — `Reuse?: new`
- `"Publish" button` (Tela de edição de vídeo) — `Reuse?: new`
- `GlobalSearchBar` (Dashboard de gerenciamento de vídeos do canal) — `Reuse?: new`
- `SidebarSubscriptionsChannelList` (Dashboard de gerenciamento de vídeos do canal) — `Reuse?: new`
- `VisibilityFilterChip "Public"` (Dashboard de gerenciamento de vídeos do canal) — `Reuse?: components/ui/button.tsx`
- `DateFilterChip` (Dashboard de gerenciamento de vídeos do canal) — `Reuse?: components/ui/button.tsx`
- `SearchVideosInput` (Dashboard de gerenciamento de vídeos do canal) — `Reuse?: components/ui/input.tsx`
- `VideoCountLabel` (Dashboard de gerenciamento de vídeos do canal) — `Reuse?: new`
- `SortByDropdown` (Dashboard de gerenciamento de vídeos do canal) — `Reuse?: new`
- `VideoRow` (Dashboard de gerenciamento de vídeos do canal) — `Reuse?: new`
- `VideoThumbnail` (Dashboard de gerenciamento de vídeos do canal) — `Reuse?: new`
- `VideoTitle` (Dashboard de gerenciamento de vídeos do canal) — `Reuse?: new`
- `VideoDescription` (Dashboard de gerenciamento de vídeos do canal) — `Reuse?: new`
- `VideoStats` (Dashboard de gerenciamento de vídeos do canal) — `Reuse?: new`
- `VideoPublishedAt` (Dashboard de gerenciamento de vídeos do canal) — `Reuse?: new`
- `VideoStatusBadge` (Dashboard de gerenciamento de vídeos do canal) — `Reuse?: new`
- `PaginationControls` (Dashboard de gerenciamento de vídeos do canal) — `Reuse?: new`
- `VideoRowMenuButton` (Dashboard de gerenciamento de vídeos do canal) — `Reuse?: components/ui/icon-button.tsx`
- `NicknameField` (Edição de informações do canal) — `Reuse?: new`
- `ChannelNameField` (Edição de informações do canal) — `Reuse?: new`
- `DescriptionField` (Edição de informações do canal) — `Reuse?: new`
- `SaveChangesButton` (Edição de informações do canal) — `Reuse?: new`
- `SearchBar` (Página pública do canal) — `Reuse?: new`
- `SubscriptionsList` (Página pública do canal) — `Reuse?: new`
- `ChannelProfileHeader` (Página pública do canal) — `Reuse?: new`
- `SubscribeButton` (Página pública do canal) — `Reuse?: new`
- `NotificationBellButton` (Página pública do canal) — `Reuse?: new`
- `VideoSortControl` (Página pública do canal) — `Reuse?: new`
- `VideoCard` (Página pública do canal) — `Reuse?: new`

### Open Questions from Inventory

- O sino de notificações (NotificationBellButton, tela "Página pública do canal") aparece no design mas nenhuma fase de `docs/project-plan.md` documenta uma capability de notificações. Ficou marcado como fora de escopo/decorativo por ora nesta reconciliação — mas pode ser um gap real de escopo do projeto que vale revisitar (talvez pertença à Fase 06, junto com subscriptions, ou precise de uma capability própria).

## Non-UI / Deferred Capabilities

_None._

## Testing Requirements

### nestjs-project

| Artifact created | Required tests |
|---|---|
| Entity (`*.entity.ts`) — `Video` gains `category`, `published_at`, `visibility` columns (TD-01, TD-02) | Integration: constraints, defaults, `select: false` |
| Service with branching + DB — new `VideoPublicationService` owning the publish/unpublish validation gate (TD-02) | Unit: branch logic (mock repo) + Integration: DB contract |
| Service with DB only (no branching) — video/channel listing query service backing the dashboard and public channel page (TD-05) | Integration: DB contract |
| Service with side-effect dep (storage) — custom thumbnail upload handling via `StorageService.putObject` (TD-03) | Integration: real capture service (local MinIO) or local adapter |
| Module with configured imports | Unit: compilation test |
| Controller — new `ChannelsController` (channel edit, public channel page, video listing), video edit/publish endpoints, thumbnail upload endpoint | E2E only — do NOT write unit tests |
| DTO — video edit DTO, channel edit DTO | E2E: one validation wiring test per endpoint |
| Guard (delegates to service, e.g. ownership checks reused from the phase-03 owner-only pattern) | E2E + Unit if complex internal logic |

_`ParseFilePipe`/`FileTypeValidator`/`MaxFileSizeValidator` (TD-03's thumbnail upload validation) has no dedicated row in the testing guide — closest coverage model is the DTO row's "E2E validation wiring" pattern; confirm during `/plan-build`. The 409-Conflict nickname-collision path (TD-04) is covered by the `ChannelsController` E2E row above, not a separate artifact type._

### next-frontend

| Artifact created | Required tests |
|---|---|
| Page — dashboard listing and public channel page, sync RSC reading `searchParams` and composing client children (TD-06) | Test client children directly, cover rendered page via `*.e2e-spec.ts` |
| Client component (`"use client"`) with state/handlers — video-edit form, channel-edit form, thumbnail file picker (TD-03, TD-04) | `*.test.tsx` — RTL + `jsdom` docblock, mock `next/navigation`, MSW for fetch |
| Route handler (`app/api/**/route.ts`) — video PATCH, channel PATCH, thumbnail multipart forward, paginated video/channel listing proxy (TD-01..TD-05) | `*.integration.test.ts` with MSW (+ `*.test.ts` for extracted pure logic) |

_TD-06 recommends Option C (Server Component + `searchParams`, no client-side cache) — no data-fetching hook/library layer is introduced this phase, so no hook-layer tests apply beyond the Route Handler integration tests above._
