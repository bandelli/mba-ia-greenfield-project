# Production Deployment

Deployment topology decided in `home-search-launch/TD-05`: **Option C — a single managed
container platform running Docker images built from this repo's existing Dockerfiles**
(e.g. [Render](https://render.com) or [Railway](https://railway.com); either works — pick
whichever the account owner already has, this doc is not platform-locked), plus that
platform's managed Postgres add-on, plus **Cloudflare R2** for S3-compatible object
storage (the researched platforms have no native S3-compatible storage of their own).

This keeps the "everything is a Docker container built from this repo's Dockerfiles"
principle from the root `CLAUDE.md` — no Vercel-specific build pipeline, no bespoke
serverless rewrite of `nestjs-api`/`video-worker` (ruled out by the background
`video-worker` needing to run as a persistent process, not a request-triggered
function, per `phase-03-videos/TD-03`).

## Gap found while writing this doc: production Dockerfiles did not exist yet

Both subprojects previously had **only** a `Dockerfile.dev` (`nestjs-project/Dockerfile.dev`,
`next-frontend/Dockerfile.dev`) — bare, idle base images (`tail -f /dev/null`) meant to be
bind-mounted and driven entirely via `docker compose exec` at dev time. Neither installs
dependencies, builds, or copies application code, so neither is deployable as-is. `TD-05`
and this SI's own Technical actions assume "reusing the Dockerfiles already existing... without
altering them," but no *production* Dockerfile existed to reuse.

Resolved by **adding** a new `Dockerfile` (production, multi-stage) next to each
subproject's existing `Dockerfile.dev` — the dev image is untouched, so the "without
altering them" intent is honored for the dev image; the production image is new,
standard, and unopinionated (framework's own recommended multi-stage pattern in each
case). Both were built locally (`docker build .`) as part of this SI to confirm they
actually produce a working image, not just plausible-looking Dockerfiles — see
§ Verification below.

## Services

### 1. `next-frontend`

- **Image:** `next-frontend/Dockerfile` (multi-stage; builds with `next build` using
  `output: "standalone"`, set in `next.config.ts` — required so the runtime stage only
  ships the traced production dependency subset instead of the full `node_modules` tree).
- **Platform service type:** Docker web service, port `3000` (the image's `EXPOSE`;
  map the platform's public port to it).
- **Start command:** baked into the image (`CMD ["node", "server.js"]`) — no override
  needed.
- **Health check:** `GET /` should return `200`.
- **Build-time env requirement (found while verifying the Dockerfile):** `next build`
  statically collects Route Handler page data, which evaluates `lib/env.ts`'s Zod schema
  at build time even though `API_URL`/`SESSION_PASSWORD` are server-only runtime values
  never inlined into the client bundle — the build fails with a Zod validation error
  without them. The Dockerfile sets build-time placeholders via `ARG`/`ENV` (a
  syntactically-valid URL and a 32+ char string — see the Dockerfile's comment) purely
  to satisfy the schema shape; they are **not** the real production values. Most
  container-platform UIs (Render, Railway) let you set build-time `ARG`s separately
  from runtime env vars if you'd rather pass the real values at build time too — either
  way, the runtime env vars set in the platform's dashboard (§ Environment variables
  below) are what the running server actually reads on every request, since neither var
  is referenced by a Client Component.

### 2. `nestjs-api`

- **Image:** `nestjs-project/Dockerfile` (multi-stage; `nest build` → `dist/`).
- **Platform service type:** Docker web service, port `3000`.
- **Start command:** baked into the image (`CMD ["node", "dist/main"]`).
- **Health check:** `GET /` should return `200` ("Hello World!", per the existing dev
  verification convention in `nestjs-project/CLAUDE.md`).
- **Migrations:** run `npm run migration:run` (against the production `DATABASE_URL`
  decomposed into `DB_*` vars, see § Environment variables) as a one-off release step
  before the new version starts serving traffic — this repo has no automated
  migration-on-boot hook, so this is a manual (or platform "pre-deploy command," where
  supported) step on every release that includes a new migration.

### 3. `video-worker`

- **Image:** the **same** `nestjs-project/Dockerfile` as `nestjs-api` — this is a
  deliberate reuse, mirroring how `nestjs-project/CLAUDE.md` already documents the dev
  setup ("Like `nestjs-api`, it shares the same [image] — the two are differentiated
  only by the... `command:`"). No second Dockerfile, no second build.
- **Platform service type:** Docker **background worker** (not a web service — it
  consumes `pg-boss` jobs from Postgres, per `phase-03-videos/TD-02`/`TD-03`; it does
  not listen on a port and needs no public URL).
- **Start command override:** `node dist/worker/main` (overrides the image's default
  `CMD`, which is `nestjs-api`'s `node dist/main`).
- **Runtime dependency:** `ffmpeg`/`ffprobe`, already installed in the shared image's
  runtime stage (`phase-03-videos/TD-02`, `TD-04`).

## Managed Postgres

Provision the platform's managed Postgres add-on (Render "Postgres," Railway "Postgres
plugin," etc. — whichever platform was chosen). The platform issues a single
`DATABASE_URL` connection string; **this app does not read `DATABASE_URL` directly** —
`nestjs-project/src/config/database.config.ts` reads discrete `DB_HOST`/`DB_PORT`/
`DB_USERNAME`/`DB_PASSWORD`/`DB_NAME` vars (same as local dev, where they point at the
`db` Compose service). Decompose the issued connection string into those 5 vars when
configuring the service (most platforms also expose the decomposed fields individually
in their dashboard alongside the combined URL — check there before parsing by hand).

Enable TLS/SSL if the platform's managed Postgres requires it for external connections
(same-network connections between the platform's own services typically don't). This
repo's `database.config.ts` does not currently set an `ssl` option — if the chosen
platform's managed Postgres mandates SSL even for internal connections, that's a small,
separate code change (`ssl: { rejectUnauthorized: false }` or the platform's supplied CA),
not something this infra-only SI adds speculatively.

## Cloudflare R2 (object storage)

1. Create an R2 bucket (e.g. `streamtube-prod`) in the Cloudflare dashboard.
2. Create an R2 API token scoped to that bucket (Account → R2 → Manage API Tokens).
3. R2 is S3-compatible, so **no storage-client code changes are needed** —
   `phase-03-videos/TD-01`'s `STORAGE_ENDPOINT`/`STORAGE_FORCE_PATH_STYLE` design already
   exists specifically to support any S3-compatible endpoint (MinIO in dev today). Point
   the same env vars at R2 instead:
   - `STORAGE_ENDPOINT` → `https://<account-id>.r2.cloudflarestorage.com`
   - `STORAGE_REGION` → `auto` (R2's accepted value; the AWS SDK requires a non-empty
     region string but R2 ignores it)
   - `STORAGE_BUCKET` → the bucket name created in step 1
   - `STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY` → the R2 API token's
     credentials from step 2
   - `STORAGE_FORCE_PATH_STYLE` → `true` (R2, like MinIO, needs path-style addressing)
4. If served video/thumbnail URLs need to be public-read (rather than always
   presigned), configure the bucket's public access / a custom domain in the R2
   dashboard — out of scope to decide here since the existing presigned-URL flow
   (`phase-05-video-watch-page`) may already cover this without bucket-level public
   access; verify against that phase's TDs before changing bucket visibility.

## Environment variables (reference — no secrets committed)

Every variable below is documented, not filled in — actual production values (passwords,
API keys, session secret) are configured directly in the platform's environment-variable
UI/secrets manager, never committed to this repository.

### `nestjs-api` / `video-worker` (both services, same env set)

| Variable | Local dev value (`.env.example`) | Production source |
|---|---|---|
| `NODE_ENV` | `development` | `production` |
| `PORT` | `3000` | `3000` (or platform-assigned) |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | `db` / `5432` / `streamtube` / `streamtube` / `streamtube` | decomposed from the managed Postgres connection string (see § Managed Postgres) |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | placeholder values | freshly generated secrets, platform secret store |
| `JWT_ACCESS_EXPIRATION`, `JWT_REFRESH_EXPIRATION` | `15m` / `7d` | same (not secrets) |
| `CONFIRMATION_TOKEN_EXPIRATION_HOURS`, `PASSWORD_RESET_TOKEN_EXPIRATION_HOURS` | `1` / `1` | same (not secrets) |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_FROM` | `mailpit` / `1025` / `StreamTube <noreply@streamtube.com>` | a real SMTP relay's host/port + a real `From` address |
| `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_FORCE_PATH_STYLE` | MinIO values | R2 values (see § Cloudflare R2 above) |

**Known gap, flagged rather than silently fixed:** `nestjs-project/src/config/mail.config.ts`
only reads `MAIL_HOST`/`MAIL_PORT`/`MAIL_FROM` — there is no `MAIL_USER`/`MAIL_PASS` (or
equivalent) support for an authenticated SMTP relay. Mailpit (dev) accepts unauthenticated
connections, so this has never mattered before. Most production SMTP providers (SendGrid,
Postmark, etc.) require auth. Adding that support is a `nestjs-project` mail-module code
change, out of scope for this infra/config-only SI — flagging for the user to route to a
follow-up task before actually cutting over production email.

### `next-frontend`

| Variable | Local dev value | Production source |
|---|---|---|
| `NODE_ENV` | `development` | `production` |
| `API_URL` | `http://nestjs-api:3000`-equivalent per local topology | the deployed `nestjs-api` service's internal/private URL on the platform (server-only — never exposed to the browser, per the BFF model in `next-frontend/CLAUDE.md`) |
| `SESSION_PASSWORD` | local dev value (≥32 chars) | freshly generated ≥32-char secret, platform secret store |

## Verification performed in this SI

Both production Dockerfiles were built locally to confirm they actually produce a
working image (not just documented — no code path in this repo runs `docker build`
in CI yet; that's `SI-07.6`'s job, not this one):

```bash
docker build -t streamtube-nestjs-prod-test  -f nestjs-project/Dockerfile  nestjs-project/
docker build -t streamtube-frontend-prod-test -f next-frontend/Dockerfile  next-frontend/
```

Both built successfully end-to-end (dependency install → framework build → runtime
stage assembly) on the second attempt — the first `next-frontend` build failed with a
Zod validation error until the build-time `ARG` placeholders described above were added.
BuildKit emits two benign `SecretsUsedInArgOrEnv` lint warnings for the `SESSION_PASSWORD`
build ARG/ENV pair — expected and safe to ignore here: the flagged value is the literal
placeholder string in the Dockerfile, not a real secret (no real secret is ever passed as
a build `ARG` per this doc's guidance — real secrets are runtime-only platform env vars).

Running the resulting containers against a live production Postgres/R2 was **not**
performed — that requires actually provisioning the platform account, out of scope for
what an agent can verify locally; the AC's "documented and applicable" requirement is
satisfied by the Dockerfiles building cleanly and the env var reference above being
complete and accurate against the app's actual config-reading code (grepped, not assumed).

## No secrets committed

Nothing in this repository — this document, the two new `Dockerfile`s, or the two new
`.dockerignore`s — contains a real credential. Every secret-shaped value in the table
above is a local-dev placeholder or an explicit instruction to generate/obtain one at
deploy time in the platform's own secret store.
