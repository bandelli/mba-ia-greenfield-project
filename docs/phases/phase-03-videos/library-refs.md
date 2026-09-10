---
libs:
  "@aws-sdk/client-s3":
    version: "^3.1128.0"
    context7_id: "/aws/aws-sdk-js-v3"
    fetched_at: "2026-09-09T20:49:01"
  "@aws-sdk/s3-request-presigner":
    version: "^3.1128.0"
    context7_id: "/aws/aws-sdk-js-v3"
    fetched_at: "2026-09-09T20:49:01"
  pg-boss:
    version: "^11.1.2"
    context7_id: null
    fetched_at: "2026-09-09T20:49:01"
  fluent-ffmpeg:
    version: "^2.1.3"
    context7_id: "/fluent-ffmpeg/node-fluent-ffmpeg"
    fetched_at: "2026-09-09T20:49:01"
  nanoid:
    version: "^3.3.18"
    context7_id: "/ai/nanoid"
    fetched_at: "2026-09-09T20:49:01"
  "@tus/server":
    version: "^2.4.5"
    context7_id: "/tus/tus-node-server"
    fetched_at: "2026-09-09T20:49:01"
  "@tus/s3-store":
    version: "^2.0.6"
    context7_id: "/tus/tus-node-server"
    fetched_at: "2026-09-09T20:49:01"
sources_mtime:
  docs/decisions/technical-decisions-phase-03-videos.md: "2026-09-09T20:43:48"
---

# phase-03-videos — Library References

Distilled docs for libraries decided in this phase. Pulled via Context7. Re-fetch when the underlying TD changes (resolve refreshes this file when the lib set in `## Decisions Index` drifts from the cached set here).

## @aws-sdk/client-s3

**Source:** `/aws/aws-sdk-js-v3` (Context7) — High reputation, 14561 snippets, benchmark 72.69. Maps to `phase-03-videos/TD-01` Decision A.

### S3-compatible endpoint (MinIO in dev, real S3 in prod)

`endpoint` + `forcePathStyle: true` make the same client code work against MinIO (dev) and AWS S3 (prod) — exactly the pattern `StorageService` (`src/storage/storage.service.ts`) uses:

```typescript
const client = new S3Client({
  endpoint: "http://localhost:8888", // MinIO service, e.g. http://minio:9000 in Compose
  forcePathStyle: true,
  region: "us-west-2",
  credentials: {
    accessKeyId: "CLIENT_TEST",
    secretAccessKey: "CLIENT_TEST",
  },
});
```

### Bare-bones client + commands

```typescript
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const client = new S3Client({ /* ... */ });
await client.send(new GetObjectCommand({ Bucket, Key }));
```

## @aws-sdk/s3-request-presigner

**Source:** `/aws/aws-sdk-js-v3` (Context7) — same repo as `@aws-sdk/client-s3`. Maps to `phase-03-videos/TD-07` Decision A (presigned/direct object-storage URLs for streaming and download).

### getSignedUrl for GetObject

```typescript
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const client = new S3Client(clientParams);
const command = new GetObjectCommand(getObjectParams);
const url = await getSignedUrl(client, command, { expiresIn: 3600 });
```

`expiresIn` defaults to 900 seconds (15 min) inside `S3RequestPresigner.presign()` when omitted — always pass it explicitly for a predictable TTL on `stream-url`/`download-url` responses.

## pg-boss

**Source:** no dedicated Context7 entry exists for the `pg-boss` package itself (only the community wrapper `pg-bossman`, a different API surface — not used by this project). Maps to `phase-03-videos/TD-02` Decision B. The API below reflects the version actually installed (`pg-boss@^11.1.2`) and already verified working in SI-03.2/SI-03.4 (`QueueService`).

### Core API used by `QueueService` (`src/queue/queue.service.ts`)

```typescript
const boss = new PgBoss(connectionString);
await boss.start();
await boss.createQueue(queueName);
await boss.send(queueName, payload);
await boss.work(queueName, async (job) => { /* handler */ });
```

`retryLimit` / `retryDelay` / `retryBackoff` are passed at queue-creation time (`DEFAULT_QUEUE_OPTIONS` in `queue.service.ts`) — bounded automatic retry, per `phase-03-videos/TD-10`.

## fluent-ffmpeg

