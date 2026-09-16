---
scope_type: phase
related_phases: [6]
status: decided
date: 2026-09-14
scope_description: "Likes/dislikes on videos and comments, nested comments, channel subscriptions, followed-channels area, and subscriber counts."
---

# Technical Decisions — Social Interactions (Likes, Comments, Subscriptions)

_Subprojects in scope:_

- `nestjs-project/` — owns the new reaction, comment, and subscription entities/migrations, their counter-consistency mechanism, and the endpoints that expose them (like/dislike toggle, comment CRUD-read + create, subscribe/unsubscribe, followed-channels listing).
- `next-frontend/` — wires the already-scaffolded UI surfaces (the `video-show` frame's like/dislike split button and comments section from `phase-05-video-watch-page`, and the `channel-show` frame's Subscribe button and subscriber-count display from `phase-04-video-channel-management`, both currently placeholder/undefined props) to the new endpoints, plus builds the one net-new UI surface this phase introduces: the followed-channels quick-access area.

Per `docs/figma-reference/phase-06-social-interactions/figma-reference.md`, no new screens exist in the Figma file for this phase — every capability below is either wiring into an existing frame (video watch page, channel page) or a small new element (the followed-channels area) with no dedicated frame, so this document has no visual-shell TDs, only data-model, API-shape, and interaction-pattern decisions.

---

## TD-01: Counter Consistency Strategy (likes, dislikes, comment counts, subscriber counts)

**Scope:** Backend

**Capability:** Transversal — covers: "Like and dislike on videos (authenticated users)", "Like and dislike on comments (authenticated users)", "Subscriber count on the channel page"

**Context:** Every count this phase introduces or fills in (a video's like/dislike totals, a comment's like/dislike totals, a channel's subscriber total, and the video dashboard's still-placeholder "comments" column from `phase-04-video-channel-management`) is derived from a growing table of individual rows (reactions, subscriptions, comments). `phase-05-video-watch-page/TD-02` already solved an identical shape of problem for `videos.views` with an atomic `UPDATE ... RETURNING`; this TD decides whether every new count in this phase follows that same precedent or takes a different path.

**Options:**

### Option A: Denormalized atomic counter columns
- Add `likes_count`/`dislikes_count` to `videos` and `comments`, `subscribers_count` to `channels`; every insert/update/delete of a reaction, comment, or subscription row updates the counter in the same transaction via an atomic `UPDATE ... SET count = count + 1 RETURNING count` (the exact pattern already shipped for `views`).
- **Pros:** O(1) read on every hot path (watch page load, channel page load) with no aggregate query; reuses a pattern already proven and tested in this codebase; consistent under concurrent writes (same atomicity guarantee `views` already has).
- **Cons:** One more column to keep in sync per write path; a bug in any single write path (e.g., a comment delete not yet in scope, but a future one) can drift the counter from the true row count.

### Option B: Computed aggregate at read time
- No counter columns; every read does `COUNT(*)` (or `COUNT(*) FILTER (WHERE type = 'like')`) against the reactions/comments/subscriptions table, joined into the video/comment/channel response.
- **Pros:** Always exactly correct, no dual-write to keep in sync, no migration needed if a future phase adds a way to remove a reaction/comment/subscription.
- **Cons:** Every video-watch-page load and channel-page load now runs 3-4 extra aggregate queries instead of reading a column already on the row; more expensive at the exact traffic pattern (`GET /videos/public/:publicId`, already the most-called endpoint per `phase-05` traffic) this project has been most careful about (view-count atomicity was worth a dedicated TD there).

**Recommendation:** **Option A** — this project already chose and shipped the denormalized-atomic-counter pattern for the structurally identical `views` problem one phase ago; reusing it keeps one consistency strategy for "count of things that reference this row" across the whole app, and avoids adding 3-4 aggregate queries to the watch-page and channel-page hot paths.

**Decision:** A (Denormalized atomic counter columns)

---

## TD-02: Social Relation Data Model — Dedicated Tables vs. Polymorphic Association

