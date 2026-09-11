---
kind: phase
name: phase-03-videos
test_specs_aware: true
sources_mtime:
  docs/phases/phase-03-videos/context.md: "2026-09-09T17:57:48"
  docs/decisions/technical-decisions-phase-03-videos.md: "2026-09-09T14:15:19"
  docs/decisions/technical-decisions-openapi-docs-nestjs.md: "2026-09-07T21:58:17"
---

# Phase 03 — Video Upload and Processing

## Objective

Implement the file storage service (videos and thumbnails) and the background processing service (queues), video upload supporting files up to 10GB without performance impact with automatic pre-registration of the video as a draft when the upload starts, automatic video processing after upload (duration/metadata extraction and automatic thumbnail generation) with the video status lifecycle (draft → processing → ready/error) and processing-failure handling, unique URL generation per video with no conflicts with other videos, and streaming playback and download of the video by the user — delivering a functional upload of up to 10GB, automatic video processing, working streaming, and unique URLs generated.

---

## Step Implementations

### SI-03.1 — Storage module (S3-compatible client)

**Description:** Creates the file storage service (videos and thumbnails) on top of `@aws-sdk/client-s3`, configurable for MinIO (dev) or real S3 (prod) with no code change.

**Technical actions:**

1. Create `nestjs-project/src/storage/storage.config.ts` — `registerAs('storage', ...)` factory with `endpoint`, `forcePathStyle`, `region`, `bucket`, credentials via env (per `phase-03-videos/TD-01`, following the `registerAs` convention from `phase-01-configuracao-base/TD-03`)
2. Add the storage keys to `env.validation.ts`'s Joi schema (per `phase-01-configuracao-base/TD-02`)
3. Create `nestjs-project/src/storage/storage.service.ts` — `StorageService` wrapping `S3Client` (`putObject`, `getObject`, `deleteObject`) and `@aws-sdk/s3-request-presigner` (`getPresignedUrl`) (per `phase-03-videos/TD-01`)
4. Create `nestjs-project/src/storage/storage.module.ts` — `StorageModule` with `ConfigModule.forFeature(storageConfig)` and exporting `StorageService`
5. Register `StorageModule` in `AppModule`

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `StorageModule` | Unit: compilation test | `storage.module.spec.ts` |
| `StorageService` | Unit: real `@aws-sdk/client-s3` lib against local MinIO test config | `storage.service.spec.ts` |

**Dependencies:** none

**Acceptance criteria:**

- `StorageService.putObject` with a valid buffer stores the object in the configured bucket and returns the generated key.
- `StorageService.deleteObject` removes an existing object from the bucket.
- `StorageService.getPresignedUrl` for an existing key returns a signed URL valid for a limited time.
- The same configuration (`endpoint` + `forcePathStyle`) works against both MinIO (dev) and a production S3-compatible endpoint, with no code branching (per `phase-03-videos/TD-01`).

---

### SI-03.2 — Background processing queue (pg-boss)

**Description:** Creates the background queue service on top of `pg-boss`, reusing the PostgreSQL connection the project already operates.

**Technical actions:**

1. Create `nestjs-project/src/queue/queue.config.ts` — `registerAs('queue', ...)` factory reusing `databaseConfig`'s connection string (per `phase-03-videos/TD-02`, `phase-01-configuracao-base/TD-03`)
2. Create `nestjs-project/src/queue/queue.service.ts` — `QueueService` wrapping `pg-boss` (`start()`, `send()`, `work()`) (per `phase-03-videos/TD-02`)
3. Create `nestjs-project/src/queue/queue.module.ts` — `QueueModule` exporting `QueueService`
4. Register `QueueModule` in `AppModule`

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `QueueModule` | Unit: compilation test | `queue.module.spec.ts` |
| `QueueService` | Unit: real `pg-boss` lib against test Postgres config | `queue.service.spec.ts` |

**Dependencies:** none

**Acceptance criteria:**

- `QueueService.send('video.uploaded', payload)` inserts a job into the queue (per `phase-03-videos/TD-02`, producer defined in `phase-03-videos/TD-09`).
- A job registered via `QueueService.work` is processed by an active handler.
- A job whose handler throws is automatically resent up to the retry/backoff limit configured by `pg-boss` (per `phase-03-videos/TD-02`).

