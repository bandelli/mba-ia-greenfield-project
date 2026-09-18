---
kind: phase
name: phase-05-video-watch-page
sources_mtime:
  docs/project-plan.md: "2026-09-11T01:11:45Z"
  docs/decisions/technical-decisions-phase-05-video-watch-page.md: "2026-09-13T22:31:28Z"
  docs/decisions/technical-decisions-next-frontend-openapi-typing.md: "2026-09-08T00:58:17Z"
  docs/decisions/technical-decisions-next-frontend-msw-foundation.md: "2026-09-11T01:11:45Z"
  docs/decisions/technical-decisions-openapi-docs-nestjs.md: "2026-09-11T01:11:45Z"
  docs/phases/phase-01-configuracao-base/context.md: "2026-09-11T01:11:45Z"
  docs/phases/phase-02-auth/context.md: "2026-09-11T01:11:45Z"
  docs/phases/phase-02-auth-frontend/context.md: "2026-09-11T01:11:45Z"
  docs/phases/phase-03-videos/context.md: "2026-09-11T01:11:45Z"
  docs/phases/phase-04-video-channel-management/context.md: "2026-09-13T16:08:28Z"
  .claude/skills/testing-guide-nestjs-project/SKILL.md: "2026-09-08T00:58:17Z"
  .claude/skills/testing-guide-next-frontend/SKILL.md: "2026-09-08T00:58:17Z"
  docs/inventories/screen-inventory-phase-05-video-watch-page.md: "2026-09-13T21:50:01Z"
---

# phase-05-video-watch-page — Context

## Scope

**Phase name:** Video Watch Page

**Capabilities** (literal, `docs/project-plan.md`):

- Video player with controls: play/pause, volume, and progress bar
- Page layout: main video + information + sidebar with suggestions
- Video description with expand/collapse
- View count
- Suggested videos from the same category in the sidebar
- Anonymous access to video viewing
- Video download button
- Unlisted videos accessible only via direct link (not shown in listings)

**Out of scope:** Not specified in project-plan.md.

**Deliverables:** Watch page with functional player, suggestions sidebar, download, and anonymous access.

**Affected subprojects:** `nestjs-project` (new public read endpoints, view-count persistence, suggested-videos query), `next-frontend` (watch page, video player).

**Deferred subprojects:** None.

**Sequencing notes:** Depends on Phase 03 (video storage/streaming/public_id) and Phase 04 (channel/video data model, category/visibility enums).

**Neighbors (for boundary detection only):**

- **Phase 04:** Video and Channel Management — depends on Phase 02, Phase 03.
- **Phase 06:** Social Interactions (Likes, Comments, Subscriptions) — depends on Phase 02, Phase 05.

## Decisions Index

| Ref | Source | Scope | Topic | Status | Decision | Libraries |
|-----|--------|-------|-------|--------|----------|-----------|
| phase-05-video-watch-page/TD-01 | phase | Cross-layer | Public/anonymous access model for video metadata, streaming and download | decided | A | — |
| phase-05-video-watch-page/TD-02 | phase | Backend | View count tracking strategy | decided | A | — |
| phase-05-video-watch-page/TD-03 | phase | Backend | Suggested videos selection algorithm | decided | A | — |
| phase-05-video-watch-page/TD-04 | phase | Frontend | Video player implementation | decided | A | — |
| phase-05-video-watch-page/TD-05 | phase | Frontend | Page layout composition strategy for the watch page | decided | A | — |
| phase-05-video-watch-page/TD-06 | phase | Frontend | Description expand/collapse interaction pattern | decided | A | — |

_Source files:_

- phase-05-video-watch-page — `docs/decisions/technical-decisions-phase-05-video-watch-page.md` (scope_type: phase)

## Capability Coverage

| Capability (from project-plan.md) | Covered by |
|-----------------------------------|------------|
| Video player with controls: play/pause, volume, and progress bar | phase-05-video-watch-page/TD-04 |
| Page layout: main video + information + sidebar with suggestions | phase-05-video-watch-page/TD-05 |
| Video description with expand/collapse | phase-05-video-watch-page/TD-06 |
| View count | phase-05-video-watch-page/TD-02 |
| Suggested videos from the same category in the sidebar | phase-05-video-watch-page/TD-03 |
| Anonymous access to video viewing | phase-05-video-watch-page/TD-01 |
| Video download button | phase-05-video-watch-page/TD-01 |
| Unlisted videos accessible only via direct link (not shown in listings) | phase-05-video-watch-page/TD-01 |