**Scope:** Backend

**Capability:** Transversal — covers: "Like and dislike on videos (authenticated users)", "Like and dislike on comments (authenticated users)", "Channel subscriptions (follow/unfollow)"

**Context:** This phase introduces three new "one user relates to one target" tables: video reactions, comment reactions, and channel subscriptions. Every existing relation in the codebase (`videos.user_id`, `videos.channel_id`, `channels.user_id`) is a direct, single-purpose foreign key — no polymorphic association exists anywhere in `nestjs-project/`. This TD settles whether the two reaction tables (video vs. comment) share one generic table or stay separate, since that choice also sets the precedent subscriptions follows.

**Options:**

### Option A: Dedicated per-domain tables (`video_reactions`, `comment_reactions`, `subscriptions`)
- Three plain tables, each with a real FK (`video_id → videos.id`, `comment_id → comments.id`, `channel_id → channels.id`) plus `user_id`, and a composite unique index (e.g., `unique(user_id, video_id)`) enforcing one reaction per user per target at the database level.
- **Pros:** Matches every existing relation pattern in the codebase exactly (real FK constraints, `ON DELETE CASCADE` support, TypeORM `@ManyToOne` with full type safety); the DB itself rejects an orphaned or duplicate reaction, no application-level guard needed.
- **Cons:** Three near-identical tables/entities/repositories instead of one; adding a fourth reactable type later means a fourth table.

### Option B: Single polymorphic `reactions` table (`target_type` enum + `target_id` uuid)
- One `reactions` table serves both video and comment likes/dislikes; `target_type: 'video' | 'comment'` disambiguates which entity `target_id` points to. Subscriptions could reuse the same shape with `target_type: 'channel'`.
- **Pros:** One table/entity for all "user reacts to X" relations, less schema surface to add if a future reactable type appears.
- **Cons:** `target_id` cannot carry a real foreign-key constraint (it points to different tables depending on `target_type`), so the database can no longer reject an orphaned or mistyped reaction — that check moves into application code; breaks from every existing relation in this codebase, which is a real inconsistency cost for a project with only three reactable types, not an open-ended plugin system.

**Recommendation:** **Option A** — the codebase has never used a polymorphic association, real FK constraints are exactly the kind of database-enforced correctness this project has favored throughout (e.g., the `videos_status_enum`/`videos_category_enum` Postgres enums, the `channels.user_id` unique-one-to-one constraint), and three concrete tables for three concrete features is not premature abstraction avoidance — it is the simpler option outright.

**Decision:** A (Dedicated per-domain tables)

---

## TD-03: Toggle-Action API Design & Idempotency (reactions & subscriptions)

**Scope:** Cross-layer

**Capability:** Transversal — covers: "Like and dislike on videos (authenticated users)", "Like and dislike on comments (authenticated users)", "Channel subscriptions (follow/unfollow)"

**Context:** Both the reaction buttons (three states: like, dislike, none) and the Subscribe button (two states: subscribed, not) are clicked repeatedly by the same user, sometimes as a correction (like → dislike, subscribe → unsubscribe). The HTTP contract shape decided here directly drives how the frontend button component tracks and sends state, and how safely a double-click or retry behaves — this is why it is a `Cross-layer` decision rather than a backend-only implementation detail.

**Options:**