---

### SI-03.3 — Video processing pipeline (metadata + thumbnail)

**Description:** Creates the service that extracts duration/metadata via `ffprobe` and generates the automatic thumbnail via `fluent-ffmpeg`, applying the frame-selection rule fixed in the Revision.

**Technical actions:**

1. Create `nestjs-project/src/processing/video-processing.service.ts` — `VideoProcessingService.extractMetadata(key)` calling `ffmpeg.ffprobe` on the object read via `StorageService` (per `phase-03-videos/TD-04`)
2. Implement `VideoProcessingService.generateThumbnail(key)` — `.screenshots({ timestamps: [...] })` capturing the frame at `min(1s, 10% of duration)`, persisting the thumbnail via `StorageService.putObject` (per `phase-03-videos/TD-04` and its 2026-09-08 Revision)
3. Create `nestjs-project/src/processing/processing.module.ts` — `ProcessingModule` importing `StorageModule`, exporting `VideoProcessingService`
4. Register `ProcessingModule` in `AppModule`

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `ProcessingModule` | Unit: compilation test | `processing.module.spec.ts` |
| `VideoProcessingService` | Unit: real `fluent-ffmpeg` lib against a fixture video file | `video-processing.service.spec.ts` |

**Dependencies:** SI-03.1 — `StorageService` provides reading of the original object and writing of the generated thumbnail.

**Acceptance criteria:**

- `VideoProcessingService.extractMetadata` returns correct duration and metadata for a valid video file.
- `VideoProcessingService.generateThumbnail` captures the frame at `min(1s, 10% of duration)` of the video (per `phase-03-videos/TD-04` Revision, 2026-09-08).
- The generated thumbnail is persisted to object storage via `StorageService.putObject`.

---

### SI-03.4 — Video worker (dedicated process)

**Description:** Creates the dedicated worker entrypoint that consumes the `video.uploaded` queue, delegates to the processing pipeline, and reflects the result in the `Video`'s status lifecycle — isolating heavy processing from the API process.

**Technical actions:**