## Decisions Detail

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

**Recommendation:** the capability list asks for exactly three controls (play/pause, volume, progress bar) against a single progressive MP4 source, so native `<video>` plus the same custom-primitive pattern used everywhere else in the app is proportionate. Introducing an external player library (B or C) would be the project's first non-design-system UI dependency, for feature sets (adaptive streaming, multi-provider support) this phase does not need.
**Libraries:** —

### phase-05-video-watch-page/TD-05

**Recommendation:** CSS Grid inlined directly in the page component is the idiomatic Tailwind tool for this fixed+fluid split, and avoids Option C's premature abstraction for what is currently a single screen.
**Libraries:** —

### phase-05-video-watch-page/TD-06

**Recommendation:** Tailwind's `line-clamp` utility plus a simple client toggle matches the Figma affordance with zero new dependencies, avoiding Option C's brittle hardcoded threshold.
**Libraries:** —

## Inherited Decisions Detail

### phase-01-configuracao-base/TD-01

**Recommendation:** Official, core-team-maintained, guaranteed NestJS 11 compatibility. The `registerAs()` factory pattern solves the TypeORM CLI sharing problem: the factory function can be imported as a plain function by `data-source.ts` while also serving as a DI injection token inside NestJS. Building a custom module recreates solved functionality; third-party packages carry maintenance risk.
**Libraries:** `@nestjs/config@^4.x`

### phase-01-configuracao-base/TD-02

**Recommendation:** First-class integration with `@nestjs/config` via `validationSchema`, requiring zero custom wiring. Handles string-to-number coercion natively. Using a different tool for env validation vs. request validation is reasonable — env config is validated once at startup, DTOs are validated per-request.
**Libraries:** `joi@^17.x`

### phase-01-configuracao-base/TD-03

**Recommendation:** The project roadmap explicitly calls for auth, email, and storage in upcoming phases. Namespaced configs provide clear file boundaries per domain, typed injection via `ConfigType<typeof databaseConfig>`, and natural scalability.
**Libraries:** —

### phase-01-configuracao-base/TD-04

**Recommendation:** Natural outcome of choosing `@nestjs/config` with `registerAs`. The factory is already callable by design. `data-source.ts` imports it, calls `dotenv.config()`, then calls the factory. Zero duplication, minimal code, no extra abstraction.
**Libraries:** `dotenv` (transitive via `@nestjs/config`)

### phase-02-auth/TD-01

**Recommendation:** Argon2id — For a greenfield project in 2026, Argon2id is the OWASP-recommended choice. The native build dependency is a one-time Docker setup cost.
**Libraries:** `argon2@^0.41.x`

### phase-02-auth/TD-02

**Recommendation:** The plugin architecture costs little and future phases may add social login. Aligns with official NestJS docs. **Note:** decision deliberately diverged from the recommendation during implementation — custom guards were preferred over `@nestjs/passport` to keep the dependency surface smaller.
**Libraries:** `@nestjs/jwt@^11.0.0`

### phase-02-auth/TD-03

**Recommendation:** Provides the strongest security model with automatic theft detection. The DB write overhead is acceptable for a video platform (auth refresh is infrequent vs. video operations). PostgreSQL is already in the stack, so no new infrastructure needed.
**Libraries:** —

### phase-02-auth/TD-04

**Recommendation:** Revocability is important: when a user requests a new password reset, previous tokens should be invalidated. The DB table is trivial to implement.
**Libraries:** —

### phase-02-auth/TD-05

**Recommendation:** Best NestJS integration with minimal boilerplate. Supports SMTP, works with MailHog/Mailpit for local development without external dependencies.
**Libraries:** `@nestjs-modules/mailer@^2.x`, `handlebars@^4.x`

### phase-02-auth/TD-06

**Recommendation:** This is a backend-only project (no shared schemas with frontend), so Zod's single-source-of-truth advantage is less impactful. class-validator is the documented NestJS approach.
**Libraries:** `class-validator@^0.14.x`, `class-transformer@^0.5.x`

### phase-02-auth/TD-07

**Recommendation:** Provides machine-readable error codes that the Next.js frontend can switch on, without the overhead of RFC 9457's URI-based type system. The project is single-consumer (first-party frontend).
**Libraries:** —

### phase-02-auth/TD-08

