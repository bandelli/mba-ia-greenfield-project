---
scope_type: phase
related_phases: [4]
status: decided
date: 2026-09-10
scope_description: "Video information editing (title, description, category, custom thumbnail), video visibility (public/unlisted) and draft-to-publish flow, the channel video management dashboard, editing videos from the dashboard, channel information editing (nickname, name, description), and the public channel page."
---

# Technical Decisions — Phase 04: Video and Channel Management

_Subprojects in scope:_

- `nestjs-project/` — primary subproject for the backend side: the video category and publication-state columns/migrations, the custom-thumbnail upload endpoint, channel nickname-edit collision handling, and the paginated listing endpoints backing both the dashboard and the public channel page.
- `next-frontend/` — receives the dashboard, video-edit, channel-edit, and public-channel-page screens; owns the list data-fetching pattern (TD-06) and the client side of every Cross-layer TD in this document (thumbnail upload, nickname-collision UX, pagination contract consumption).

---

## TD-01: Video Category Data Model & Exposure

**Scope:** Cross-layer

**Capability:** "Video categories available on the platform"

**Context:** The platform needs a closed set of video categories that the video-edit form lets the owner assign to a video (this phase) and that a future home page will filter by (`docs/project-plan.md` Phase 07 — not decided here, only kept compatible). No phase in `docs/project-plan.md` introduces an admin screen or endpoint to author/manage categories — they are a fixed, platform-defined list, not user- or admin-authored content. This decision settles how that fixed set is stored on `Video` and exposed to `next-frontend/` for the picker UI.

**Options:**