1. Create `nestjs-project/src/worker/main.ts` — standalone bootstrap (`NestFactory.createApplicationContext`) registering `QueueService.work('video.uploaded', handler)` calling `VideoProcessingService`; on success, updates `Video.status = 'ready'` (per `phase-03-videos/TD-03`; status per `phase-03-videos/TD-10`)
2. Add a `video-worker` stage/target to the `nestjs-project/` `Dockerfile`, with `ffmpeg`/`ffprobe` installed in the image (per `phase-03-videos/TD-03`, `TD-04`)
3. Add a `worker:start` script to `package.json`
4. Implement the job-completion listener (`pg-boss`'s `onComplete`/final `failed` state) — when the `video.uploaded` job exhausts the `retryLimit` configured in `phase-03-videos/TD-10`, updates `Video.status = 'error'` and persists the last failure message in `Video.processingError` (per `phase-03-videos/TD-10`)

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `worker/main.ts` | Unit: bootstrap/compilation test — the closest coverage model while no guide dedicated to worker entrypoints exists yet (per the note in context.md's `## Testing Requirements`) | `main.spec.ts` |

**Dependencies:** SI-03.2 (queue), SI-03.3 (processing pipeline), SI-03.5 (`Video` entity — status/processingError)

**Acceptance criteria:**

- The worker process starts independently of the API process — worker failures do not bring down the API (per `phase-03-videos/TD-03`).
- A job published to `video.uploaded` is consumed by the worker and results in extracted metadata, a generated thumbnail, and `Video.status = 'ready'`.
- A job whose handler fails repeatedly until the `retryLimit` is exhausted results in `Video.status = 'error'` with `Video.processingError` populated (per `phase-03-videos/TD-10`).

---

### SI-03.5 — Video entity: unique public identifier, ownership, and status lifecycle

**Description:** Creates the `Video` entity with the opaque public identifier (`nanoid`), the ownership fields (`userId`, `channelId`) fixed in `phase-03-videos/TD-06`'s Revision, and the status lifecycle (`status`/`processingError`) decided in `phase-03-videos/TD-10`.

**Technical actions:**

1. Create `nestjs-project/src/videos/video.entity.ts` — `userId` (uuid, FK → `User`) and `channelId` (uuid, FK → `Channel`) columns, both `not null` (per `phase-03-videos/TD-06` Revision, 2026-09-08); public identifier column via `nanoid` (per `phase-03-videos/TD-05`); `status` column (enum `draft`/`processing`/`ready`/`error`, not null, default `draft`) and `processingError` column (text, nullable) (per `phase-03-videos/TD-10`) — the remaining columns (storage keys, duration/metadata) are out of scope for this phase (per the note "This document decides the Video entity's status lifecycle... but NOT the rest of its schema" in `phase-03-videos`)
2. Create a TypeORM migration for the `video` table
3. Create `nestjs-project/src/videos/videos.module.ts` — `VideosModule` with `TypeOrmModule.forFeature([Video])`
4. Register `VideosModule` in `AppModule`

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `Video` (entity) | Integration: constraints, defaults, unique index on the public identifier, `status` default | `video.entity.integration-spec.ts` |
| `VideosModule` | Unit: compilation test | `videos.module.spec.ts` |

**Dependencies:** none

**Acceptance criteria:**

- Inserting a `Video` without `userId` or without `channelId` violates the `not null` constraint.
- Two `Video`s never receive the same public identifier (unique index, per `phase-03-videos/TD-05`).
- The public identifier is short and URL-safe (per `phase-03-videos/TD-05`).
- A `Video` created without an explicit `status` gets the `draft` default; `processingError` is `null` by default (per `phase-03-videos/TD-10`).

---

### SI-03.6 — Upload endpoint (tus protocol, authentication, and validation)

**Description:** Mounts the resumable tus middleware, requires authentication, creates the `Video` draft with immediate ownership, applies two-layer content validation (fast-reject + authoritative check), and transitions the video status to `processing` when the processing job is published.

**Technical actions:**

1. Mount `@tus/server` + `@tus/s3-store` as Express middleware inside `nestjs-api` (per `phase-03-videos/TD-06`), behind an auth guard reused from `phase-02-auth` (per `phase-03-videos/TD-06` Revision, 2026-09-08)
2. Implement `onUploadCreate` — rejects (400) when the type declared in `Upload-Metadata` fails the allow-list; on pass, creates the `Video` draft (`status: draft`) recording `userId`/`channelId` from the authenticated caller (per `phase-03-videos/TD-06` Revision, `phase-03-videos/TD-09`; `status` default per `phase-03-videos/TD-10`)
3. Implement `onUploadFinish` — runs `ffprobe` on the complete object (via `VideoProcessingService.extractMetadata`); on failure, deletes the S3 object and the `Video` draft (422); on success, updates `Video.status = 'processing'` and publishes the `video.uploaded` job via `QueueService.send` with `retryLimit: 3, retryBackoff: true` (per `phase-03-videos/TD-09`; status and retry policy per `phase-03-videos/TD-10`)
4. Map the `UPLOAD_INVALID_FILE_TYPE` (400), `UPLOAD_UNAUTHENTICATED` (401), and `UPLOAD_CONTENT_VALIDATION_FAILED` (422) errors in the inherited domain-exception filter (per `phase-02-auth/TD-07`)

**Route:** POST /videos/uploads (tus session — multiple tus methods mounted on the same path)
**Test Specs:** see `nestjs-project/specs/video-upload.plan.md`
**Authorization:** Authenticated (per `phase-03-videos/TD-06` Revision, 2026-09-08)

**Tests:** _(empty — Middleware: E2E only per the project's convention, moved to a /plan-test-specs spec)_

**Dependencies:** SI-03.1 (storage), SI-03.2 (queue), SI-03.5 (`Video` entity)

**Acceptance criteria:**

- An upload session with no authenticated caller returns `401` with `errorCode: "UPLOAD_UNAUTHENTICATED"`.
- An upload session with `Upload-Metadata` declaring a type outside the video allow-list returns `400` with `errorCode: "UPLOAD_INVALID_FILE_TYPE"`, without creating a draft.
- A valid upload session creates a `Video` draft with `status: draft` and the caller's `userId`/`channelId`, before any byte of the file is transferred.
- A completed upload whose content fails the `ffprobe` check returns `422` with `errorCode: "UPLOAD_CONTENT_VALIDATION_FAILED"`, and removes both the S3 object and the `Video` draft.
- A complete, valid upload updates `Video.status` to `processing` and publishes the `video.uploaded` job to the queue with bounded retry (per `phase-03-videos/TD-10`).

---

### SI-03.7 — Streaming and download endpoints (presigned URLs)

**Description:** Exposes the endpoints that issue short-lived presigned URLs for streaming playback and for downloading the processed video, conditioned on the video being `ready`.

**Technical actions:**

1. Create `nestjs-project/src/videos/videos.controller.ts` with `GET /videos/:id/stream-url` and `GET /videos/:id/download-url`, both calling `StorageService.getPresignedUrl` (per `phase-03-videos/TD-07`)
2. Map the `404` error for when the `Video` doesn't exist or when `Video.status !== 'ready'` (per `phase-03-videos/TD-10`)

**Route:** GET /videos/:id/stream-url, GET /videos/:id/download-url
**Test Specs:** see `nestjs-project/specs/video-delivery.plan.md`
**Authorization:** Owner (per `## Technical Specifications` → Authorization Matrix; public/unlisted visibility is left for Phase 04)

**Tests:** _(empty — Controller: E2E only per the project's convention, moved to a /plan-test-specs spec)_

**Dependencies:** SI-03.1 (storage), SI-03.5 (`Video` entity)

**Acceptance criteria:**

- `GET /videos/:id/stream-url` for the caller's own video with `status: ready` returns `200` with a presigned `url` valid for a limited time.
- `GET /videos/:id/download-url` for the caller's own video with `status: ready` returns `200` with a presigned `url` valid for a limited time.
- `GET /videos/:id/stream-url` for a nonexistent `id` returns `404`.
- `GET /videos/:id/stream-url` for the caller's own video whose `status` is `draft`, `processing`, or `error` returns `404` (per `phase-03-videos/TD-10`).

---

### SI-03.8 — Docker Compose topology for new infrastructure

**Description:** Extends `nestjs-project`'s `compose.yaml` with the infrastructure services introduced in this phase (object storage and dedicated worker).

**Technical actions:**

1. Add the `minio` service to `nestjs-project/compose.yaml`, on the same default network as `nestjs-api`/`db` (per `phase-03-videos/TD-08`)
2. Add the `video-worker` service to `compose.yaml`, using the stage/target created in `SI-03.4` (per `phase-03-videos/TD-08`)
3. Update `nestjs-project/CLAUDE.md` with the new `## Services` section documenting `minio` and `video-worker`

**Tests:** _(empty — Infra: compose configuration, no testable logic in code)_

**Dependencies:** SI-03.1 (storage), SI-03.2 (queue), SI-03.4 (worker)

**Acceptance criteria:**

- `docker compose up` brings up `minio` and `video-worker` alongside the existing services (`nestjs-api`, `db`, `mailpit`).
- `nestjs-api` and `video-worker` reach `minio` by the Compose service name (`http://minio:9000`), never via `localhost`.
- `nestjs-project/compose.yaml` remains the only backend orchestration file — `next-frontend/` keeps a separate stack (per `phase-03-videos/TD-08`).

---

## Technical Specifications

### Data Model

#### Video

| Field | Type | Constraints |
|-------|------|-------------|
| userId | uuid | FK → User, not null — stamped in `onUploadCreate` at draft creation *(per phase-03-videos/TD-06 Revision, 2026-09-08)* |
| channelId | uuid | FK → Channel, not null — stamped in `onUploadCreate` at draft creation *(per phase-03-videos/TD-06 Revision, 2026-09-08)* |
| status | enum(`draft`, `processing`, `ready`, `error`) | not null, default `draft` — `draft` set in `onUploadCreate`; `processing` set when the validated upload is queued in `onUploadFinish`; `ready` set by the worker on successful metadata/thumbnail extraction; `error` set once `pg-boss`'s bounded retry is exhausted *(per phase-03-videos/TD-10)* |
| processingError | text | nullable — the last processing failure's message, populated only when `status = error`; cleared (`null`) whenever `status` is anything else *(per phase-03-videos/TD-10)* |

**Relations:** `Video` belongs to `User` and to `Channel` (many-to-one each) — ownership is assigned at draft creation, not later.
**Indexes:** _undetermined — the remaining `Video` schema (public identifier column, storage/thumbnail keys, duration/metadata fields, title) is explicitly out of scope for `phase-03-videos`'s decisions doc ("This document decides the Video entity's status lifecycle... but NOT the rest of its schema"). `/implement` resolves the remaining columns with the `typeorm` skill against the functional requirements already fixed by `phase-03-videos/TD-01` (storage), `TD-04` (processing/metadata + thumbnail), and `TD-05` (unique public identifier), without contradicting the ownership and status fields above._

### API Contracts

#### Upload session — tus protocol mount (SI-03.6)

**Mount:** tus 1.0 protocol middleware (`@tus/server` + `@tus/s3-store`), mounted at a dedicated upload route *(per phase-03-videos/TD-06)*. _Exact route path is not verbatim in TD-06's Recommendation prose; `/implement` fixes the concrete path during SI-03.6, following the project's existing REST namespace conventions._

**Request headers:**
- `Authorization`: required — the caller must be an authenticated user *(per phase-03-videos/TD-06 Revision, 2026-09-08)*
- `Upload-Metadata`: tus-standard comma-separated key/value pairs — carries the client-declared filename/filetype consumed by the `onUploadCreate` fast-reject check *(per phase-03-videos/TD-09)*

**onUploadCreate behavior:**
- Rejects (400) when `Upload-Metadata`'s declared file type/extension fails the video allow-list check, before the draft row is created *(per phase-03-videos/TD-09)*
- On pass: creates the draft `Video` row with `status: draft`, stamping `userId`/`channelId` from the authenticated caller *(per phase-03-videos/TD-06 Revision, 2026-09-08; `status` default per phase-03-videos/TD-10)*

**onUploadFinish behavior:**
- Runs `ffprobe` against the fully-uploaded object; on failure, deletes both the S3 object and the draft `Video` row created in `onUploadCreate` *(per phase-03-videos/TD-09)*
- On pass: transitions the `Video` row's `status` to `processing` and enqueues the `video.uploaded` job (see `### Events/Messages`) *(per phase-03-videos/TD-10; producer per phase-03-videos/TD-09)*

**Error responses:**
- 400 UPLOAD_INVALID_FILE_TYPE: declared file type fails the `onUploadCreate` allow-list check *(per phase-03-videos/TD-09)*
- 401 UPLOAD_UNAUTHENTICATED: caller not authenticated *(per phase-03-videos/TD-06 Revision)*
- 422 UPLOAD_CONTENT_VALIDATION_FAILED: `ffprobe` authoritative check fails after upload completes *(per phase-03-videos/TD-09)*

---

#### GET /videos/:id/stream-url (SI-03.7)

_Route inferred from TD-07's topic ("Media Delivery Mechanism for Streaming & Download") and the "Streaming playback" capability — not verbatim in the Recommendation prose; confirm during `/implement`._

**Response 200:**
- url: string — short-lived presigned object-storage URL *(per phase-03-videos/TD-07)*

**Error responses:**
- 404: video not found, or `status != ready` *(per phase-03-videos/TD-10 — a `draft`/`processing`/`error` video has no playable object yet)*

---

#### GET /videos/:id/download-url (SI-03.7)

_Route inferred the same way as the stream-url endpoint above — not verbatim in TD-07's Recommendation prose._

**Response 200:**
- url: string — short-lived presigned object-storage URL *(per phase-03-videos/TD-07)*

**Error responses:**
- 404: video not found, or `status != ready` *(per phase-03-videos/TD-10)*

### Authorization Matrix

| Endpoint | Anonymous | Authenticated | Owner |
|----------|-----------|---------------|-------|
| Upload session (tus mount) | ✗ | ✓ | ✓ |
| GET /videos/:id/stream-url | _TBD¹_ | _TBD¹_ | ✓ |
| GET /videos/:id/download-url | _TBD¹_ | _TBD¹_ | ✓ |

¹ Public/unlisted video visibility is decided in Phase 04 ("Video visibility: public or unlisted", per `docs/project-plan.md`'s Phase 04 scope) — not yet resolved by any `phase-03-videos` TD. Owner access is always allowed regardless of visibility.

### Error Catalog

| errorCode | HTTP | Trigger |
|-----------|------|---------|
| UPLOAD_INVALID_FILE_TYPE | 400 | Declared upload file type fails the `onUploadCreate` allow-list check *(per phase-03-videos/TD-09; errorCode follows the inherited domain-exception envelope, `phase-02-auth/TD-07`)* |
| UPLOAD_UNAUTHENTICATED | 401 | Upload session requested without an authenticated caller *(per phase-03-videos/TD-06 Revision, 2026-09-08)* |
| UPLOAD_CONTENT_VALIDATION_FAILED | 422 | `ffprobe` authoritative check fails in `onUploadFinish` after upload completes *(per phase-03-videos/TD-09)* |

### Events/Messages

#### video.uploaded (queued for processing)

**Payload:**

```json
{ "videoId": "uuid" }
```

**Producer:** upload endpoint's `onUploadFinish` hook (per `phase-03-videos/TD-06`, `TD-09`)
**Consumer:** Video Worker — dedicated process (per `phase-03-videos/TD-03`)
**Trigger:** fires once `onUploadFinish`'s authoritative content-validation check passes (per `phase-03-videos/TD-09`); `Video.status` transitions to `processing` at the same time (per `phase-03-videos/TD-10`)
**Delivery semantics:** at-least-once, via `pg-boss` retry/backoff/dead-letter primitives (per `phase-03-videos/TD-02`). Sent with a bounded retry policy — `retryLimit: 3`, `retryBackoff: true` — instead of `pg-boss`'s low defaults, so a transient failure self-heals without a full 10GB re-upload *(per phase-03-videos/TD-10)*.

The worker consumes this job to run `fluent-ffmpeg` metadata extraction and thumbnail generation — frame captured at `min(1s, 10% of duration)` (per `phase-03-videos/TD-04` and its 2026-09-08 Revision). On success, the worker sets `Video.status = ready`. On exhausted retries, a job-completion listener sets `Video.status = error` and persists the last failure's message in `Video.processingError` (per `phase-03-videos/TD-10`).

---

<!-- phase-a-complete -->

## Dependency Map

```
SI-03.1 (root)
├── SI-03.3 — depends on SI-03.1
│   └── SI-03.4 — depends on SI-03.2, SI-03.3, SI-03.5
├── SI-03.6 — depends on SI-03.1, SI-03.2, SI-03.5
├── SI-03.7 — depends on SI-03.1, SI-03.5
└── SI-03.8 — depends on SI-03.1, SI-03.2, SI-03.4
SI-03.2 (root, independent — also feeds SI-03.4, SI-03.6, SI-03.8 above)
SI-03.5 (root, independent — also feeds SI-03.4, SI-03.6, SI-03.7 above)
```

---

## Deliverables

- [ ] SI-03.1 — Storage module (S3-compatible client)
- [ ] SI-03.2 — Background processing queue (pg-boss)
- [ ] SI-03.3 — Video processing pipeline (metadata + thumbnail)
- [ ] SI-03.4 — Video worker (dedicated process)
- [ ] SI-03.5 — Video entity: unique public identifier, ownership, and status lifecycle
- [ ] SI-03.6 — Upload endpoint (tus protocol, authentication, and validation)
- [ ] SI-03.7 — Streaming and download endpoints (presigned URLs)
- [ ] SI-03.8 — Docker Compose topology for new infrastructure

**Full test suites:**

- [ ] Backend unit tests pass (`cd nestjs-project && npm test`)
- [ ] Backend integration tests pass (`cd nestjs-project && npm run test:integration`)
- [ ] Backend E2E tests pass (`cd nestjs-project && npm run test:e2e`)
- [ ] Type/compilation checks pass (`cd nestjs-project && npx tsc --noEmit`)
- [ ] Lint passes (`cd nestjs-project && npm run lint`)