**Recommendation:** Native NestJS integration is decisive: the guard system allows scoping rate limiting to `AuthModule` only via module-level `APP_GUARD`, with `@SkipThrottle()` for exemptions.
**Libraries:** `@nestjs/throttler@^6.x`

### phase-02-auth/TD-09

**Recommendation:** Since DB lookup is mandatory (TD-03), JWT signature adds no security value. **Note:** decision deliberately diverged — JWT was kept to reuse the access-token signing/verification infrastructure (`@nestjs/jwt`).
**Libraries:** `@nestjs/jwt@^11.0.0`

### phase-02-auth/TD-10

**Recommendation:** A strict `[a-z0-9_]` allowlist is the simplest and most portable choice: no extra dependencies, no edge cases around hyphen positioning.
**Libraries:** —

### phase-02-auth-frontend/TD-01

**Recommendation:** The strict-BFF model already nominates the Route Handler as the only NestJS caller; cookie-based sessions are the natural match. Auth.js's value is mostly unused in this configuration, and `next/headers` `cookies()` is the canonical primitive Next.js 16/React 19 already use.
**Libraries:** —

### phase-02-auth-frontend/TD-02

**Recommendation:** Defense in depth on the cookie content (`httpOnly` blocks JS, encryption blocks accidental log/proxy inspection); single cookie simplifies logout; room to carry minimal user metadata (`userId`, `email`, `channelSlug`) lets RSCs render authenticated chrome without a per-render round-trip.
**Libraries:** iron-session

### phase-02-auth-frontend/TD-03

**Recommendation:** The single-flight refresh detail is non-trivial and goes in the helper from day one — tested by MSW with a "two concurrent intercepted upstream calls; one refresh expected" assertion.
**Libraries:** —

### phase-02-auth-frontend/TD-04

**Recommendation:** Decoupled from TD-05 (works with Route Handlers or Server Actions); aligned with shadcn's canonical form primitive; Zod-first ergonomics match the rest of the FE foundation.
**Libraries:** react-hook-form, @hookform/resolvers

### phase-02-auth-frontend/TD-05

**Recommendation:** Strict-BFF alignment keeps every mutation visible under `app/api/**`; the test scaffold already exists for Route-Handlers-as-functions; single mutation surface sets the precedent for Phases 03–07.
**Libraries:** —

### phase-02-auth-frontend/TD-06

**Recommendation:** No first-render flicker, no round-trip — the session is delivered in the same response as the page HTML; no new BFF endpoint needed.
**Libraries:** —

### phase-02-auth-frontend/TD-07

**Recommendation:** First-paint-correct — the user sees the right outcome on the first paint, no skeleton, no flicker; single integration pattern across both flows (confirmation is RSC-only; reset is RSC + Client form).
**Libraries:** —

### phase-03-videos/TD-01

**Recommendation:** It is the dependency `@tus/s3-store` already requires, avoiding a second S3 client in the tree. `endpoint` + `forcePathStyle` make the same code path work against MinIO (dev) and S3-compatible storage (prod).
**Libraries:** @aws-sdk/client-s3

### phase-03-videos/TD-02

**Recommendation:** The project's infrastructure footprint today is exactly PostgreSQL + an email service; introducing Redis is justified when queue throughput or sub-second dispatch latency actually matters, and neither applies to a single-user-triggered, minutes-long video-processing job.
**Libraries:** pg-boss

### phase-03-videos/TD-03

**Recommendation:** Delivers the process isolation the architecture diagram calls for (API availability is never at the mercy of a stuck FFmpeg job) without paying the cost of a second codebase.
**Libraries:** —

### phase-03-videos/TD-04

**Recommendation:** Directly matches the architecture diagram's self-hosted FFmpeg worker, covers both required operations (metadata via `ffprobe`, thumbnail via `screenshots()`) with a mature, well-documented API.
**Libraries:** fluent-ffmpeg
**Revisions:**
- 2026-09-08 — Fixes the frame-selection rule for the automatic thumbnail: captures at `min(1s, 10% of duration)`. Rationale: avoids black opening/fade-in frames in both short and long videos.

### phase-03-videos/TD-05

**Recommendation:** The shortest URLs among the non-enumerable options, decoupled from whatever internal PK strategy the `Video` entity ends up using — the only option that cleanly satisfies both "no conflict" now and "unlisted, access only via link" later without revisiting this decision.
**Libraries:** nanoid

### phase-03-videos/TD-06