### Option A: PostgreSQL enum column (`videos.category`), mirroring the existing `VideoStatus` pattern
- A `VideoCategory` TS enum (mirroring `video.entity.ts`'s existing `VideoStatus`) backs a Postgres `enum` column. `@nestjs/swagger` infers the enum in the OpenAPI schema automatically, and `next-frontend/`'s existing codegen (`next-frontend-openapi-typing/TD-01`) produces the matching TS union — no extra endpoint needed for the picker beyond a small label map for human-readable strings.
- **Pros:** Zero new table, zero new endpoint, follows the exact convention this codebase already uses for `VideoStatus` on this same entity. Full type-safety end-to-end via the already-decided OpenAPI codegen pipeline.
- **Cons:** Adding or renaming a category later requires a migration (`ALTER TYPE ... ADD VALUE` or an enum+column swap) — acceptable given the list is platform-defined and not expected to change often.

### Option B: Dedicated `categories` table, seeded, with `videos.category_id` as an FK
- `categories` (`id`, `name`, `slug`) seeded via a TypeORM seed (the project already has `database/seeds/`); `Video.category_id` references it.
- **Pros:** Categories become data — could support future admin-managed additions/renames without a schema migration, and a `GET /categories` endpoint becomes a natural place to add metadata later (icon, sort order).
- **Cons:** No phase in the entire `project-plan.md` ever introduces admin management of categories — this option pays the cost of a full referenced table (FK, join on every video read, seed maintenance) for a capability nobody has asked for, against this project's stated principle of not designing for hypothetical future requirements.

### Option C: Plain `varchar` column, validated only in the DTO (`@IsIn([...])`)
- No DB-level enum type; the fixed list lives only in `class-validator` decorators.
- **Pros:** Simplest possible column type; adding a category is a one-line code change.
- **Cons:** Loses the DB-level guarantee `VideoStatus`'s Postgres enum gives today — a stray write from a script or manual query could insert an invalid category with nothing at the schema level to catch it, inconsistent with this project's own established convention for closed-set fields on this exact entity.

**Recommendation:** **Option A** — it mirrors the `VideoStatus` convention already established on the same entity, requires no new table or endpoint, and the already-decided OpenAPI codegen pipeline delivers full type-safety to `next-frontend/` for free. Option B's flexibility solves a problem (admin-managed categories) that no phase of this project defines.

**Decision:** A (PostgreSQL enum column, mirrors `VideoStatus`)

---

## TD-02: Video Publication State Model (Draft → Publish & Visibility)

**Scope:** Cross-layer

**Capability:** Transversal — covers: "Video visibility: public (shown to everyone) or unlisted (accessible only via link)", "Draft → publish flow"

**Context:** `Video.status` (`draft | processing | error | ready`, per `phase-03-videos/TD-10`) already models the *processing* lifecycle, and `VideoStatusService`'s own header comment explicitly scopes itself to "every `Video.status` transition of the processing lifecycle" — a Single Responsibility boundary this phase must respect, not cross. But a `ready` video is not automatically visible to anyone: the owner must still choose to publish it (after setting title/category/thumbnail) and pick `public` or `unlisted`. Reusing `VideoStatus` for this would conflate "can the file be streamed at all" with "has the owner decided to make it visible" in one column. This decision defines the new column(s) for publish state and visibility, and where the publish action's readiness validation (status = ready, title present, category chosen) lives.

**Options:**

### Option A: `published_at: timestamptz | null` + `visibility` enum, owned by a new `VideoPublicationService`
- `published_at` is `null` while a draft; setting it publishes the video and drives inclusion in public listings. `visibility` (`public | unlisted`, default `public`) is meaningful once published. A new `VideoPublicationService` — separate from `VideoStatusService` — owns the publish/unpublish transition and its validation gate.
- **Pros:** Fully decoupled from the processing lifecycle — a `ready` video can stay unpublished indefinitely (owner previewing) with no ambiguity, matching `VideoStatusService`'s own documented scope and this project's Single Responsibility principle. `published_at` doubles as the dashboard's requested "publish time" column for free.
- **Cons:** Two new columns and a new service — the largest surface of the three options, though each piece is small and single-purpose.

### Option B: Extend `VideoStatus` with `PUBLISHED` (replacing/following `READY`) + a separate `visibility` column
- `draft → processing → ready → published | error`.
- **Pros:** One less column; reuses the existing enum machinery.
- **Cons:** **Conflates two lifecycles that answer different questions** — "is the file processed and streamable" vs "has the owner chosen to publish it" — directly against `VideoStatusService`'s documented scope and this project's explicit Single Responsibility principle ("when a module starts owning logic or entities that are not its own, extract it immediately"). Also loses the ability to represent "ready but deliberately left unpublished," since `READY` becomes a transient state immediately superseded by `PUBLISHED` in the normal flow.

### Option C: `is_published: boolean` (default `false`) + `visibility` column, no timestamp
- **Pros:** Simplest pair of columns; decoupled from `VideoStatus` like Option A.
- **Cons:** Loses "publish time" as a first-class column — the dashboard bullet explicitly lists it among required columns, which a boolean cannot answer without an unreliable proxy (`updated_at`, which changes on any edit, not just publishing); adding the timestamp anyway makes this option equivalent to Option A with an extra step.

**Recommendation:** **Option A** — `published_at` directly answers the dashboard's "publish time" column, `visibility` stays a clean independent concern, and a dedicated `VideoPublicationService` keeps this lifecycle out of `VideoStatusService`'s explicitly documented scope, honoring the Single Responsibility principle this project already enforces on the same entity.

**Decision:** A (`published_at` + `visibility`, new `VideoPublicationService`)

---

## TD-03: Custom Thumbnail Upload Protocol & Storage Strategy

**Scope:** Cross-layer

**Capability:** Transversal — covers: "Video information editing: title, description, category, and custom thumbnail", "Editing videos from the dashboard"

**Context:** The worker already auto-generates `thumbnail_key` from a video frame (`phase-03-videos/TD-04`). This phase lets the owner override it with a custom image. Unlike the 10GB video upload (`phase-03-videos/TD-06`, tus), a thumbnail is a single small image — the non-functional pressure that justified tus's protocol complexity (resumability, avoiding buffering a 10GB file in the API process) does not apply here. This decision picks the upload transport for this one small-file case and how the resulting object replaces the worker-generated thumbnail.

**Options:**

### Option A: `FileInterceptor` + `ParseFilePipe` (NestJS built-in Multer integration, memory storage)
- A dedicated `PATCH /videos/:id/thumbnail` multipart endpoint, validated with `FileTypeValidator` (image mime types) and `MaxFileSizeValidator` (a small size cap) before the buffer is handed to `StorageService.putObject` using the *same* `thumbnail_key` the worker would have written, overwriting it. `next-frontend/`'s existing BFF mutation pathway (`phase-02-auth-frontend/TD-05`) forwards the browser's `FormData` through a Route Handler to this endpoint.
- **Pros:** Stays inside NestJS's normal controller/pipe pipeline — no separate middleware mount (unlike tus), consistent with every other endpoint in this phase. `ParseFilePipe`'s validators are declarative. Reusing the same `thumbnail_key` avoids any orphaned-object cleanup logic — the new `PutObjectCommand` simply replaces the object at that key.
- **Cons:** The (small) file passes through the NestJS process's memory before `putObject` — a deliberate, small-scale deviation from TD-07's "bytes never touch the API" principle for video streaming, worth stating explicitly so it isn't mistaken for an inconsistency later.

### Option B: Presigned PUT — API issues a short-lived presigned S3 `PUT` URL, browser uploads directly to storage
- Mirrors the read-side pattern from `phase-03-videos/TD-07`; the browser `PUT`s the image bytes directly to storage, then calls the API to confirm and record the new `thumbnail_key`.
- **Pros:** Symmetric with TD-07's philosophy of keeping bytes off the API process, at any file size.
- **Cons:** Requires the bucket to accept a browser-originated `PUT` (a stricter CORS policy than TD-07's `GET`-only need) to solve a memory-buffering concern that is negligible at thumbnail scale; also loses the API's chance to validate the file's actual content before it lands in storage (validation would need a second read after the fact).

### Option C: Reuse the tus protocol from `phase-03-videos/TD-06`
- **Pros:** One less upload mechanism to maintain.
- **Cons:** tus's entire value proposition (resumable chunked transfer for files large enough that a dropped connection mid-upload is a real risk) does not apply to a single-request, sub-megabyte image — mounting the same middleware here adds tus's non-REST request/hook model for no benefit.

**Recommendation:** **Option A** — a thumbnail is small enough that the memory-buffering concern Option B avoids is not material, and staying inside NestJS's ordinary controller/pipe pipeline with declarative `ParseFilePipe` validation is simpler to build and reason about than adding a new CORS `PUT` surface for a marginal benefit at this file size. Option C solves a large-file problem this upload does not have.

**Decision:** A (`FileInterceptor` + `ParseFilePipe`)

---

## TD-04: Channel Nickname Collision Handling on Edit

**Scope:** Cross-layer

**Capability:** "Channel information editing: nickname, name, and description"

**Context:** `Channel.nickname` is unique, and `channels.service.ts`'s `createChannel` resolves collisions at account-creation time silently — appending a random suffix and retrying — which is acceptable there because the nickname is a system-derived default the user never explicitly chose. Phase 04 makes nickname a user-driven edit: the owner types a new value and submits it. The same silent-suffix behavior would be surprising here — the user would see a nickname different from what they typed with no explanation. This decision settles how a collision is surfaced on this specific, user-initiated path; the underlying unique constraint and retry-safe transaction pattern from `createChannel` can be reused either way — only the user-facing outcome on collision changes.

**Options:**

### Option A: Silent auto-suffix on collision, same as `createChannel`
- Reuse `appendRandomSuffix` and the transaction/retry loop verbatim; return the resulting (possibly different) nickname in the response body.
- **Pros:** One shared code path for both creation and edit collision handling.
- **Cons:** The user submitted `"joao"`, expects to see `"joao"`, and instead gets `"joao-x7k2"` with no error — an easy-to-miss UX for a value the user explicitly typed and cares about.

### Option B: Reject with a domain exception mapped to `409 Conflict`, surfaced as an inline field error
- Reuses the project's existing custom domain-exception → exception-filter → error-envelope pipeline (already used in `auth`); `next-frontend/`'s form (per `phase-02-auth-frontend/TD-04`'s `react-hook-form` + Zod pattern) shows the conflict as an inline field error so the user picks a different nickname.
- **Pros:** Standard, well-understood "handle taken" UX; keeps the user in control of the exact value; zero new infrastructure beyond what `auth` already established.
- **Cons:** Requires a round-trip to discover a taken nickname (no live feedback while typing) — acceptable given no other form in this app currently offers live-availability checking either.

### Option C: Real-time availability check endpoint, queried on debounced input, plus the authoritative check at submit
- `GET /channels/nickname-availability?value=...`.
- **Pros:** Best UX — the user learns a nickname is taken before submitting.
- **Cons:** A new endpoint plus new debounce/query-state logic on the frontend for a capability nothing in the current scope explicitly asks for (registration's nickname is system-generated, not user-typed, so no precedent exists yet).

**Recommendation:** **Option B** — matches this project's existing domain-exception/error-envelope convention exactly, keeps the user in control of their chosen nickname, and avoids building live-availability infrastructure (Option C) that nothing in the current scope requires. Option C remains a reasonable later enhancement if real usage shows submit-time rejection is too disruptive.

**Decision:** B (409 Conflict + inline field error)

---

## TD-05: Pagination Strategy for Video & Channel Listings

**Scope:** Cross-layer

**Capability:** Transversal — covers: "Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)", "Public channel page with information and video listing"

**Context:** This phase introduces the app's first two paginated list endpoints: the owner-only dashboard listing (every status, including drafts, for the current user's own channel) and the public channel page listing (only published + `visibility = public` videos of a given channel). Both need the same pagination mechanic. `docs/project-plan.md`'s Phase 07 bullet "Pagination or infinite scroll in video listings" will reuse whichever wire contract this phase settles, for its own larger, global home-page feed — so this choice is inherited by later phases, not one to revisit lightly. (Dashboard columns depending on subsystems not yet built — `views`, `likes`, `comments` — are returned as `0` placeholders until Phase 05/06 introduce view tracking and social features respectively; this is a data-availability note, not a pagination concern.)

**Options:**

### Option A: Cursor/keyset pagination
- `GET /channels/:nickname/videos?cursor=<opaque>&limit=<n>`, the cursor opaquely encoding the last row's `(created_at, id)`; response includes `nextCursor: string | null`.
- **Pros:** Stable under concurrent writes — a video inserted mid-pagination never shifts or duplicates already-seen rows, since each page anchors to the last-seen row rather than a numeric offset. Consistent performance regardless of how deep into the list the cursor is.
- **Cons:** No "jump to page 5" — only forward/backward stepping, fine for infinite-scroll but extra work for a numbered-page UI. More implementation and testing surface (cursor encode/decode, tie-breaker column) than offset math.

### Option B: Offset/limit pagination
- `GET /channels/:nickname/videos?page=<n>&limit=<n>`, backed by TypeORM's `skip`/`take`.
- **Pros:** Simplest to implement and test; trivially supports a numbered-page UI if either list ever wants that instead of "load more".
- **Cons:** Can skip or duplicate a row if a video is inserted/removed between two page requests for the *same* list — a real but low-stakes risk here, since both lists this phase introduces are scoped to one channel's own videos (bounded, low insert-rate per channel), not the global, high-concurrency feed Phase 07's home page will need.

**Recommendation:** **Option B** — both lists this phase introduces are channel-scoped, where the concurrent-insert instability Option A protects against is a low-probability, low-impact edge case; simplicity now matches this project's principle against designing for hypothetical future requirements. Phase 07's home page — a global, much higher-traffic feed — is the point where Option A's stability guarantee starts to matter, and can be adopted there without this phase's channel-scoped endpoints needing to change.

**Decision:** B (Offset/limit pagination)

---

## TD-06: Frontend List Data-Fetching & Pagination Pattern

**Scope:** Frontend

**Capability:** Transversal — covers: "Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)", "Public channel page with information and video listing"

**Context:** Every screen `next-frontend/` has shipped so far (`phase-02-auth-frontend`) is a one-shot form submission — no screen has fetched or displayed a paginated *list* yet. This phase's dashboard and public channel page are the first, and TD-05 above settles the wire contract they call against. This decision picks how the App Router screens consume that contract — a client-side data-fetching library, or the framework's own server-first primitives — following the same reasoning this project has used since `phase-02-auth-frontend/TD-01` (a framework/BFF primitive, not a generic client-state library, where it was sufficient).

**Options:**

### Option A: TanStack Query (`@tanstack/react-query`)
- A `QueryClientProvider` wraps the dashboard's client-component subtree; `useQuery`/`useInfiniteQuery` fetch pages against the BFF Route Handler, and video edit/publish mutations call `queryClient.invalidateQueries` on success to refresh the list without a full page reload.
- **Pros:** Purpose-built for exactly this shape of problem (paginated lists + refresh-on-mutation UX); the richest "load more"/infinite-scroll ergonomics of the three options.
- **Cons:** A new client-side cache layer this app has not needed until now — every prior data need (session, one-shot form submissions) was solved by the App Router's own server-first tools without it; introduces a second cache (RSC's `fetch` cache vs TanStack's client cache) to reason about together.

### Option B: SWR
- Functionally similar to Option A, from the Next.js/Vercel ecosystem.
- **Pros:** Lighter-weight than TanStack Query, same problem resolved with less API surface.
- **Cons:** Same new-cache-layer concern as Option A, with less rich pagination/mutation-invalidation ergonomics out of the box.

### Option C: Server Component fetch + `searchParams`, no client-side cache
- The dashboard/public-page Server Component reads `?page=` from `searchParams` and fetches that page server-side; navigation is a plain `<Link href="?page=n+1">` (or a small client "Load more" button calling `router.push`); a successful edit/publish mutation relies on `router.refresh()` (or `revalidatePath`) to refetch the current page server-side.
- **Pros:** Zero new dependency; consistent with the App Router's server-first idiom this app has followed exclusively so far (session propagated server-side per `phase-02-auth-frontend/TD-06`); no second cache layer to keep in sync with the RSC fetch cache.
- **Cons:** Each page change or post-mutation refresh is a full segment re-render rather than a fine-grained client-cache update — acceptable for a moderate, channel-scoped list, less smooth than Options A/B for a true infinite-scroll feel.

**Recommendation:** **Option C** — every screen shipped in this project so far has favored the App Router's server-first primitives over a client-side cache library, and this phase's lists are channel-scoped and moderate in size, not the global feed Phase 07 will eventually build; introducing TanStack Query or SWR now would add a second cache abstraction this phase's scope does not need. Revisit for Phase 07's home page if that phase's UX genuinely calls for infinite scroll or optimistic interactions Option C cannot express well.

**Decision:** C (Server Component + `searchParams`, no client cache)

---

## Decisions Summary

| ID | Scope | Decision | Recommendation | Choice |
|----|-------|----------|---------------|--------|
| TD-01 | Cross-layer | Video category data model & exposure | A (PostgreSQL enum column, mirrors `VideoStatus`) | A |
| TD-02 | Cross-layer | Video publication state model (draft → publish & visibility) | A (`published_at` + `visibility`, new `VideoPublicationService`) | A |
| TD-03 | Cross-layer | Custom thumbnail upload protocol & storage strategy | A (`FileInterceptor` + `ParseFilePipe`) | A |
| TD-04 | Cross-layer | Channel nickname collision handling on edit | B (409 Conflict + inline field error) | B |
| TD-05 | Cross-layer | Pagination strategy for video & channel listings | B (Offset/limit) | B |
| TD-06 | Frontend | Frontend list data-fetching & pagination pattern | C (Server Component + `searchParams`, no client cache) | C |