### Option A: Idempotent "set state" endpoint (`PUT`)
- `PUT /videos/:publicId/reaction` with body `{ type: 'like' | 'dislike' | null }` (and analogously `PUT /channels/:nickname/subscription` with `{ subscribed: boolean }`) — the client always sends the state it wants to end up in; the server upserts or deletes the row to match.
- **Pros:** Naturally idempotent (repeating the same request is safe, matches `PUT`'s HTTP semantics); the frontend only needs to know "what should this look like after the click," which is exactly what an optimistic UI update needs to compute *before* the request resolves.
- **Cons:** One endpoint has to handle three code paths (create, flip type, delete) instead of one.

### Option B: Action-oriented endpoints (`POST .../like`, `POST .../dislike`, `DELETE .../reaction`)
- Three explicit endpoints per reaction target, mirroring typical REST-resource CRUD.
- **Pros:** Each endpoint does exactly one thing, simple to read individually.
- **Cons:** The frontend button now needs three different request shapes for what is conceptually one three-state toggle; switching from "like" to "dislike" is two requests (`DELETE` then `POST`) unless the backend special-cases it, reintroducing the same "handle the flip" logic Option A keeps in one place anyway.

### Option C: Single toggle endpoint (`POST .../reaction/toggle`)
- One `POST` that flips the current user's reaction based on server-side current state only; the client sends no target state, just "the like button was clicked."
- **Pros:** Simplest possible client call, no state duplication in the request body.
- **Cons:** Not idempotent — a retried request (network blip, double-submit) silently flips the state twice, landing back where it started but reporting a false success; actively hostile to optimistic UI, since the client cannot predict the resulting state without already knowing the server's current state (which is the exact problem optimistic UI exists to route around).

**Recommendation:** **Option A** — idempotency matters here specifically because `TD-06` below is expected to use optimistic UI, and an idempotent "set state" call is the only one of the three options where the client-computed optimistic state and the eventual server-confirmed state are the same request/response shape, with no separate reconciliation logic needed.

**Decision:** A (Idempotent "set state" endpoint — `PUT`)

---

## TD-04: Nested Comments — Data Model, Depth Policy & Fetch Strategy

**Scope:** Cross-layer

**Capability:** Transversal — covers: "Comments on videos (authenticated users)", "Replies to comments (nested comments)"

**Context:** `docs/project-plan.md` § Points of Attention explicitly flags this as undecided: "Nested comments: define how many reply levels will be allowed to keep the interface organized." The Figma source (per `docs/figma-reference/phase-06-social-interactions/figma-reference.md`) shows a "Reply" button but no expanded/nested thread — the interface itself gives no hint of the intended depth, so this is a green-field decision. It has two coupled halves: how deep nesting is allowed to go (data model), and whether replies are returned together with their parent comment or fetched separately (API shape, which the frontend's recursive rendering depends on directly).

**Options:**

### Option A: Single-level replies (YouTube-classic), adjacency list capped at depth 1
- A `comments` table with a nullable `parent_comment_id` self-FK. Application logic rejects a reply-to-a-reply (a comment whose `parent_comment_id` is already non-null cannot itself be targeted by a new reply) — enforced in the service layer, not the schema. Top-level comments and their replies are returned together in one response per page of top-level comments (e.g., each top-level comment embeds its `replies: Comment[]`).
- **Pros:** Matches the platform most users compare this product to; the frontend renders exactly two visual levels (comment, reply), no recursive component needed; one paginated query for top-level comments plus one bounded-size query for their replies (a video-scoped comment section is never large enough to need separate reply pagination).
- **Cons:** Rejecting deeper replies is an application-level rule, not a schema constraint — a future relaxation requires a code change, not just a data migration (acceptable, since TypeORM's own tree strategies below have the opposite trade-off).

### Option B: Unlimited depth via TypeORM `@Tree('closure-table')` or `@Tree('materialized-path')`
- TypeORM's native tree entity support (`@Tree`, `@TreeParent`, `@TreeChildren`) models arbitrarily deep threads, with `closure-table` optimized for fast subtree reads via an auxiliary closure table, or `materialized-path` storing an ancestor path string per row.
- **Pros:** No depth ceiling to revisit later; TypeORM's `TreeRepository.findDescendantsTree()` gives ready-made recursive-fetch helpers.
- **Cons:** Introduces a tree-repository pattern this codebase has never used, for a capability (comments) whose UI has no visual precedent showing more than one nesting level; the frontend would need a genuinely recursive rendering component for a depth no design or product requirement calls for — the definition of the "extrapolation" this project's `implement` step is instructed to avoid.

**Recommendation:** **Option A** — single-level replies is both the simpler data model and the one every comparable video-platform UI (including this one's stated inspiration) actually ships; nothing in the project plan or the Figma source calls for deeper threads, so `Option B`'s unlimited-depth machinery would be built against a requirement that does not exist.

**Decision:** A (Single-level replies, adjacency list capped at depth 1)

---

## TD-05: Followed-Channels Feature Surface & Data Shape

**Scope:** Cross-layer

**Capability:** "Followed-channels area with quick access to their videos"

**Context:** Per `docs/figma-reference/phase-06-social-interactions/figma-reference.md`, the Figma file only shows this list inside a persistent left sidebar present across every authenticated screen — but no phase so far has built any persistent sidebar or header/nav shell (`phase-05-video-watch-page/progress.md` explicitly notes skipping the header/nav bar as out-of-capability "generic template chrome," and `docs/project-plan.md` assigns the header/navbar itself to Phase 07). Building a persistent-sidebar shell now, one phase ahead of the navigation chrome it would live in, is a real architectural choice this TD needs to settle rather than copy uncritically from the visual reference.

**Options:**

### Option A: Dedicated `/subscriptions` (or similar) page
- A standalone route listing every channel the current user follows, each entry linking to that channel's page (which already lists its videos, per `phase-04-video-channel-management`); "quick access to their videos" is satisfied by one click through to the channel page rather than an inline video list.
- **Pros:** No new shared layout/shell needed — follows this project's established pattern (every screen so far is a self-contained route, per `phase-05-video-watch-page/progress.md`'s own precedent of skipping shared chrome); the backing endpoint is a straightforward paginated list, reusing `phase-04-video-channel-management/TD-05`'s offset/limit convention.
- **Cons:** Not "in every screen's sidebar" the way the Figma reference visually depicts it — reaching it requires a navigation link, which does not fully exist until Phase 07's navbar ships (mitigated by linking it directly from wherever an authenticated user's own entry points already are, e.g., the dashboard).

### Option B: Persistent sidebar shell embedded now, ahead of Phase 07
- Build the shared left-sidebar layout (subscriptions list + "Show N more") this phase, wrapping every authenticated route, matching the Figma reference literally.
- **Pros:** Visually matches Figma exactly; Phase 07 would only need to add the header/navbar on top of an already-existing shell.
- **Cons:** Builds shared cross-cutting layout infrastructure (a persistent sidebar wrapping every route) inside a phase whose own capability list is only about comments/likes/subscriptions — a Single-Responsibility violation of the kind `CLAUDE.md` calls out to re-evaluate at every step, and duplicates work Phase 07 (which owns "Header/navbar with logo, search bar, login/avatar button, and navigation") is explicitly scoped to do.

**Recommendation:** **Option A** — matches this project's own precedent of not building shared navigation chrome before the phase that owns it (Phase 07), keeps this phase's scope limited to the social-interaction capabilities it is actually responsible for, and still satisfies the literal capability text ("quick access to their videos" via one click into the channel's existing video listing).

**Decision:** A (Dedicated `/subscriptions` page)

---

## TD-06: Frontend Interaction Pattern for Social Actions (optimistic UI)

**Scope:** Frontend

**Capability:** Transversal — covers: "Like and dislike on videos (authenticated users)", "Comments on videos (authenticated users)", "Replies to comments (nested comments)", "Like and dislike on comments (authenticated users)", "Channel subscriptions (follow/unfollow)", "Complete comments, likes, and subscriptions interface"

**Context:** `phase-04-video-channel-management/TD-06` chose Server Components + `searchParams` with no client-side cache for every list this app has shipped so far, explicitly flagging that choice for revisit "if that phase's UX genuinely calls for infinite scroll or optimistic interactions Option C cannot express well." A like button that only updates after a full round trip (or a full-page `router.refresh()`) reads as broken to a user clicking it — this phase is the first to introduce interactions where instantaneous feedback is part of the expected UX, so the deferred question comes due now. React 19 (already the installed version, confirmed via Context7) ships `useOptimistic` natively for exactly this shape of problem.

**Options:**

### Option A: React 19 `useOptimistic` + Route Handler `PUT`/`POST` + `router.refresh()`
- Each interactive element (reaction button, subscribe button, comment form) is a small client island using `useOptimistic(currentServerState, reducer)` to render the assumed end-state immediately on click, calls the BFF Route Handler (per `TD-03`'s idempotent contract) inside `startTransition`, and reconciles by revalidating the server-derived state on success or reverting the optimistic value on error.
- **Pros:** Zero new dependency — `useOptimistic` is a React 19 built-in, consistent with this project's stated preference against adding a client-cache library when the platform's own primitives suffice (`phase-04-video-channel-management/TD-06`'s reasoning, `phase-02-auth-frontend/TD-01`'s reasoning); gives the exact instant-feedback UX this phase's interactions need without a second cache layer.
- **Cons:** `useOptimistic`'s setter must be called inside a transition (`startTransition` or a `useTransition`-wrapped handler) or it throws — a real but small correctness rule to apply consistently across every social-action component in this phase (comment submit, reaction toggle, subscribe toggle).

### Option B: TanStack Query (`@tanstack/react-query`)
- Wrap the relevant subtree in a `QueryClientProvider`; mutations use `useMutation` with `onMutate` optimistic updates and `queryClient.setQueryData`/`invalidateQueries` for reconciliation.
- **Pros:** Mature, well-documented optimistic-mutation recipe; also solves the "load more"/pagination ergonomics this project has deferred since Phase 04 in one move.
- **Cons:** Introduces the exact new client-cache layer this project has twice declined to add (`phase-04-video-channel-management/TD-06`, implicitly `phase-02-auth-frontend/TD-01`) specifically because the App Router's own primitives were judged sufficient — adopting it now for comments/likes while the rest of the app (including this same phase's followed-channels list, per `TD-05`) stays on Server Component + `searchParams` creates two competing data-fetching philosophies side by side.

### Option C: Plain mutation + `router.refresh()`, no optimistic state
- Click → `fetch` the Route Handler → on success, `router.refresh()` to re-render the Server Component with the new server state; no client-side prediction of the result.
- **Pros:** Simplest possible implementation, zero new patterns.
- **Cons:** Visibly laggy for a like/subscribe button — the click produces no visual change until the full round trip and re-render complete, which is the specific gap `phase-04-video-channel-management/TD-06` flagged as Option C's limit ("optimistic interactions Option C cannot express well").

**Recommendation:** **Option A** — it is the only option that delivers the instant-feedback UX this phase's interactions genuinely need without introducing the client-cache-library trade-off this project has twice declined for lesser reasons; it also keeps `TD-05`'s followed-channels list and this phase's reaction/comment/subscribe islands on the same "App Router primitives first" philosophy the rest of the app already follows.

**Decision:** A (React 19 `useOptimistic` + Route Handler + `router.refresh()`)

**Renders in:** frontend-runtime

---

## Decisions Summary

| ID | Scope | Decision | Recommendation | Choice |
|----|-------|----------|---------------|--------|
| TD-01 | Backend | Counter consistency strategy (likes/dislikes/comments/subscribers) | A (Denormalized atomic counters) | A |
| TD-02 | Backend | Social relation data model (dedicated vs. polymorphic tables) | A (Dedicated per-domain tables) | A |
| TD-03 | Cross-layer | Toggle-action API design & idempotency (reactions & subscriptions) | A (Idempotent `PUT` set-state) | A |
| TD-04 | Cross-layer | Nested comments data model, depth policy & fetch strategy | A (Single-level replies) | A |
| TD-05 | Cross-layer | Followed-channels feature surface & data shape | A (Dedicated `/subscriptions` page) | A |
| TD-06 | Frontend | Frontend interaction pattern for social actions | A (React 19 `useOptimistic`) | A |