**Recommendation:** The only option where resumability is a property of the protocol rather than custom code the team must get right for every edge case. The cost — a non-REST protocol mounted as middleware — is confined to a single upload route.
**Libraries:** @tus/server, @tus/s3-store
**Revisions:**
- 2026-09-08 — Fixes the ownership model of the draft created in `onUploadCreate`: the upload endpoint requires an authenticated user, and the hook records `userId`/`channelId` on the draft `Video` before any byte transfers.

### phase-03-videos/TD-07

**Recommendation:** It is the only option that keeps video bytes off the API and BFF processes entirely, applied symmetrically to playback and download, not just upload.
**Libraries:** @aws-sdk/s3-request-presigner

### phase-03-videos/TD-08

**Recommendation:** Every new service this phase introduces is consumed exclusively by `nestjs-project/`; extending the existing backend compose file is the smallest change consistent with the current one-file-per-subproject convention.
**Libraries:** —

### phase-03-videos/TD-09

**Recommendation:** The only option that avoids wasting upload bandwidth on obviously-wrong files while never trusting spoofable client-declared metadata as the sole guard.
**Libraries:** —

### phase-03-videos/TD-10

**Recommendation:** The only option that reaches both required terminal states (`ready` and `error`) under normal operation while not wasting a whole upload on a failure that a bounded retry would have recovered from for free.
**Libraries:** —

### phase-04-video-channel-management/TD-01

**Recommendation:** Mirrors the `VideoStatus` convention already established on the same entity, requires no new table or endpoint, and the already-decided OpenAPI codegen pipeline delivers full type-safety to `next-frontend/` for free.
**Libraries:** —

### phase-04-video-channel-management/TD-02

**Recommendation:** `published_at` directly answers the dashboard's "publish time" column, `visibility` stays a clean independent concern, and a dedicated `VideoPublicationService` keeps this lifecycle out of `VideoStatusService`'s documented scope.
**Libraries:** —

### phase-04-video-channel-management/TD-03

**Recommendation:** A thumbnail is small enough that the memory-buffering concern is not material; staying inside NestJS's ordinary controller/pipe pipeline with declarative `ParseFilePipe` validation is simpler than adding a new CORS `PUT` surface.
**Libraries:** —

### phase-04-video-channel-management/TD-04

**Recommendation:** Matches this project's existing domain-exception/error-envelope convention exactly, keeps the user in control of their chosen nickname, and avoids building live-availability infrastructure that nothing in the current scope requires.
**Libraries:** —

### phase-04-video-channel-management/TD-05

**Recommendation:** Both lists this phase introduces are channel-scoped, where the concurrent-insert instability a stronger pagination model protects against is a low-probability, low-impact edge case; simplicity now matches this project's principle against designing for hypothetical future requirements.
**Libraries:** —

### phase-04-video-channel-management/TD-06

**Recommendation:** Every screen shipped in this project so far has favored the App Router's server-first primitives over a client-side cache library, and this phase's lists are channel-scoped and moderate in size, not the global feed Phase 07 will eventually build.
**Libraries:** —

### next-frontend-openapi-typing/TD-01

**Recommendation:** Three reinforcing reasons. (1) Strict BFF makes the SDK surface valueless on the client — only Route Handlers ever call the upstream Nest; they already use `fetch`. (2) Types-first matches the rest of the FE foundation — `paths` is the natural extension, one `.d.ts` file imported wherever the contract is touched. (3) MSW typing is solved by the same `paths` symbol — hand-written handlers type their resolver returns off `paths[...]`, giving the contract guarantee without generated handlers. `openapi-fetch` removes the manual `fetch(API_URL + path, ...)` boilerplate in each Route Handler while staying within the BFF model.
**Libraries:** openapi-typescript, openapi-fetch

### next-frontend-openapi-typing/TD-02

**Recommendation:** Preserves the compose-stack independence between subprojects; drift is eliminated structurally when paired with a CI freshness check that runs the sync script and asserts no diff; the committed local file is a real artifact visible in PR review.
**Libraries:** —

### next-frontend-openapi-typing/TD-03

**Recommendation:** The only option that makes contract drift both visible (in PR diffs) and impossible to merge accidentally (CI fail). The complexity premium over a simpler option is one CI step.
**Libraries:** —

### next-frontend-openapi-typing/TD-04

**Recommendation:** The only option that handles pass-through and reshape with the same mechanism, gives a single grep target for "what shape does the BFF expose", and decouples Component imports from App Router file paths. Make `lib/api/contracts.ts` the only file that imports `paths` from `types.gen.ts`; every other consumer imports from `contracts.ts`.
**Libraries:** —

