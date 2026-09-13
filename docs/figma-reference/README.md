# Figma pre-collection — Phases 05, 06, 07

Pre-fetched Figma data for phases that have **not been planned yet** (no `/plan-phase` run, no `docs/phases/phase-0N-*/` folder exists for these). Gathered 2026-09-13 at the user's request, alongside the Phase 04 pre-collection (`docs/phases/phase-04-video-channel-management/figma-reference.md`), so that once these phases are actually planned and implemented, `/implement` does not need to call the Figma MCP again for routine cases.

**Why this lives outside `docs/phases/`:** that directory's naming (`phase-0N-{slug}`) is owned by the `/plan-build` pipeline, and the real slug it picks for phases 05/06/07 may differ from the ones guessed here (`video-watch-page`, `social-interactions`, `home-search-wrapup`) — compare how Phase 02's folders (`phase-02-auth`, `phase-02-auth-frontend`) don't mechanically match its project-plan title ("Registration, Login, and Account Management"). **When `/plan-phase` actually runs for one of these phases, move that phase's subfolder here into the real `docs/phases/phase-0N-{real-slug}/` folder** (as `figma-reference.md` + `figma-assets/`, same shape as Phase 04's), rather than re-fetching from Figma.

## Folders

- `phase-05-video-watch-page/` — Phase 05 (Video Watch Page). Primary frame: "Video show" (node `39:1013`).
- `phase-06-social-interactions/` — Phase 06 (Likes, Comments, Subscriptions). **No dedicated Figma frame** — its UI is embedded inside Phase 05's "Video show" frame (comments, like/dislike) and Phase 04's "Channel show" frame (subscribe button, already captured at `docs/phases/phase-04-video-channel-management/figma-assets/raw/channel-show-39-30.reference.txt`). See this folder's `figma-reference.md` for the exact pointers.
- `phase-07-home-search-wrapup/` — Phase 07 (Home Page, Search, and Wrap-up). Primary frame: "Home (Catalog Show)" (node `39:379`), plus two supplementary nav-chrome states: "Account User Menu" (node `39:1513`, the avatar dropdown/slide-over) and "Left Menu" (node `39:1294`, a duplicate/reference rendering of the same sidebar already captured — no new data).

## What was deliberately NOT captured

- The public channel page's "About" tab content — confirmed out of scope for Phase 04's UI Contract; if a future phase's plan puts channel "About" info in scope, that tab's content still hasn't been fetched.
- Any comment-thread pagination, nested-reply depth beyond 1 level, or moderation UI — the Figma frame only shows one top-level comment with a "Reply" action, no expanded reply thread. Phase 06's plan will need to make a product call here; it's not something re-fetching Figma would resolve (the design doesn't show it).
- Search **results** page — Phase 07's project-plan bullet is "Search bar (search by title and channel)"; no distinct Figma frame for a dedicated results page was found in this file's node list. It may reuse the Home grid layout with a filtered query, or may need a design that doesn't exist yet — flag this when Phase 07 is actually planned, don't assume.