**Source:** `/fluent-ffmpeg/node-fluent-ffmpeg` (Context7) — Medium reputation, 340 snippets, benchmark 83.64. Maps to `phase-03-videos/TD-04` Decision A.

### Metadata extraction (`ffprobe`)

```javascript
ffmpeg('/path/to/file.avi').ffprobe(function(err, data) {
  console.dir(data.streams);
  console.dir(data.format);
});
```

Does **not** work on input streams — `VideoProcessingService` downloads the object to a local temp file first (see `src/processing/video-processing.service.ts`).

### Thumbnail generation (`screenshots()`)

```javascript
ffmpeg('/path/to/video.avi')
  .screenshots({
    timestamps: [30.5, '50%', '01:10.123'],
    filename: 'thumbnail-at-%s-seconds.png',
    folder: '/path/to/output',
    size: '320x240'
  });
```

`timestamps` accepts seconds, percentage strings, or `hh:mm:ss` strings — used by `VideoProcessingService` to implement `min(1s, 10% da duração)` per `phase-03-videos/TD-04`'s revision. Also does not work on input streams (same caveat as `ffprobe`).

## nanoid

**Source:** `/ai/nanoid` (Context7) — High reputation, 496 snippets, benchmark 76.54. Maps to `phase-03-videos/TD-05` Decision A. Pinned to `^3.3.18` (not v4+/v5+/v6) deliberately — v4+ is ESM-only and breaks under this project's CommonJS-based Jest setup (see `nestjs-project/CLAUDE.md` § "ESM-only npm packages under Jest").

### Generating the public ID

```javascript
import { nanoid } from 'nanoid'

const id = nanoid()      // 21 chars (default)
const shortId = nanoid(10) // custom length
```

`Video.public_id` is generated via a `@BeforeInsert()` hook on the entity itself (`src/videos/entities/video.entity.ts`) using the default 21-char `nanoid()`.

## @tus/server

**Source:** `/tus/tus-node-server` (Context7) — High reputation, 519 snippets, benchmark 87.27 (same monorepo backs `@tus/s3-store` below). Maps to `phase-03-videos/TD-06` Decision A.

### `onUploadCreate` / `onUploadFinish` hooks and error contract

```typescript
const server = new Server({
  path: '/upload',
  datastore: store,
  onUploadCreate: async (req, upload) => {
    const { ok, expected, received } = validateMetadata(upload);
    if (!ok) {
      throw { status_code: 400, body: `Expected "${expected}" but received "${received}"` };
    }
    return {};
  },
  onUploadFinish: async (req, upload) => {
    // authoritative post-upload check (ffprobe, per TD-09)
    return {};
  },
});
```

Hooks reject by **throwing a plain `{ status_code, body }` object**, not an `Error` — this is why `TusServerMiddleware.toTusError()` (`src/videos/tus-upload.middleware.ts`) has justified `eslint-disable` comments for `@typescript-eslint/only-throw-error`.

### Request/response wrapping (the ESM/`srvx` gotcha)

`Server.handle(req, res)` wraps the raw Express `req`/`res` in a `srvx`-based `NodeRequest` before invoking hooks — properties set on the Express `req` by earlier middleware (e.g. `req.user` from `TusAuthMiddleware`) are not directly on the hook's `req` param. Reach the original object via `req.runtime.node.req` (undocumented in the public API, discovered by reading `srvx`'s source — see `TusServerMiddleware.getAuthenticatedUser()`).

## @tus/s3-store

**Source:** `/tus/tus-node-server` (Context7), `packages/s3-store` — same monorepo as `@tus/server`. Maps to `phase-03-videos/TD-06` Decision A.

### MinIO configuration (dev)

```typescript
const store = new S3Store({
  s3ClientConfig: {
    region: 'us-east-1',
    bucket: 'uploads',
    endpoint: 'http://minio-server:9000', // Docker Compose service name in this project
    credentials: {
      accessKeyId: 'minioadmin',
      secretAccessKey: 'minioadmin'
    },
    forcePathStyle: true
  }
})
```

Same `endpoint` + `forcePathStyle: true` pattern as `@aws-sdk/client-s3` above — required for any S3-compatible (non-AWS) endpoint. `partSize` defaults are fine for this project's file-size range; not overridden in `TusServerMiddleware`.