### next-frontend-openapi-typing/TD-05

**Recommendation:** Determinism over auto-generation — BFF integration tests assert on specific values; randomized fixtures are anti-helpful. Coherence with TD-01 — `paths` is the single contract anchor, reused in MSW handlers so "spec ↔ handler ↔ assertion" is one type chain.
**Libraries:** —

### next-frontend-msw-foundation/TD-01

**Recommendation:** MSW's own best-practice recommends per-domain modules + barrel. Domain ownership tracks the codebase, not the project plan — handler files mirror the same vocabulary (auth, videos, channels) and remain stable as phases come and go. Append-only growth with minimal merge conflicts.
**Libraries:** —

### next-frontend-msw-foundation/TD-02

**Recommendation:** The browser worker is a future capability with no documented current consumer; wiring it now is speculative investment. Test-only `setupServer` keeps the foundation minimal and aligns 1:1 with what CLAUDE.md currently documents.
**Libraries:** —

### next-frontend-msw-foundation/TD-03

**Recommendation:** Hand-written deterministic defaults as the default — every fixture so far is naturally hand-written, and the diff-revealing override pattern is the highest-value benefit; opt-in seeded faker reserved for future bulk-collection cases (Phase 06 comment threads, Phase 07 home page grid).
**Libraries:** — (`@faker-js/faker` installed only when the first bulk builder is authored, not yet)

### next-frontend-msw-foundation/TD-04

**Recommendation:** Universal handler set loaded into `setupServer` + per-test `server.use(...)` overrides + `onUnhandledRequest: "error"` — the canonical MSW v2 model, imposing no cost on tests that don't fetch the extra URLs, and enforcing that a phase's test cannot accidentally invoke a route outside its scope.
**Libraries:** —

### openapi-docs-nestjs/TD-01

**Recommendation:** The only option that preserves the prior `class-validator` decision (phase-02-auth/TD-06) without a re-platform; the CLI plugin with `classValidatorShim: true` leverages the existing decorators to infer schemas, keeping boilerplate low.
**Libraries:** @nestjs/swagger

### openapi-docs-nestjs/TD-02

**Recommendation:** The marginal cost over a runtime-UI-only option is just one npm script, and the benefit is a correct foundation for future FE integration (offline codegen) without losing the interactive UI dev/QA use.
**Libraries:** —

### openapi-docs-nestjs/TD-03

**Recommendation:** Aligns with the defensive posture already established in phase 02 and doesn't compromise legitimate consumers — the committed `openapi.json` fulfills the role of "spec inspectable outside the UI". Reopening is trivial in the future if a public-API use case emerges.
**Libraries:** —

## Inherited Conventions

- Backend config uses `@nestjs/config` with namespaced `registerAs(name, () => ({...}))` factories — one file per domain in `src/config/`. _(from phase 01)_
- Env variables are validated by a Joi schema in `src/config/env.validation.ts`, passed to `ConfigModule.forRoot({ validationSchema, validationOptions... })`. _(from phase 01)_
- Config is injected into modules via `ConfigType<typeof xxxConfig>` and `@Inject(xxxConfig.KEY)`; the same factory is importable as a plain function outside DI. _(from phase 01)_
- `data-source.ts` loads `.env` via `import 'dotenv/config'` at the top, then imports `databaseConfig` and calls it as a plain function. _(from phase 01)_
- Database connection parameters are sourced from a single `databaseConfig` factory — never duplicated between `AppModule` and `data-source.ts`. _(from phase 01)_
- `TypeOrmModule.forRootAsync` is used (not `forRoot`), with `imports: [ConfigModule]`, `inject: [databaseConfig.KEY]`, `useFactory` returning options. _(from phase 01)_

## Inherited Deferred Capabilities

