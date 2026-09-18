# phase-03-videos — Progress

**Status:** completed
**SIs:** 8/8 completed

### SI-03.1 — Storage module (S3-compatible client)
- **Status:** completed
- **Tests:** 4 passing
- **Observations:**
  - The `minio` service was added to `compose.yaml` in this SI (out of the original scope, which reserved that for SI-03.8) because this SI's own test (`real @aws-sdk/client-s3 lib against local MinIO test config`) requires a real MinIO instance running — a technical dependency that precedes the plan's order. SI-03.8 will only handle `video-worker` + docs; `minio` is already in place.
  - `streamtube` bucket created manually via `minio/mc` (MinIO doesn't create the bucket automatically).
  - Fixed a pre-existing `MAIL_FROM` quoting bug in `.env.example` (unquoted angle brackets, documented as "Wrong" in `CLAUDE.md` itself) while creating `.env` — out of scope for this SI, but trivial and in the same file being touched.
  - The `db` service's host port was remapped from `5432` to `5433` in `compose.yaml` (an unrelated Postgres container was already occupying 5432 on the machine) — the container's internal port stays `5432`, no impact on `DB_HOST=db`/`DB_PORT=5432`.

### SI-03.2 — Background processing queue (pg-boss)
- **Status:** completed
- **Tests:** 3 passing
- **Observations:**
  - `pg-boss@12.30.0` (latest version) is a pure ESM package (`"type": "module"`) — a static `import` fails under Jest's `require()` ("Cannot use import statement outside a module"). Attempt 1 (dynamic `import()` inside `onModuleInit`) still failed because Jest's CJS runtime doesn't run native `import()` without the `--experimental-vm-modules` flag. Resolved by downgrading to `pg-boss@11.1.2` (the latest major still CommonJS), with an identical API (`createQueue`/`send`/`work`) — a root-cause fix, no need to touch Jest's global config.
  - Discovered along the way: NestJS's `Test.createTestingModule({...}).compile()` does **not** run `onModuleInit` hooks by itself — it needs an explicit `await moduleRef.init()`. Without it, `QueueService.boss` was never initialized in tests. Both specs (`queue.module.spec.ts`, `queue.service.spec.ts`) were adjusted to call `.init()` after `.compile()`.

### SI-03.3 — Video processing pipeline (metadata + thumbnail)
- **Status:** completed
- **Tests:** 3 passing
- **Observations:**
  - `ffmpeg`/`ffprobe` were not installed in the dev image (`Dockerfile.dev`) — added `ffmpeg` to `apt install` (the Debian package includes both binaries) and rebuilt the image (`docker compose up -d --build nestjs-api`). Needed for this SI even before SI-03.4 (dedicated worker), since this SI's own test runs `fluent-ffmpeg` for real.
  - `fluent-ffmpeg`'s `screenshots()` doesn't work with input streams — `VideoProcessingService` downloads the object from storage to a local temp file (`fs/promises` + `stream/promises pipeline`) before running `ffprobe`/`screenshots()`, and cleans up the temp files in a `finally`.
  - The test uses a synthetic fixture video generated on-the-fly via `ffmpeg`'s `lavfi testsrc` (2s, 320x240) instead of committing a video binary to the repo.
  - `@types/fluent-ffmpeg` installed as a devDependency for `FfprobeData` typing.

### SI-03.4 — Video worker (dedicated process)
- **Status:** completed
- **Tests:** 23 passing (main.spec.ts: 4; queue.service.spec.ts: 5, 2 new; video-status.service.integration-spec.ts: 3; video.entity.integration-spec.ts: 9; videos.module.spec.ts: 1 — the last 4 files were re-run since they were affected by the new columns)
- **Observations:**
  - Extended the `Video` entity (SI-03.5) with 4 columns the plan had explicitly left "out of scope" for `/implement` to resolve once the functional need appeared: `storage_key` (not null — TD-01/TD-06), `thumbnail_key` (nullable — TD-04), `duration_seconds` (nullable — TD-04) and `metadata` jsonb (nullable — TD-04). The worker couldn't function without them (it needs to know where the source file is and where to persist the extraction result). Two new migrations generated via CLI (`AddVideoStorageKeys`, `AddVideoMetadataFields`), never hand-written.
  - Created `VideoStatusService` (`src/videos/video-status.service.ts`) — not in the plan as an explicit artifact, but it's the only clean way for the worker (a standalone process, no controller) and the future upload endpoint (SI-03.6) to share the status-transition logic without duplicating queries. Exported by `VideosModule`.
  - Extended `QueueService` (SI-03.2, already complete) with a new `workWithMetadata()` method that passes `{ includeMetadata: true }` to `pg-boss`, exposing `job.retryCount`/`job.retryLimit` to the handler — needed for the worker to know when it's on the last attempt before the job fails permanently (per TD-10). The original `work()` method wasn't changed (keeps its already-tested signature and behavior from SI-03.2 intact); `workWithMetadata()` is additive.
  - **Two bugs caught in the fix-loop, both documented so they don't repeat:**
    1. `worker/main.spec.ts` used `await import('./main.js')` to load the entrypoint inside the test — failed with `"A dynamic import callback was invoked without --experimental-vm-modules"` (this project's Jest runs pure CJS). Same class of ESM/CJS problem already seen with `pg-boss` in SI-03.2. Fixed by switching to `require('./main')` (with a targeted `eslint-disable-next-line` for `no-require-imports`, since it's the only correct way to reload a module with a bootstrap side effect inside a CJS test).
    2. After the fix above, the "registers a workWithMetadata handler" test failed with 0 registered calls — cause: `beforeEach` called `jest.clearAllMocks()`, which also cleared `workWithMetadata`'s call history (invoked once, in `beforeAll`, during bootstrap). Fixed by replacing it with individual `mockClear()` calls on the mocks that actually need a per-test reset, preserving `workWithMetadata`'s history.
  - `Dockerfile.dev` did **not** need a change in this SI — `ffmpeg`/`ffprobe` had already been installed in SI-03.3 (the dev image is shared between `nestjs-api` and the future `video-worker` service, with no multi-stage build). The plan's "add a video-worker stage/target to the Dockerfile" item doesn't apply to this project's actual convention — there are no stages/targets, just one dev image with a different `command:` per service (that's SI-03.8's job, when adding the service to `compose.yaml`).
  - Added the `worker:start` and `worker:start:dev` scripts to `package.json`, using `nest start --entryFile worker/main` (mirroring the existing `start`/`start:dev` pair).

### SI-03.5 — Video entity: unique public identifier, ownership, and status lifecycle
- **Status:** completed
- **Tests:** 8 passing
- **Observations:**
  - Implemented out of the order listed in the plan file: `/plan-build --rebuild` (incorporating TD-10) made SI-03.4 (worker) depend on SI-03.5 (it didn't before) — per the updated Dependency Map, SI-03.5 is a root and needs to run before SI-03.4. Followed the Dependency Map/Dependencies field, not the file's reading order.
  - `nanoid@^3.3.8` deliberately chosen over the latest major (v5/v6) — nanoid v4+ is ESM-only; v3.x still publishes a CommonJS build (a `require` condition in package.json), avoiding the same `"Cannot use import statement outside a module"` problem already seen with `pg-boss` in SI-03.2.
  - `public_id` generated via a `@BeforeInsert()` hook on the entity itself (rather than in the service layer) — keeps the "every Video has a public_id" invariant contained in the entity, since no service exists yet at this SI (will be created in SI-03.6).
  - `cleanAllTables()` (shared helper in `src/test/create-test-data-source.ts`) updated to delete `videos` before `channels`/`users` — without this, any future test that creates a `Video` would break other suites' cleanup with an FK violation.

### SI-03.6 — Upload endpoint (tus protocol, authentication, and validation)
- **Status:** completed
- **Tests:** 15 passing (video-upload.service.integration-spec.ts: 5; videos.module.spec.ts: 1; channels.service.integration-spec.ts: 4, 2 new for `findByUserId`; video-upload.e2e-spec.ts: 5)
- **Observations:**
  - `@tus/server`/`@tus/s3-store` are yet another case of the recurring ESM/Jest incompatibility class already seen with `pg-boss` (SI-03.2) and `nanoid` (SI-03.5), but this time the package itself is irremovable (it's the TD-06 decision itself) — resolved with Jest config instead of swapping the dependency. Cause chain: `@tus/server` imports `srvx` (a transitive dependency, also ESM-only) → `srvx/dist/adapters/node.mjs` breaks `jest-runtime`'s parser with `SyntaxError: Cannot use import statement outside a module`. `transformIgnorePatterns` alone doesn't fix it — it only turns off Jest's "ignore", but the file still needs a real transformer to convert `import`/`export` to `require`. An attempt with `ts-jest` (even with an inline `tsconfig.module: "commonjs"` override) failed silently: the TypeScript compiler treats the `.mjs` extension as unconditionally ESM (`impliedNodeFormat`), ignoring the override's `module` option — `ts-jest` runs with no error but returns the file with no `import` transformed. Resolved with a dedicated Jest transformer (`nestjs-project/jest-esm-transform.js`) using `@babel/core` + `@babel/plugin-transform-modules-commonjs` (a new devDependency, pinned to `^7` due to a peer-dependency conflict with the v8 already present transitively) registered only for the `^.+\.mjs$` pattern, keeping `ts-jest` for `.ts`/`.js`. Applied in `package.json` (`jest.transform`) and `test/jest-e2e.json`; `transformIgnorePatterns: ["/node_modules/(?!(@tus|srvx)/)"]` is still needed in both.
  - Discovered during E2E work: `@tus/server` v2.4.5 wraps Express's `req`/`res` in the `srvx` adapter before invoking the hooks (`onUploadCreate`/`onUploadFinish`) — the `req` object received in the hook is not the same Express `req` where `TusAuthMiddleware` writes `req.user`, it's a `srvx` `NodeRequest`. The original value is reachable via `req.runtime.node.req` (an informally documented back-reference in `srvx`'s own source, with no public types). Resolved with a `getAuthenticatedUser(req)` helper in `TusServerMiddleware` that navigates that reference instead of casting `req` directly to `AuthenticatedRequest`.
  - `upload.id` (the `@tus/s3-store`'s internal identifier, the only stable data available in both `onUploadCreate` and `onUploadFinish`) used as the `Video`'s `storage_key` — avoids depending on `upload.storage.path`, whose availability at hook time isn't guaranteed by tus's documentation.
  - Added `ChannelsService.findByUserId(userId)` (uses `findOneByOrFail`) — needed for `VideoUploadService.createDraft` to resolve the `channel_id` of the authenticated caller from the JWT's `user_id`.
  - Three new `DomainException` subclasses (`UploadUnauthenticatedException`, `UploadInvalidFileTypeException`, `UploadContentValidationFailedException`) following the pattern already established in Phase 02.
  - Authentication re-implemented at the middleware layer (`TusAuthMiddleware`, reusing `JwtService`/`BEARER_PREFIX`/`JwtPayload` from the already-existing auth guard) because tus is mounted as plain Express middleware (via `NestModule.configure()`), outside Nest's Guards/Controllers pipeline — a decision already recorded in TD-06.
  - Fixed two bugs in `test/video-upload.e2e-spec.ts` itself (written in this SI) during the fix-loop, after the ESM transformer stopped masking the real tests: (1) the `upload-metadata-invalida-400-sem-draft` test read `res.body.error`, but `@tus/server` doesn't set `Content-Type: application/json` on the error response (`toTusError`) — fixed to `JSON.parse(res.text).error`, the same pattern already used in the file's other tests; (2) the upload-continuation `PATCH` requests weren't sending the `Authorization` header — since `TusAuthMiddleware` protects both the creation route and the `:id` route, every request to the tus mount requires the token, so the `PATCH`s need the header too.
  - **Pre-existing lint debt confirmed, out of scope for this SI:** `npm run lint` reports 156 errors / 40 warnings, but none are new — all in files untouched in this session (`src/channels/channels.service.ts` lines 12-16, `channels.service.spec.ts`, `domain-exception.filter.spec.ts`, `validation-exception.filter.spec.ts`, `env.validation.integration-spec.ts`, `mail.service.integration-spec.ts`, `users.service.integration-spec.ts`, `test/auth.e2e-spec.ts`) or deliberately following the same pattern already present in `test/*.e2e-spec.ts` (6 `no-unsafe-member-access`/`no-unsafe-assignment` errors in `test/video-upload.e2e-spec.ts`, identical in shape to those already present in `auth.e2e-spec.ts`). Since "lint passes" is a Definition of Done criterion, this needs an explicit user decision (accept the debt as-is, or open a dedicated cleanup task) before the phase's final verification.

### SI-03.7 — Streaming and download endpoints (presigned URLs)
- **Status:** completed
- **Tests:** 4 passing
- **Observations:**
  - Created `VideosService` (`src/videos/videos.service.ts`) — not explicitly in the plan as an artifact, but it's the correct place (per `.claude/rules/nestjs-layer-separation.md`) for the owner+ready read query, since `VideoStatusService` is scoped only to status transitions (per that class's own comment). `VideosController` delegates to it before calling `StorageService.getPresignedUrl`.
  - `:id` in the path resolved as `Video.public_id` (not the internal `id` uuid) — consistent with `phase-03-videos/TD-05`'s purpose (an opaque, non-enumerable public identifier for the video's URL); using the internal uuid would expose sequence/count through a different vector than the watch URL.
  - Added `VideoNotFoundException` (`VIDEO_NOT_FOUND`, 404) to `domain.exception.ts`, covering the three cases that are indistinguishable by design (video doesn't exist, doesn't belong to the caller, or `status != ready`) — the plan's `## Error Catalog` has no dedicated entry for this 404 (only the 3 upload ones), so the `errorCode` was chosen following the already-established convention instead of leaving it uncoded.
  - Local environment needed a reset: the `db` container had been recreated without migrations applied (`refresh_tokens does not exist` on the first test run) — ran `docker compose exec nestjs-api npm run migration:run` before re-running the tests. Out of scope for this SI (environment, not code), logged here only for history.

### SI-03.8 — Docker Compose topology for new infrastructure
- **Status:** completed
- **Tests:** no tests (infra)
- **Observations:**
  - Technical action 1 (the `minio` service in `nestjs-project/compose.yaml`) had already been done since SI-03.1 (see that SI's observation) — nothing to change here.
  - Added the `video-worker` service to `compose.yaml`: same `build`/`Dockerfile.dev`/volume bind as `nestjs-api`, but with an explicit `command: npm run worker:start:dev` (instead of `nestjs-api`'s idle default `tail -f /dev/null`) — unlike the rest of the project, the worker runs its process automatically on `docker compose up`, since its only purpose is consuming the queue; there's no need for the interactive-shell flexibility `nestjs-api` keeps for ad-hoc commands (tests, migrations, lint).
  - No Dockerfile stage/target (confirmed as not applicable to this project's convention since SI-03.4's observation) — differentiation is via `command:` only, as the plan already anticipated.
  - Verified manually: `docker compose up -d` brings up the 5 services (`db`, `mailpit`, `minio`, `nestjs-api`, `video-worker`) healthy; `video-worker`'s logs confirm a clean Nest bootstrap and `"listening on queue \"video.uploaded\""`, with no connection errors to `minio`/`db` — confirms it resolves `http://minio:9000` by the Compose service name, never `localhost`.
  - `nestjs-project/CLAUDE.md` gained the new `## Services` section (between "Development Environment" and "Commands") documenting `minio` and `video-worker`, including the note about the `command:` convention above.
