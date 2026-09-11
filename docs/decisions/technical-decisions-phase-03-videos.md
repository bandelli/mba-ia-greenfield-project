---
scope_type: phase
related_phases: [3]
status: decided
date: 2026-09-07
scope_description: "Upload and background processing of videos for Phase 03: object storage backend, queue library and worker deployment model, resumable upload protocol for files up to 10GB, video metadata/thumbnail extraction pipeline, unique video URL strategy, streaming/download delivery mechanism, the Docker Compose topology for the new infrastructure services, upload content validation, and the video status lifecycle with processing-failure handling."
---

# Technical Decisions — Phase 03: Video Upload and Processing

_Subprojects in scope:_

- `nestjs-project/` — primary subproject. Owns the storage client, the upload endpoint(s), the background queue and its worker(s), the FFmpeg-based processing pipeline, the video entity/draft lifecycle, the unique-URL generator, and the streaming/download endpoints.
- `next-frontend/` — receives the client side of the two cross-layer contracts decided here: the upload protocol's browser-side handshake (TD-06) and how the browser eventually requests video bytes for streaming/download (TD-07). No dedicated upload or player screen is planned in this phase (project-plan.md lists no UI bullet for Phase 03 — the upload trigger UI and the player page are introduced in later phases); this document settles only the wire contracts those future screens will consume, not their UI.

> Cross-doc anchors (already decided — do NOT reopen):
> - **Strict BFF — single server-only `API_URL`:** `next-frontend-config-base/TD-03`. The browser talks only to same-origin `/api/...` routes for everything except what TD-07 below explicitly carves out as an exception for media bytes.
> - **Docker networking:** per the root `CLAUDE.md`, every new service introduced here must be reachable by its Docker Compose service name — never `localhost`. `nestjs-project/` and `next-frontend/` currently run as **separate Compose stacks** (`next-frontend-config-base/TD-03` note) with no shared network; this document does not reopen that gap, it only decides where the Phase 03 infrastructure services live (TD-08).
> - **Backend conventions:** namespaced `@nestjs/config` + Joi (`phase-01-configuracao-base`), class-validator DTOs and the custom domain exception filter (`phase-02-auth/TD-06`, `TD-07`), `@nestjs/swagger` with the CLI plugin and an exported `openapi.json` artifact (`technical-decisions-openapi-docs-nestjs`). New Phase 03 endpoints/DTOs follow these unchanged.

---

## TD-01: Object Storage Backend & Client Library

**Scope:** Backend

**Capability:** File storage service (videos and thumbnails)

**Context:** The architecture diagram (`docs/diagrams/software-arch.mermaid`) names an "Object Storage (S3/MinIO)" container: MinIO in local/dev, S3-compatible storage in production. No storage client exists yet in `nestjs-project/`. The choice of client library shapes every later TD in this document — presigned URLs (TD-06, TD-07), the worker's read/write path (TD-03, TD-04), and the Compose service added in TD-08.

**Options:**

### Option A: `@aws-sdk/client-s3` (+ `@aws-sdk/s3-request-presigner`, `@aws-sdk/lib-storage`)
- Official AWS SDK v3, modular, TypeScript-first. Talks to any S3-compatible endpoint via `endpoint` override and `forcePathStyle: true` — the same client code runs against MinIO in dev and real AWS S3 (or MinIO again) in prod, changing only config values.
- **Pros:** Industry-standard signing (SigV4) reused by `@tus/s3-store` (TD-06) with zero extra glue. `getSignedUrl()` + `GetObjectCommand`/`PutObjectCommand` cover every presigned-URL need (TD-06, TD-07) from one dependency. No vendor lock-in to MinIO's own SDK — a future migration to real AWS S3 changes only `endpoint`/`credentials`.
- **Cons:** Larger dependency surface (modular but many sub-packages: `client-s3`, `s3-request-presigner`, `lib-storage`). AWS-flavored API (commands + client) has a small learning curve versus a bucket-oriented SDK.

### Option B: `minio` (official MinIO JS SDK)
- Purpose-built for MinIO, also speaks the S3 API against real AWS S3. Simpler bucket-oriented API (`putObject`, `presignedGetObject`).
- **Pros:** Slightly simpler API for basic get/put/presign operations. First-party MinIO examples and defaults (e.g., path-style is the default, no `forcePathStyle` flag to remember).
- **Cons:** Not the client `@tus/s3-store` (TD-06) is built against — using this SDK for regular storage access while `@tus/s3-store` still pulls in `@aws-sdk/client-s3` transitively means **two S3 clients in the dependency tree** with separate credential/config plumbing. Smaller ecosystem outside the MinIO/S3 world; less battle-tested SigV4 edge-case coverage than the AWS SDK.

### Option C: Hand-rolled HTTP client against the S3 REST API
- Sign and send raw HTTP requests to the S3-compatible endpoint without an SDK.
- **Pros:** Zero dependency.
- **Cons:** Re-implements SigV4 signing, multipart upload semantics, and presigned-URL generation — a solved, security-sensitive problem. No synergy with `@tus/s3-store` (TD-06), which requires an actual `S3Client` instance. Pure reinvention with no upside.