| Capability | Status | Origin phase | Rationale |
|-----------|--------|--------------|-----------|
| "Frontend screens" | deferred | phase-01-configuracao-base | `next-frontend/` is not initialized in this phase; UI surfaces start in a later phase. |
| "Registration, login, account confirmation, and password recovery screens" | deferred | phase-02-auth | `next-frontend/` is not initialized in this phase; UI surfaces start in a later phase. |
| "Account confirmation via email with an activation link" | deferred | phase-02-auth-frontend | UI landing screen de-scoped 2026-05-14; FE confirmation flow (TD-07) picked up by a future phase. BE side unchanged in `phase-02-auth`. |
| "Logout" | deferred | phase-02-auth-frontend | Logout button lives inside authenticated chrome (typically Phase 04). Phase 02 still implements POST `/api/auth/logout` (BFF route handler + `session.destroy()`) so the contract is ready when the chrome lands. |
| "Password recovery (destination screen / set-new-password)" | deferred | phase-02-auth-frontend | `/forgot-password` ships sending the email; the reset-password destination screen is absent from Figma → link destination remains a 404 until a later phase delivers the screen. |
| "Registration, login, account confirmation, and password recovery screens" | deferred | phase-02-auth-frontend | The umbrella bullet's full coverage requires the confirmation and reset-password destination screens; both deferred per rows above. |

## UI Inventory

**Source:** `docs/inventories/screen-inventory-phase-05-video-watch-page.md`
**Screens in scope:** 1

### UI ↔ Capability Join

| Screen | Route | Verb | Capability | Covering Component |
|--------|-------|------|------------|-------------------|
| Video Watch Page | /watch/[publicId] | Reproduzir vídeo com controles de play/pause, volume e barra de progresso | "Video player with controls: play/pause, volume, and progress bar" | VideoPlayer |
| Video Watch Page | /watch/[publicId] | Carregar vídeo publicado (público ou não-listado) sem autenticação, via public_id | "Anonymous access to video viewing" | VideoPlayer |
| Video Watch Page | /watch/[publicId] | Disparar download do vídeo | "Video download button" | DownloadButton |
| Video Watch Page | /watch/[publicId] | Exibir contagem de visualizações do vídeo | "View count" | ViewCountAndDate |
| Video Watch Page | /watch/[publicId] | Exibir lista de vídeos sugeridos da mesma categoria | "Suggested videos from the same category in the sidebar" | SuggestedVideoCard |

### Server-connected Components

- `VideoPlayer` (Video Watch Page) — `Reuse?: new`
- `DownloadButton` (Video Watch Page) — `Reuse?: components/ui/button.tsx`
- `ViewCountAndDate` (Video Watch Page) — `Reuse?: new`
- `SuggestedVideoCard` (Video Watch Page) — `Reuse?: new`

### Open Questions from Inventory

_No open questions._

## Non-UI / Deferred Capabilities

| Capability | Status | Rationale | TD refs |
|-----------|--------|-----------|---------|
| "Unlisted videos accessible only via direct link (not shown in listings)" | non-ui | enforced entirely by backend authorization (TD-01); no distinct UI state | phase-05-video-watch-page/TD-01 |
| "Page layout: main video + information + sidebar with suggestions" | non-ui | satisfied by the overall page composition (VideoPlayer/DescriptionCard/SuggestedVideoCard, per the screen inventory), not a distinct server-connected verb — the inventory format only tracks verbs for server-connected components | phase-05-video-watch-page/TD-05 |
| "Video description with expand/collapse" | non-ui | satisfied by the `DescriptionExpandToggle` Local-interactive component (screen inventory); it has no backend I/O, so the inventory format's verb table (server-connected only) does not carry a row for it | phase-05-video-watch-page/TD-06 |

## Testing Requirements

### nestjs-project

| Artifact created | Required tests |
|---|---|
| Entity/migration change (`views` column on `videos`) | Integration: constraints, defaults |
| Service with branching + DB (public video lookup, view-count increment, suggested-videos query) | Unit: branch logic (mock repo) + Integration: DB contract |
| Module with configured imports (new public routes wiring) | Unit: compilation test |
| Controller (new `@Public()` endpoints) | E2E only — do NOT write unit tests |
| DTO (query params for suggestions/pagination, if any) | E2E: one validation wiring test per endpoint |

### next-frontend

| Artifact created | Required tests |
|---|---|
| Page — async RSC (watch page, fetches public video + suggestions server-side) | `*.e2e-spec.ts` only — Vitest cannot render it |
| Client component (`"use client"`) — VideoPlayer controls, description expand/collapse toggle | `*.test.tsx` — RTL + `jsdom` docblock, mock `next/navigation` if used, MSW for fetch |
| Feature component (server, composes primitives) — SuggestedVideoCard, ViewCountAndDate, description card | Skip unit; cover via the page's E2E |
| Route handler (`app/api/**/route.ts`) if a BFF proxy is introduced for the new public endpoints | `*.integration.test.ts` with MSW |
| `lib/` utility (e.g., any new formatting helper) | `*.test.ts` |