**Recommendation:** **Option A (`@aws-sdk/client-s3`)** — it is the dependency `@tus/s3-store` (TD-06's recommended option) already requires, so choosing it avoids a second S3 client in the tree. `endpoint` + `forcePathStyle` make the same code path work against MinIO (dev) and S3-compatible storage (prod) without branching, and `@aws-sdk/s3-request-presigner` directly serves TD-07's presigned-URL delivery mechanism.

**Decision:** A (`@aws-sdk/client-s3`)
**Libraries:** @aws-sdk/client-s3

---

## TD-02: Background Job Queue Library

**Scope:** Backend

**Capability:** Background processing service (queues)

**Context:** Video processing (TD-04) must run outside the HTTP request/response cycle. `nestjs-project/`'s current infrastructure is PostgreSQL + Mailpit only (`nestjs-project/compose.yaml`) — no Redis. The choice of queue library determines whether a new infrastructure dependency (Redis) is introduced or the existing PostgreSQL is reused.

**Options:**

### Option A: BullMQ (`bullmq` + `@nestjs/bullmq`)
- Redis-backed queue. Official NestJS integration: `BullModule.forRoot({ connection })`, `@InjectQueue()` to enqueue, `@Processor()` + `WorkerHost` to consume. Rich feature set: priorities, rate limiting, `job.updateProgress()`, `Bull Board` UI for inspection.
- **Pros:** The most mature Node.js queue, first-class NestJS module, largest community and documentation surface. `Bull Board` gives a ready-made dashboard for watching processing jobs during development — useful for a video pipeline with a visible progress dimension. Redis's sub-millisecond ops keep queue overhead negligible even under many concurrent uploads.
- **Cons:** **Introduces Redis as new infrastructure** — a new Compose service (TD-08), a new failure mode to operate, and a new env-var surface (`REDIS_HOST`/`REDIS_PORT`) beyond what Phase 01–02 established. Redis is memory-resident — job data (video IDs, paths) must stay small; large payloads should live in Postgres/S3, not the job body (not a real constraint here, but worth noting for DTO discipline).

### Option B: pg-boss
- Job queue implemented entirely on top of PostgreSQL (`SKIP LOCKED`-based polling). `boss.createQueue()`, `boss.send()` to enqueue, `boss.work()` to consume. Supports retry limits, exponential backoff, dead-letter queues, and delayed jobs — the same primitives BullMQ offers, without Redis.
- **Pros:** **Zero new infrastructure** — reuses the PostgreSQL instance already in `nestjs-project/compose.yaml` (`phase-01-configuracao-base`). One fewer service to run, monitor, and back up. Retry/backoff/dead-letter feature parity with BullMQ is sufficient for a single-worker video pipeline. Transactionally consistent with the rest of the app's data (job state and video-row state can be updated in the same Postgres instance).
- **Cons:** Polling-based dispatch has slightly higher latency than Redis pub/sub (bounded by `pg-boss`'s poll interval, tunable to sub-second) — irrelevant here since video processing itself takes seconds-to-minutes, dwarfing any queue-dispatch delay. No official NestJS wrapper (community wrappers like `pg-bossman` exist, but a thin custom `PgBossModule` provider is a small, well-understood alternative). Smaller community than BullMQ; less tooling (no equivalent to Bull Board).

### Option C: Custom Postgres table + `@nestjs/schedule` polling cron
- A `video_processing_jobs` table with a status column; a `@Cron()` job polls for `pending` rows and dispatches processing.
- **Pros:** No new dependency beyond `@nestjs/schedule` (trivial).
- **Cons:** Reimplements what pg-boss already provides correctly (locking to avoid double-processing, retry/backoff, dead-lettering) — a known hard problem (race conditions between concurrent poll ticks) with no upside over adopting pg-boss directly. Rejected: purely a worse Option B.

**Recommendation:** **Option B (pg-boss)** — the project's infrastructure footprint today is exactly PostgreSQL + an email service; introducing Redis (Option A) is justified when queue throughput or sub-second dispatch latency actually matters, and neither applies to a single-user-triggered, minutes-long video-processing job. pg-boss delivers the same retry/backoff/dead-letter primitives on infrastructure already operated and backed up. If future phases need Redis for an unrelated reason (e.g., rate-limit storage at scale, real-time pub/sub for Phase 06), BullMQ becomes free to reconsider — the two options are not mutually exclusive forever, just for this phase's actual load.

**Decision:** B (pg-boss)
**Libraries:** pg-boss

---

## TD-03: Video Worker Deployment Model

**Scope:** Backend

**Capability:** Transversal — covers: "Background processing service (queues)", "Automatic video processing after upload (duration and metadata extraction)"

**Context:** The architecture diagram depicts "Video Worker (FFmpeg)" as a container distinct from the API. FFmpeg processing is CPU-bound and can run for minutes on large files; the question is whether that work executes inside the same Node.js process that serves HTTP traffic, or in a dedicated process/container. This decision depends on TD-02 (both BullMQ and pg-boss support a `.work()`/`@Processor()` handler running in any Node process, in or out of the HTTP app).

**Options:**

### Option A: Dedicated worker process — second entrypoint in the same `nestjs-project` codebase
- A `src/worker/main.ts` boots a minimal Nest application context (`NestFactory.createApplicationContext()`) containing only the queue consumer + processing modules — no HTTP server, no controllers. A second Docker Compose service (`video-worker`, TD-08) runs `node dist/worker/main.js` from the same image/build as `nestjs-api`.
- **Pros:** Matches the architecture diagram's separate "Video Worker" container exactly. FFmpeg's CPU/memory usage cannot starve the API's event loop or its HTTP connection pool — a large backlog of processing jobs never degrades login/browsing latency. Independently scalable (more worker replicas without touching the API). Single codebase, single `package.json`, single build artifact — no new subproject, no duplicated dependency management.
- **Cons:** A second Compose service to define, build, and keep healthy (TD-08). Two running Node processes to watch logs for during local development instead of one.

### Option B: In-process worker inside the existing `nestjs-api` application
- The same Nest app that serves HTTP also registers the queue processor (`@Processor()`/`boss.work()`) as just another provider.
- **Pros:** Simplest possible topology — one process, one Compose service, no new entrypoint or Dockerfile target. Fastest to stand up.
- **Cons:** **Diverges from the architecture diagram's explicit "Video Worker" container** without a documented reason to. FFmpeg is spawned as a child process either way (so the Node event loop itself isn't blocked by the transcode), but the worker and the API still compete for the same container's CPU/memory quota and the same restart/deploy lifecycle — a runaway or crashing processing job can take the API down with it. Cannot scale processing capacity independently of API capacity.

### Option C: Fully separate subproject (own `package.json`, own repo directory, e.g. `video-worker/`)
- A new top-level subproject, independently versioned and deployed, sharing no code with `nestjs-project/` (duplicating entity/DTO definitions or publishing an internal package for them).
- **Pros:** Maximum isolation; a team could own it independently.
- **Cons:** For a single-developer/small-team greenfield project, this duplicates `package.json`, TypeORM entity definitions (or forces an internal shared package — infrastructure this project has no other use for yet), CI config, and Dockerfile maintenance for no benefit Option A doesn't already deliver via a second entrypoint in the same codebase. Overkill relative to the actual isolation need (process-level, not codebase-level).

**Recommendation:** **Option A (dedicated worker process, same codebase)** — delivers the process isolation the architecture diagram calls for (API availability is never at the mercy of a stuck FFmpeg job) without paying Option C's cost of a second codebase. The only new cost over Option B is one additional Compose service and Dockerfile target, which TD-08 accounts for.

**Decision:** A (Dedicated worker process, same codebase)

---

## TD-04: Video Processing Pipeline (Metadata & Thumbnail Extraction)

**Scope:** Backend

**Capability:** Transversal — covers: "Automatic video processing after upload (duration and metadata extraction)", "Automatic thumbnail generation from a video frame"

**Context:** After upload completes, the worker (TD-03) must extract video duration/metadata and generate a thumbnail from a frame. No transcoding to alternate resolutions/formats is in scope for this phase (project-plan.md does not mention adaptive bitrate or multi-quality playback) — the job is limited to reading metadata and producing one thumbnail image.

**Options:**

### Option A: `fluent-ffmpeg`
- Node wrapper around the `ffmpeg`/`ffprobe` CLI binaries. `ffmpeg.ffprobe(path, cb)` returns structured JSON (duration, codec, resolution, bitrate) from `format`/`streams`; `.screenshots({ timestamps, folder, size })` extracts one or more frames as image files.
- **Pros:** Purpose-built for exactly these two operations — one call for metadata, one for thumbnails, both documented and widely used in Node video pipelines. Sits directly on top of the `ffmpeg`/`ffprobe` binaries the "Video Worker (FFmpeg)" container already needs to have installed. Errors and progress are surfaced via familiar Node event/callback patterns, easy to wrap in `async/await` for the queue handler (TD-02/TD-03).
- **Cons:** Requires `ffmpeg` and `ffprobe` binaries present in the worker's Docker image (a `Dockerfile` concern, not a TD — standard `apt-get install ffmpeg` or a base image that bundles it). Callback-based API needs a thin promisified wrapper for clean `async/await` use.

### Option B: Direct `child_process.spawn('ffmpeg', [...])` / `spawn('ffprobe', [...])`
- Shell out to the binaries directly, parsing `ffprobe -print_format json` stdout manually.
- **Pros:** Zero dependency, full control over the exact CLI flags passed.
- **Cons:** Reimplements what `fluent-ffmpeg` already provides — argument building, stdout buffering/parsing, error-code interpretation, and process cleanup on failure. No meaningful capability gain for this project's narrow use case (metadata + one thumbnail), only more code to maintain and test.

### Option C: Cloud-managed transcoding service (e.g., AWS MediaConvert, Mux, Coconut)
- Upload triggers a managed API that returns metadata and generated assets (thumbnails, and optionally multi-quality renditions) without running FFmpeg in-house.
- **Pros:** No FFmpeg binary or worker container to operate; offloads scaling/reliability to the vendor; opens the door to future adaptive-bitrate transcoding with no re-architecture.
- **Cons:** **Contradicts the architecture diagram's self-hosted "Video Worker (FFmpeg)" container** and introduces a paid external dependency and vendor lock-in for a capability (metadata + single thumbnail) that a self-hosted `ffmpeg` container handles trivially. Adds API-key management, network dependency, and cost with no requirement in project-plan.md (no adaptive bitrate, no DRM) that would justify it. Reconsider only if a later phase adds multi-quality streaming as an explicit requirement.

**Recommendation:** **Option A (`fluent-ffmpeg`)** — directly matches the architecture diagram's self-hosted FFmpeg worker, covers both required operations (metadata via `ffprobe`, thumbnail via `screenshots()`) with a mature, well-documented API, and avoids both Option B's needless reimplementation and Option C's unwarranted vendor dependency for a scope this narrow.

**Decision:** A (`fluent-ffmpeg`)
**Libraries:** fluent-ffmpeg

**Revisions:**
- 2026-09-08 — Fixes the frame-selection rule for the automatic thumbnail: captures at the smaller of 1 second and 10% of the video's total duration (`min(1s, 10% of duration)`), passed as `timestamps` to `.screenshots()`. Rationale: min(1s, 10% of duration) — avoids black opening/fade-in frames in both short and long videos, without requiring a second scene-detection pass.

---

## TD-05: Unique Video URL / Public Identifier Strategy

**Scope:** Backend

**Capability:** Unique URL per video, with no conflicts with other videos

**Context:** Each video needs a public, collision-free identifier for its watch URL (e.g., `/watch/<id>`). The TypeORM primary key alone is a reasonable candidate only if its format is also fit to be public (opaque, non-enumerable, URL-safe); if not, a separate public-facing identifier is needed.

**Options:**

### Option A: `nanoid` short opaque ID as a dedicated public column
- Generate a URL-safe random ID (e.g., 11 characters, `nanoid()`'s default alphabet) at video-draft creation time, stored in a unique-indexed column separate from the internal primary key.
- **Pros:** Short, URL-friendly (`/watch/V1StGXR8_Z5`), non-sequential and non-enumerable — matches "with no conflicts" while also not leaking video count or creation order to visitors (a mild but real product/security property for unlisted videos, `phase-04`'s visibility feature). Collision probability at this project's realistic scale is effectively zero (nanoid's default settings need ~139 years at 1000 IDs/second for a 1% collision chance). Decoupled from the internal primary key, so the DB's PK strategy (UUID, serial, etc.) stays a separate, unconstrained concern.
- **Cons:** One new small dependency (`nanoid`). One extra unique-indexed column plus (in the vanishingly unlikely case of a collision) a retry-on-insert-conflict loop — cheap to implement, worth stating explicitly rather than assuming DB uniqueness is free.

### Option B: UUID v4 as the primary key, reused as the public identifier
- TypeORM entity's `@PrimaryGeneratedColumn('uuid')` value is used directly in the public URL.
- **Pros:** Zero extra column or dependency — the PK already is the public ID. UUID collision probability is negligible.
- **Cons:** UUIDs are 36 characters — noticeably longer and less shareable/readable URLs (`/watch/550e8400-e29b-41d4-a716-446655440000`) than a short opaque slug. Couples the DB's internal PK format to a public-facing concern; changing the PK strategy later (e.g., to a sequential/sortable ID for internal query performance) becomes a breaking URL change.

### Option C: Sequential auto-increment integer exposed directly
- `@PrimaryGeneratedColumn()` (serial integer) used as-is in the URL (`/watch/482`).
- **Pros:** Simplest possible implementation, no extra column or dependency.
- **Cons:** **Enumerable** — a client can guess `/watch/483`, `/watch/484`, trivially scraping every video including `unlisted` ones (`phase-04`'s visibility feature explicitly relies on unlisted URLs being unguessable). Leaks total video count and upload order. Disqualified outright by the "unlisted" requirement two phases ahead — listed only to rule out.

**Recommendation:** **Option A (`nanoid` short opaque public ID)** — the shortest URLs among the non-enumerable options, decoupled from whatever internal PK strategy the `Video` entity ends up using, and the only option that cleanly satisfies both "no conflicts" now and "unlisted, access only via link" in `phase-04` without revisiting this decision.

**Decision:** A (`nanoid` short opaque public ID)
**Libraries:** nanoid

---

## TD-06: Upload Protocol for Files up to 10GB

**Scope:** Cross-layer

**Capability:** Transversal — covers: "Video upload supporting files up to 10GB without performance impact", "Automatic pre-registration of the video as a draft when the upload starts"

**Context:** `docs/project-plan.md` § "Points of Attention" is explicit: uploads up to 10GB must not block the system and must be resumable after a connection failure. Routing a 10GB `multipart/form-data` body through the NestJS API's own memory/disk (the default `@nestjs/platform-express` + Multer path) is precisely what "without performance impact" warns against. This decision is Cross-layer: the handshake (how the upload starts, how progress/resume works) is executed by client code in `next-frontend/` against an endpoint surface in `nestjs-project/`, and both sides must agree on the same protocol. It also settles **when** the video draft row is created (the phase's "automatic pre-registration... when the upload starts" bullet): whichever option is chosen, draft creation is wired into that protocol's "upload started" hook, not a separate mechanism.

**Options:**

### Option A: tus resumable-upload protocol (`@tus/server` + `@tus/s3-store` backend; `tus-js-client` or Uppy on the client)
- `@tus/server` implements the open tus 1.0 HTTP protocol (chunked `PATCH` requests with an `Upload-Offset`) and mounts as Express middleware inside `nestjs-api` (Nest's default HTTP adapter). `@tus/s3-store` streams each chunk straight to S3-compatible storage via multipart upload — the chunk never fully lands on the API's disk. The server's `onUploadCreate` hook fires when a client opens an upload session (before any bytes arrive) — the draft `Video` row is created there, using metadata the client sends in the `Upload-Metadata` header (title placeholder, owning channel). On the client, `tus-js-client` (or Uppy, which wraps it) tracks a resumable upload URL in `localStorage` and automatically resumes from the last acknowledged offset after a dropped connection — no custom retry logic to write.
- **Pros:** **Resumability is protocol-native**, not something either side re-implements — directly satisfies the "resume after a connection failure" attention point. Chunks stream to S3 without buffering the whole file in the API process — the API's memory footprint stays flat regardless of file size. `onUploadCreate` is the exact mechanism that answers "automatic pre-registration... when the upload starts": the draft is created the moment the client opens the upload session, before the first byte of video data arrives. Works identically for a 10MB and a 10GB file — no separate code path.
- **Cons:** New protocol for both sides to learn (tus is not REST-conventional — it is a set of custom HTTP methods/headers). `@tus/server` is Express middleware, mounted alongside (not through) Nest's normal controller/DTO/pipe pipeline — request validation for this one route follows tus's own hook system (`onUploadCreate`, `onUploadFinish`) instead of `class-validator` DTOs, a deliberate deviation documented here so it isn't mistaken for an oversight later.

### Option B: Presigned multipart upload — backend issues S3 multipart part-URLs, client (`@aws-sdk/lib-storage`-equivalent logic) uploads chunks directly to storage
- The API exposes REST endpoints (`POST /videos/uploads` to start, returning a set of presigned `UploadPart` URLs; `POST /videos/uploads/:id/complete` to finalize) built with ordinary NestJS controllers/DTOs. The browser splits the file into parts itself and `PUT`s each part directly to the presigned URL, tracking progress and, on failure, only needing to retry the failed parts it already knows about (since it holds the multipart upload ID and part ETags in memory or `localStorage`).
- **Pros:** Stays inside NestJS's normal controller/DTO/validation pipeline — no separate middleware mount, consistent with every other endpoint in the codebase. Chunks go straight to storage, same memory-footprint benefit as Option A. Full control over the exact API shape.
- **Cons:** **Resumability is hand-built, not protocol-provided** — the client must itself persist "which parts succeeded" across a page reload/crash and the backend must expose a way to list already-uploaded parts (S3's `ListParts`) to reconcile after a resume; tus already ships this exact reconciliation logic, tested against real-world network failures. "Pre-registration when the upload starts" has no natural hook — it has to be wired manually into the "start multipart upload" endpoint, duplicating logic tus gets for free. More custom code overall for an equivalent (not better) outcome.

### Option C: Traditional `multipart/form-data` POST through the NestJS API (Multer, disk storage) — then forward to storage
- `FileInterceptor` + `MulterModule.register({ dest: ... })` (`nestjs-project/CLAUDE.md`'s only currently-documented file-upload primitive) receives the whole file on a single POST, writes it to the API container's disk, then a separate step uploads it to S3.
- **Pros:** Zero new dependency — uses NestJS's built-in, already-documented upload mechanism. Simplest to wire for small files.
- **Cons:** **Directly contradicts "sem impacto na performance"** — the entire file (up to 10GB) passes through the API container's disk and its Express request-handling path before storage even sees a byte, doubling network and disk I/O and holding an HTTP connection open for the whole transfer. **No resumability** — Multer has no concept of resuming a partial `multipart/form-data` body; a dropped connection at 9GB means starting over. Disqualified by the phase's own stated non-functional requirement; listed only to name why it does not compete.

**Recommendation:** **Option A (tus protocol via `@tus/server` + `@tus/s3-store`)** — it is the only option where resumability (an explicit project-plan.md requirement) is a property of the protocol rather than custom code the team must get right for every edge case (partial chunk, expired session, concurrent resume). It also gives the "automatic pre-registration when the upload starts" bullet a precise, well-documented implementation point (`onUploadCreate`) instead of an ad-hoc endpoint. The cost — a non-REST protocol mounted as middleware — is confined to a single upload route; every other endpoint in the API is unaffected.

**Decision:** A (tus protocol — `@tus/server` + `@tus/s3-store`)
**Libraries:** @tus/server, @tus/s3-store

**Revisions:**
- 2026-09-08 — Fixes the ownership model of the draft created in `onUploadCreate`: the upload endpoint requires an authenticated user (reusing the JWT guard from `phase-02-auth`), and the hook records `userId`/`channelId` on the draft `Video` at the same moment it is created — before any byte of the file is transferred. Rationale: authenticated, immediate ownership — avoids orphan drafts and keeps the "automatic pre-registration" already owning the video from the first request, without depending on a later assignment step in Phase 04.

---

## TD-07: Media Delivery Mechanism for Streaming & Download

**Scope:** Cross-layer

**Capability:** Transversal — covers: "Streaming playback (without needing a full download)", "Video download by the user"

**Context:** Once a video is processed and stored (TD-01), the browser must be able to (a) play it progressively via HTTP range requests and (b) download it. `next-frontend/CLAUDE.md` already flags this exact gap: "Media streaming will eventually come from Object Storage (S3/MinIO) — TBD," and today's strict-BFF model (`next-frontend-config-base/TD-03`) has the browser talk only to same-origin `/api/...` routes. Routing multi-gigabyte video bytes through the Next.js BFF (and, if proxied further, through the NestJS API) on every playback is the "impact performance" failure mode this phase's upload requirement explicitly warns against, applied now to the read path. This decision is Cross-layer because it determines whether the strict-BFF model needs a deliberate, scoped exception for media bytes specifically — a decision neither subproject can make alone.

**Options:**

### Option A: Presigned/direct object-storage URLs (BFF/API issue the URL; the browser fetches bytes straight from storage)
- The NestJS API exposes `GET /videos/:id/stream-url` and `GET /videos/:id/download-url`, returning a short-lived presigned S3 URL (`@aws-sdk/s3-request-presigner`, already in the dependency tree per TD-01/TD-06). The Next.js Route Handler under `app/api/videos/[id]/stream-url` (consistent with the existing BFF pattern) proxies that one small JSON response — never the video bytes — to the browser. The `<video>` element's `src` (or a plain download link) then points directly at the storage URL; the browser's own HTTP client issues Range requests straight to S3/MinIO, which natively supports byte-range responses.
- **Pros:** Video bytes never touch the Next.js or NestJS process — both stay free to serve everything else regardless of concurrent playback/download volume. Range-request support is native to S3-compatible storage; no custom Range-header handling to write or test. The BFF exception is narrow and explicit: only the *URL-issuing* endpoint goes through the BFF; the strict "browser never talks to the backend directly" rule for everything else is untouched, and the backend URL itself still never reaches the browser (only a storage URL does).
- **Cons:** Requires the object storage endpoint (MinIO in dev, TD-08) to be reachable from the browser, not just from the backend containers — a CORS configuration on the bucket/MinIO instance and a routable host (in dev, likely a separate exposed port; already true for `db`/`mailpit` in `nestjs-project/compose.yaml`). Presigned URLs are time-limited, so a very long viewing session may need URL refresh logic (a small, well-understood detail, not a fundamental blocker).

### Option B: Backend/BFF proxy streaming (NestJS `StreamableFile` piping the S3 object; Next.js Route Handler forwarding it)
- `GET /videos/:id/stream` on the NestJS API calls `GetObjectCommand`, forwards the incoming `Range` header to S3, and pipes the resulting body into a `StreamableFile` (NestJS's documented mechanism for streaming responses, Range-aware if the handler reads and forwards the header manually). The Next.js Route Handler in turn pipes that response through to the browser, keeping the browser inside the same-origin BFF surface for media too.
- **Pros:** No new CORS or public-storage-exposure concern — the browser only ever talks to same-origin `/api/...`, fully consistent with the strict-BFF model as originally written, no documented exception needed.
- **Cons:** **Every byte of every playback/download passes through both the NestJS API and the Next.js BFF process** — for a video platform, this is the exact bandwidth/connection-pool cost the phase's "without performance impact" concern was written for, now applied to reads instead of writes. Range-header forwarding and partial-content (`206`) handling must be implemented and tested by hand at two hops (API → S3, BFF → API) instead of relying on storage's native support. Scaling playback capacity means scaling the API/BFF tier, not just storage — the opposite of what object storage is for.

### Option C: CDN-fronted object storage (e.g., CloudFront, or MinIO behind an Nginx/Caddy edge with caching)
- A CDN sits in front of the storage bucket; the browser fetches video bytes from CDN edge URLs, with the API issuing a signed CDN URL rather than a raw storage presigned URL.
- **Pros:** Best possible latency/throughput at real production scale; offloads Range-request handling and caching to purpose-built edge infrastructure.
- **Cons:** Introduces a CDN as new infrastructure this greenfield project has no other need for yet — a genuinely separate, larger decision (which CDN, cache invalidation strategy, signed-URL/cookie scheme) that this phase's scope does not require to satisfy "streaming playback" for an MVP. Reconsider explicitly if/when Phase 07's "production environment" work identifies real latency or egress-cost pressure; premature here.

**Recommendation:** **Option A (presigned/direct object-storage URLs)** — it is the only option that keeps video bytes off the API and BFF processes entirely, which is what "without performance impact" demands once applied symmetrically to playback and download, not just upload. The CORS/exposure cost is small and well-understood (the same shape of problem TD-06 already accepts for tus's direct-to-storage chunk uploads); Option C solves a scaling problem this phase does not yet have.

**Decision:** A (Presigned/direct object-storage URLs)
**Libraries:** @aws-sdk/s3-request-presigner

---

## TD-08: Docker Compose Topology for New Infrastructure Services

**Scope:** Repo-wide

**Capability:** Transversal — covers: "File storage service (videos and thumbnails)", "Background processing service (queues)"

**Context:** This phase introduces at least one new infrastructure service (object storage — MinIO in dev, TD-01) and, depending on TD-02's outcome, possibly a second (Redis, if BullMQ is chosen over pg-boss), plus a second application service (the video worker, TD-03). `nestjs-project/compose.yaml` today defines `nestjs-api`, `db`, and `mailpit`; `next-frontend/compose.yaml` is a fully separate stack (`next-frontend-config-base/TD-03` note). This decision is where the new services are declared and how they're networked to the existing `nestjs-api`/worker services — it does not reopen the separate-FE-stack question, which TD-07's Option A deliberately routes around via a browser-reachable storage endpoint rather than requiring a shared FE/BE network.

**Options:**

### Option A: Extend `nestjs-project/compose.yaml` with the new services
- Add `minio` (and `redis`, if TD-02 chooses BullMQ) and `video-worker` as additional services in the existing `nestjs-project/compose.yaml`, on the same default Compose network as `nestjs-api` and `db`. Per the root `CLAUDE.md`'s Docker Networking rule, `nestjs-api` and `video-worker` address storage/queue by service name (`http://minio:9000`, not `localhost`).
- **Pros:** Consistent with the current one-compose-file-per-subproject convention (`next-frontend/` already has its own, separate `compose.yaml`). No new top-level compose file to introduce or document. All Phase 03 infrastructure is backend-only in nature (storage, queue, worker) — it belongs where the backend's other infrastructure (`db`, `mailpit`) already lives.
- **Cons:** `nestjs-project/compose.yaml` grows to 5-6 services — still well within normal Compose file size, but worth a `## Services` note in `nestjs-project/CLAUDE.md` (a `/plan-build`-time doc update, not a research-side concern).

### Option B: New root-level `compose.yaml` orchestrating both subprojects plus shared infrastructure
- Introduce `compose.yaml` at the repository root, using Compose `include:` to pull in both subprojects' existing files, with MinIO/Redis/worker declared at the root level on a shared network reachable by both `nestjs-project/` and (eventually) `next-frontend/`.
- **Pros:** Would also incidentally solve the long-deferred FE↔BE shared-network gap (`next-frontend-config-base/TD-03`'s "out-of-scope ancillary note").
- **Cons:** **Solves a problem this phase does not need solved.** TD-07's Option A already routes the one case that could have motivated FE/BE network unification (the browser reaching storage) around it via a browser-reachable storage endpoint, not a backend-network hop. Restructuring both subprojects' Compose topology is a materially larger, riskier change than this phase's scope calls for, and conflates two independent concerns (Phase 03 infra vs. the FE/BE networking gap) into one PR.

### Option C: Separate `infra/compose.yaml` for shared services only
- A third compose file, outside both subprojects, declaring only `minio`/`redis`, referenced by `nestjs-project/compose.yaml` via an external network.
- **Pros:** Keeps "shared infra" conceptually distinct from "backend app services."
- **Cons:** For a project with exactly one consumer of this infrastructure (`nestjs-project/`, since TD-07 keeps the browser talking to storage directly rather than through a backend network hop), the "shared" framing is speculative — there is no second consumer today. Adds a third compose file and an external-network wiring step for no present benefit over Option A; reconsider if `next-frontend/` ever needs direct backend-network access.

**Recommendation:** **Option A (extend `nestjs-project/compose.yaml`)** — every new service this phase introduces (storage, optional queue backend, worker) is consumed exclusively by `nestjs-project/`; TD-07 deliberately avoids creating a case where `next-frontend/` needs network-level access to this infrastructure. Extending the existing backend compose file is the smallest change consistent with the current one-file-per-subproject convention. Options B and C both solve a shared-infrastructure problem that does not exist yet in this phase's scope.

**Decision:** A (Extend `nestjs-project/compose.yaml`)

---

## TD-09: Upload Content Validation & Failure Cleanup Strategy

**Scope:** Backend

**Capability:** Transversal — covers: "Video upload supporting files up to 10GB without performance impact", "Automatic video processing after upload (duration and metadata extraction)"

**Context:** TD-06's tus endpoint accepts an arbitrary byte stream up to 10GB; nothing so far decides what happens when that stream is not actually a video (wrong file selected by the user, a renamed non-video file, or a corrupted upload). Without an explicit strategy, an invalid upload either silently breaks TD-04's `ffprobe`/thumbnail step later in the pipeline, or consumes a full 10GB of bandwidth and object-storage space before anyone notices. This decision settles **when** content is validated and **what is cleaned up** on rejection; it deliberately does not touch the `Video` entity's schema or its draft→published state machine (`phase-04`'s concern, per this document's Notes section) — rejection here happens before a video is ever handed to that later lifecycle.

**Options:**

### Option A: Authoritative-only — `ffprobe` check in `onUploadFinish` (post-upload, before completion is acknowledged)
- `@tus/server`'s `onUploadFinish` hook (fired after the last `PATCH` request completes, before the client receives the "upload complete" response) runs `ffprobe` against the stored object. If `ffprobe` fails or reports no video stream, the hook throws a tus error (`{ status_code: 422, body: '...' }`) and calls `store.remove(upload.id)` to delete the object from S3 — the same reject-and-delete pattern `@tus/server`'s own documented virus-scan example uses for `onUploadFinish`. No pre-upload check runs.
- **Pros:** Single validation point, reusing TD-04's `fluent-ffmpeg` dependency with zero new library. Trusts nothing client-supplied — only the actual bytes decide the outcome. The client gets a synchronous, request-scoped failure tied to that exact upload attempt, not a deferred/asynchronous "processing failed" state to poll for.
- **Cons:** A file that is obviously wrong (e.g., a 3GB PDF) still pays the full upload bandwidth and storage-put cost before the rejection fires — this option does nothing for the common "wrong file selected" case, which is exactly the failure mode `10GB without performance impact` cares about avoiding.

### Option B: Declared-metadata pre-check only — `onUploadCreate` (before any bytes transfer)
- `onUploadCreate` (TD-06's existing hook, also where the draft `Video` row is created) additionally inspects the client-supplied `Upload-Metadata` (e.g., a `filetype`/`filename` key the tus client sets) against an allow-list of video MIME types/extensions, throwing a `{ status_code: 400, ... }` tus error immediately if it doesn't match — before the draft row is created and before any chunk transfers.
- **Pros:** Instant rejection for the common case, zero wasted bandwidth or storage. Trivial to implement — a string comparison inside a hook that already runs.
- **Cons:** Client-declared metadata is fully spoofable (renaming any file to end in `.mp4`, or setting an arbitrary declared type, defeats it outright) — it is a UX nicety for accidental wrong-file selection, not a content-validation guarantee. Used alone, a spoofed or corrupted file still reaches TD-04's processing step undetected.

### Option C: Hybrid — declared-metadata fast-reject in `onUploadCreate` + authoritative `ffprobe` check in `onUploadFinish`
- Combine both: `onUploadCreate` runs Option B's cheap allow-list check first and only creates the draft `Video` row if it passes; `onUploadFinish` then runs Option A's `ffprobe` check as the authoritative gate once the file is fully uploaded, deleting the S3 object (`store.remove(upload.id)`) **and** the draft `Video` row created in `onUploadCreate` if `ffprobe` rejects it.
- **Pros:** The fast-reject layer covers the common, bandwidth-wasting case Option A alone misses; the authoritative layer covers what the fast-reject layer can never guarantee (spoofed/corrupted content), so neither layer is trusted beyond what it can actually verify. Both hooks are already touched by TD-06 (`onUploadCreate`) and TD-04 (`ffprobe`) — no net-new dependency or endpoint.
- **Cons:** Two validation points to implement and test instead of one. The `onUploadCreate` check must never be treated as sufficient by itself — only as an optimization — which has to be documented clearly enough that a future change doesn't accidentally rely on it alone.

**Recommendation:** **Option C (hybrid: `onUploadCreate` fast-reject + `onUploadFinish` authoritative check)** — it is the only option that avoids wasting upload bandwidth on obviously-wrong files (Option A's gap) while never trusting spoofable client-declared metadata as the sole guard (Option B's gap). Both checkpoints reuse hooks and dependencies TD-06 and TD-04 already require, and `@tus/server`'s own documentation demonstrates exactly this reject-and-`store.remove()` pattern in `onUploadFinish` for a structurally identical case (rejecting a completed upload after inspecting its actual content).

**Decision:** C (Hybrid: `onUploadCreate` fast-reject + `onUploadFinish` authoritative check)

---

## TD-10: Video Status Lifecycle & Processing Failure Handling

**Scope:** Backend

**Capability:** Transversal — covers: "Automatic pre-registration of the video as a draft when the upload starts", "Automatic video processing after upload (duration and metadata extraction)"

**Context:** `docs/project-plan.md`'s persistence expectation for the `Video` entity names a status column explicitly ("status: draft → processing → ready/error"), and this is distinct from what TD-09 already decides. TD-09's `onUploadFinish` `ffprobe` check is a **pre-acceptance gate**: if it fails, the draft row and the S3 object are both deleted — no `Video` row survives to need a status at all. This TD covers what happens **after** a video passes that gate and enters TD-03's async worker for TD-04's actual metadata/thumbnail extraction: a `Video` row now exists, is user-visible in principle, and the extraction step itself can still fail for reasons `onUploadFinish`'s synchronous check cannot catch (a codec `ffprobe` accepts but `.screenshots()` cannot frame-decode, a transient failure downloading the object from storage into the worker's temp file, a worker crash/OOM mid-job). Nothing decided so far says whether such a failure is retried, nor what state the video is left in. This is also where the row's lifecycle states are named end-to-end, since no other TD in this document defines them (the "Notes for downstream pipeline" section previously deferred the entire `Video` schema, including status, to a future phase — this TD narrows that deferral to only the draft→published *visibility* toggle, which genuinely is `phase-04`'s concern per project-plan.md's Phase 04 scope).

**Options:**

### Option A: Bounded automatic retry via pg-boss + persisted `error` terminal state
- `Video.status` is a TypeORM enum column with exactly the four values the assignment names: `draft` (set at `onUploadCreate`, per TD-06) → `processing` (set when `onUploadFinish` enqueues the pg-boss job, per TD-03/TD-04) → `ready` (set by the worker on successful metadata+thumbnail extraction) | `error` (terminal). The pg-boss job (TD-02) is sent with a small bounded retry policy (e.g. `retryLimit: 3`, `retryBackoff: true` — pg-boss's own exponential-backoff-with-jitter option) instead of relying on the library's low defaults (`retryLimit: 2`, `retryBackoff: false`). Only once pg-boss has exhausted all attempts does a completion listener flip `Video.status` to `error` and persist the last failure's message in a `processingError` column; a transient failure that succeeds on retry never surfaces as an error at all.
- **Pros:** Distinguishes transient faults (a momentary storage hiccup, a worker restart mid-job) from genuinely broken input (a codec `ffprobe`'s liberal container check accepted but the frame extractor cannot handle) — the former self-heals via retry, the latter reaches a real, user-facing terminal state. Uses `pg-boss`'s built-in retry/backoff (already a TD-02 dependency) instead of hand-rolled retry logic. The four states map 1:1 to project-plan.md's literal "draft → processing → ready/error" wording, so the entity's `status` column is directly traceable to the requirement. `processingError` gives future phases (04/05) a concrete field to surface "why did this fail" to the user instead of a bare `error` flag.
- **Cons:** A genuinely broken file still costs `retryLimit` worth of wasted `ffprobe`/`screenshots()` attempts before reaching the terminal state (bounded and small, not unbounded). Requires a small amount of new code — a job-completion listener that maps pg-boss's exhausted-retry signal to the `Video` row — beyond what TD-02/TD-03 already specify structurally.

### Option B: Single attempt, no automatic retry — immediate terminal `error` on first failure
- Same four-value `status` enum, but the worker makes exactly one attempt; any thrown error immediately flips `Video.status` to `error` with no pg-boss retry configured (`retryLimit: 0`). Recovering a video that failed due to a transient fault requires a future, out-of-scope "reprocess" action.
- **Pros:** Simplest possible failure path — one attempt, one outcome, no retry bookkeeping. Avoids spending any extra `ffprobe`/`screenshots()` cycles on a file that is going to fail again regardless.
- **Cons:** Cannot distinguish "this video is actually broken" from "the worker container was mid-restart when this job ran" — both look identical (one failed attempt), so a healthy upload can be permanently marked `error` by pure infrastructure timing, with no automatic path to recovery and no reprocessing mechanism planned in this phase or the next. Wastes the upload (10GB, potentially) on a failure mode `pg-boss`'s retry would have absorbed for free.

### Option C: Unbounded/aggressive retry, no distinct `error` status ever reached under normal operation
- The worker retries indefinitely (or a very high bound) on failure; `Video.status` only ever holds `draft`, `processing`, or `ready` — a permanently-failing video simply stays `processing` forever, discoverable only by an operator querying pg-boss's own job table directly.
- **Pros:** No video is ever "given up on" automatically; every failure is theoretically recoverable given enough attempts.
- **Cons:** **Directly fails to satisfy the assignment's literal requirement** — "ready/error" names `error` as a real, reachable terminal state, and this option never reaches it under normal operation. A user watching a genuinely corrupted upload sees "processing" indefinitely with no resolution, which is worse UX than an honest terminal failure. Rejected outright — it isn't a matter of trade-off, it fails the stated requirement.

**Recommendation:** **Option A (bounded retry + persisted `error` terminal state)** — it is the only option that reaches both required terminal states (`ready` and `error`) under normal operation while not wasting a whole upload on a failure that a bounded retry would have recovered from for free. `pg-boss`'s `retryLimit`/`retryBackoff` options (TD-02's own dependency) implement the bounded-retry mechanics directly — no new library, no hand-rolled retry/backoff logic to write or test. Option B is rejected because it conflates transient infrastructure faults with genuinely broken uploads at the cost of the full 10GB upload; Option C is rejected because it fails the assignment's literal "ready/error" state-machine requirement outright.

**Decision:** A (Bounded automatic retry via pg-boss + persisted `error` terminal state)

---

## Decisions Summary

| ID | Scope | Decision | Recommendation | Choice |
|----|-------|----------|---------------|--------|
| TD-01 | Backend | Object storage backend & client library | A (`@aws-sdk/client-s3`) | A (`@aws-sdk/client-s3`) |
| TD-02 | Backend | Background job queue library | B (pg-boss) | B (pg-boss) |
| TD-03 | Backend | Video worker deployment model | A (Dedicated worker process, same codebase) | A (Dedicated worker process, same codebase) |
| TD-04 | Backend | Video processing pipeline (metadata & thumbnail) | A (`fluent-ffmpeg`) | A (`fluent-ffmpeg`) |
| TD-05 | Backend | Unique video URL / public identifier strategy | A (`nanoid` short opaque ID) | A (`nanoid` short opaque ID) |
| TD-06 | Cross-layer | Upload protocol for files up to 10GB | A (tus protocol — `@tus/server` + `@tus/s3-store`) | A (tus protocol — `@tus/server` + `@tus/s3-store`) |
| TD-07 | Cross-layer | Media delivery mechanism for streaming & download | A (Presigned/direct object-storage URLs) | A (Presigned/direct object-storage URLs) |
| TD-08 | Repo-wide | Docker Compose topology for new infrastructure | A (Extend `nestjs-project/compose.yaml`) | A (Extend `nestjs-project/compose.yaml`) |
| TD-09 | Backend | Upload content validation & failure cleanup strategy | C (Hybrid: onUploadCreate fast-reject + onUploadFinish authoritative check) | C (Hybrid: onUploadCreate fast-reject + onUploadFinish authoritative check) |
| TD-10 | Backend | Video status lifecycle & processing failure handling | A (Bounded automatic retry via pg-boss + persisted `error` terminal state) | A (Bounded automatic retry via pg-boss + persisted `error` terminal state) |

---

## Notes for downstream pipeline

- **TD-02 → TD-03 dependency.** TD-03's worker registers whichever queue library TD-02 selects (`@Processor()`/`WorkerHost` for BullMQ, or `boss.work()` for pg-boss) — the deployment-model decision (dedicated process vs in-process) holds regardless of which library TD-02 picks.
- **TD-01 → TD-06, TD-07 dependency.** Both cross-layer TDs assume TD-01's Option A (`@aws-sdk/client-s3`) is chosen, since `@tus/s3-store` (TD-06) and `@aws-sdk/s3-request-presigner` (TD-07) both build on that same client. If TD-01 swings to Option B (`minio` SDK), TD-06 and TD-07 need re-examination for how a second S3-compatible client coexists with `@tus/s3-store`'s AWS-SDK dependency.
- **TD-02 → TD-08 dependency.** TD-08's Compose file only needs a `redis` service if TD-02 chooses BullMQ (Option A); if pg-boss (Option B) is chosen, TD-08's new services are just `minio` + `video-worker`.
- **TD-06's `onUploadCreate` hook is where the phase-03 draft `Video` entity is actually created** — no separate TD or endpoint is needed for "automatic pre-registration when the upload starts"; it is a direct consequence of TD-06's Option A, called out explicitly in TD-06's Context/Recommendation so it is not lost as an implementation afterthought.
- **This document decides the `Video` entity's `status` lifecycle (TD-10: `draft`/`processing`/`ready`/`error` + `processingError`) but NOT the rest of its schema** — storage/thumbnail key columns (shaped by TD-01/TD-04), the public identifier column (TD-05), and ownership columns (TD-06 Revision) are each fixed by their own TD; remaining columns with no dedicated TD (e.g., title, description placeholders) are `/implement`'s job via the `typeorm` skill. What remains genuinely deferred to `phase-04` is only the **draft → published visibility toggle** (public/unlisted, per project-plan.md's Phase 04 scope) — a separate concern from the processing-status lifecycle this document now owns. Any transcoding/adaptive-bitrate capability stays out of scope per project-plan.md as written (TD-04's Option C notes where to revisit if that changes).
- **TD-06 → TD-09 → TD-10 chain.** TD-09's Option C reorders TD-06's `onUploadCreate` hook: the declared-metadata check must run **before** the draft `Video` row is created, not after — an upload that fails the fast-reject check never gets a draft row at all, and TD-09's authoritative `ffprobe` check in `onUploadFinish` deletes both the S3 object and the draft row on rejection (no status transition needed — the row never persists past that gate). TD-10 governs the **separate, later** failure window: once a video has passed TD-09's gate and entered TD-03's async worker for TD-04's extraction, a failure there does NOT delete the row — it retries per TD-10's policy and, if exhausted, transitions the row to the persisted `error` status instead.
- **Implementation surface for `/plan-build` if recommendations are accepted:**
  - `nestjs-project/src/storage/` — S3 client provider (TD-01), namespaced `storage.config.ts` following the `registerAs()` convention from `phase-01-configuracao-base/TD-03`.
  - `nestjs-project/src/queue/` or `nestjs-project/src/processing/` — pg-boss (or BullMQ) module + `onUploadCreate`/queue producer wiring (TD-02, TD-06).
  - `nestjs-project/src/worker/main.ts` — dedicated worker entrypoint (TD-03); new `Dockerfile` target/stage and `video-worker` Compose service (TD-08).
  - `nestjs-project/src/videos/` — `Video` entity with the `nanoid` public-id column (TD-05), the `status`/`processingError` columns (TD-10), upload-session and stream/download-URL controllers (TD-06, TD-07).
  - `nestjs-project/src/queue/` or `nestjs-project/src/processing/` — pg-boss job sent with `retryLimit`/`retryBackoff` (TD-10) and a completion listener that flips `Video.status` to `error` on exhausted retries.
  - `nestjs-project/compose.yaml` — add `minio` (+ `redis` if BullMQ), `video-worker` (TD-08).
  - `next-frontend/lib/` — a thin tus-client wrapper (TD-06) and a stream/download-URL fetch helper (TD-07) for the future upload and player screens to consume.
  - New backend dependencies: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `@tus/server`, `@tus/s3-store`, `fluent-ffmpeg`, `nanoid`, `pg-boss` (or `bullmq` + `@nestjs/bullmq`).
  - New frontend dependency: `tus-js-client` (or Uppy, if a richer upload-UI kit is wanted once the upload screen itself is planned).

Sources consulted during research:

- [NestJS — Streaming files (`StreamableFile`)](https://docs.nestjs.com/techniques/streaming-files) and [Queues (`@nestjs/bullmq`)](https://docs.nestjs.com/techniques/queues) — confirmed `StreamableFile`'s cross-platform piping model and the official BullMQ integration shape.
- [NestJS — File upload (Multer)](https://docs.nestjs.com/techniques/file-upload) — confirmed the built-in upload path is Multer-based, motivating TD-06's Option C rejection.
- [tus-node-server (`@tus/server`, `@tus/s3-store`)](https://github.com/tus/tus-node-server) — confirmed `S3Store` configuration against a custom (MinIO-compatible) endpoint and the `onUploadCreate`-style hook model.
- [tus-node-server — error handling / hook rejection (`onUploadCreate`, `onUploadFinish`)](https://github.com/tus/tus-node-server/blob/main/_autodocs/errors.md) — confirmed the `throw { status_code, body }` rejection pattern for both hooks, and the documented `onUploadFinish` + `store.remove(upload.id)` reject-and-delete pattern (used for virus scanning) that TD-09's Option C mirrors for content validation.
- [AWS SDK for JavaScript v3 (`@aws-sdk/client-s3`, `s3-request-presigner`, `lib-storage`)](https://github.com/aws/aws-sdk-js-v3) — confirmed custom-endpoint configuration for S3-compatible storage, `getSignedUrl()`, and the `Upload` multipart helper.
- [BullMQ — NestJS integration](https://github.com/taskforcesh/bullmq/blob/master/docs/gitbook/guide/nestjs/README.md) — confirmed `@Processor()`/`WorkerHost` and `BullModule.forRoot()` connection shape.
- [pg-boss](https://github.com/timgit/pg-boss) — confirmed queue creation, `work()`/`send()` API, and retry/backoff/dead-letter support without Redis.
- [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg) — confirmed `ffprobe()` metadata shape and `.screenshots()` thumbnail extraction API.
- `docs/project-plan.md` § Phase 03, § Points of Attention — source of the 10GB/no-performance-impact/resumability requirements driving TD-06.
- `next-frontend/CLAUDE.md` § "Talking to the NestJS API" — source of the strict-BFF model TD-07 carves a scoped exception into, and the existing "Media streaming... TBD" note this document resolves.
- `docs/decisions/technical-decisions-phase-01-configuracao-base.md`, `technical-decisions-next-frontend-config-base.md` — consumed for existing infra/config conventions (namespaced `registerAs()` config, strict single server-only `API_URL`, separate Compose stacks).
