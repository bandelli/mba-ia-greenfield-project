# phase-05-video-watch-page — Screen Inventory

> **Phase:** Phase 05 — Video Watch Page
> **Status:** Validated
> **Date:** 2026-09-13
> **Screens in scope:** 1

---

## Screen: Video Watch Page

**Route:** `/watch/[publicId]`
**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-1013 (node `40c57EfcNjN6u5St7n5SlG:39:1013`)
**Purpose (from project-plan.md):** "Page where the user watches the video with a functional player, description, suggestions, and anonymous access."

### Component inventory

| Component (Figma node) | Type | In DS? | Reuse? | Notes |
|---|---|---|---|---|
| VideoPlayer (39:1028) | Server-connected | ✗ | `components/video/video-player.tsx (new)` | Fetches a presigned stream URL (`phase-05-video-watch-page/TD-01`); renders a native `<video>` + custom controls (`phase-05-video-watch-page/TD-04`). Figma shows only a static poster image — no controls are visible in the export. |
| VideoTitle (39:1040) | Presentational | ✗ | new | `h1`, video title text from page data. |
| ChannelAvatar (39:1092) | Presentational | ✗ | new | 48px circular avatar image. |
| ChannelNameRow (39:1093, verified badge 39:1180) | Presentational | ✗ | new | Channel name + verified checkmark. |
| SubscriberCount (39:1141) | Presentational | ✗ | new | "1.2M subscribers" text. |
| SubscribeButton (39:1094) | Presentational | ✓ | `components/ui/button.tsx` | Pill variant (existing). Phase 06 scope ("Channel subscriptions (follow/unfollow)") — inert stub, no `onClick`, matching the established Phase-06-deferred pattern already used for `channel-public-page.tsx`'s Subscribe button in Phase 04. |
| LikeDislikeSplitButton (39:1095) | Presentational | ✗ | `components/video/like-dislike-button.tsx (new)` | Composite split-pill (two segments) built on top of `icon-button.tsx`. Phase 06 scope ("Like and dislike on videos") — inert stub, same pattern as SubscribeButton. |
| ShareButton (39:1096) | Presentational | ✓ | `components/ui/button.tsx` | Pill w/ icon+label (existing). No capability describes sharing — rendered as an inert stub (no `onClick`), same pattern as SubscribeButton, per user decision. |
| DownloadButton (39:1097) | Server-connected | ✓ | `components/ui/button.tsx` | Pill w/ icon+label (existing). Fetches the public download-url (`phase-05-video-watch-page/TD-01`). |
| MoreOptionsButton (39:1098) | Presentational | ✓ | `components/ui/icon-button.tsx` | Icon-only (existing). Submenu contents unknown — rendered as an inert stub (no `onClick`/menu), per user decision. |
| DescriptionCard (39:1043) | Presentational | ✗ | `components/video/description-card.tsx (new)` | Container for views/date row, description text, and expand toggle. |
| ViewCountAndDate (39:1068) | Server-connected | ✗ | new | "1.2M views • Oct 15, 2023" — view count from `phase-05-video-watch-page/TD-02`; plain text row inside DescriptionCard, no separate file. |
| DescriptionExpandToggle (39:1070) | Local-interactive | ✓ | `components/ui/button.tsx` | Ghost/link-style toggle (existing). "Show more" — pure client-side clamp/expand of already-loaded description text; no backend I/O. |
| CommentsSectionStub (39:1044 and descendants: count 39:1103, sort-by 39:1104, comment input 39:1073, comment item 39:1074) | Presentational | ✗ | `components/video/comments-section-stub.tsx (new)` | Entire comments block (count, sort control, input, one example comment with like/dislike/reply) is Phase 06 scope ("Comments on videos", "Replies to comments", "Like and dislike on comments") — inert stub for Phase 05, same pattern as SubscribeButton. |
| SuggestedVideoCard (39:1049, ×5 instances: 39:1049/1050/1051/1052/1053) | Server-connected | ✗ | `components/video/suggested-video-card.tsx (new)` | Thumbnail + duration badge + title + channel + views + age. Fetches same-category suggestions (`phase-05-video-watch-page/TD-03`). Visually similar to `channel-public-page.tsx`'s existing inline VideoCard pattern — consider reusing/extracting shared markup at implementation time (not mandated here). |
| Header/nav chrome (hamburger 39:1023, logo 39:1024, search 39:1019, create-icon 39:1026, avatar 39:1027) | Local-interactive | ✗ | new | Shared app-shell chrome; not yet extracted into a DS component in any phase so far — consistent with every prior inventory in this project (deferred to Phase 07's "general navigation"). |

### Verbs of intent

| Verb | Component | Capability (project-plan.md) |
|---|---|---|
| Reproduzir vídeo com controles de play/pause, volume e barra de progresso | VideoPlayer | "Video player with controls: play/pause, volume, and progress bar" |
| Carregar vídeo publicado (público ou não-listado) sem autenticação, via public_id | VideoPlayer | "Anonymous access to video viewing" |
| Disparar download do vídeo | DownloadButton | "Video download button" |
| Exibir contagem de visualizações do vídeo | ViewCountAndDate | "View count" |
| Exibir lista de vídeos sugeridos da mesma categoria | SuggestedVideoCard | "Suggested videos from the same category in the sidebar" |

### Observations

- **Layout (confirmed):** unlike every other screen inventoried so far (dashboard, channel settings, channel show), this frame has no persistent left nav sidebar — `main` starts at `left:0` (full 1440px width). Confirmed intentional "theater mode" layout for the watch page, matching the Figma source.
- **CategoryFilterChips** (node 39:1030: "All"/"From {channel}"/"React"/"Node.js") were present in the Figma frame but omitted from this inventory by user decision — no Phase 05 capability describes interactive category filtering, and `phase-05-video-watch-page/TD-03` already decided a fixed same-category/latest suggestion list. The sidebar renders `SuggestedVideoCard`s directly, with no filter row.
- **Description expand/collapse** (`DescriptionExpandToggle`) is Local-interactive with no backend I/O, so it has no row in the Verbs of intent table (that table is server-connected-only per the skill contract); it is still the component that satisfies the "Video description with expand/collapse" capability — see Reconciliation summary.
- **"Unlisted videos accessible only via direct link (not shown in listings)"** has no distinct UI on this screen — it renders identically for public and unlisted videos. The capability is satisfied entirely by backend authorization (`phase-05-video-watch-page/TD-01`), not by any component here.
- `SubscribeButton`, `LikeDislikeSplitButton`, and `CommentsSectionStub` are visually present in this Figma frame but functionally belong to Phase 06 (subscriptions, likes, comments) — rendered as inert stubs, matching the established Phase-06-deferred pattern already used for `channel-public-page.tsx` in Phase 04.
- The verified-checkmark icon is reused from `docs/figma-reference/phase-07-home-search-wrapup/figma-assets/icons/verified-checkmark-icon.svg` (not yet downloaded into `next-frontend/components/icons/` — needs to be added at implementation time).
- `get_design_context` for this node returned no Code Connect map entries, so every row defaults to `Reuse?: new` (`In DS?: ✗`) — consistent with every prior inventory in this project.
- Classification was done from the cached, verbatim `get_design_context` output already saved at `docs/figma-reference/phase-05-video-watch-page/figma-assets/raw/video-show-39-1013.RAW.txt` (pre-collected in an earlier session), not a fresh Figma MCP call — per the project's goal of not needing further Figma access during Phases 05–07 development. A fresh `get_screenshot` was not re-fetched for this run.

---

## Reconciliation summary

| Capability (project-plan.md) | Covered by | Screens |
|---|---|---|
| "Video player with controls: play/pause, volume, and progress bar" | VideoPlayer | `/watch/[publicId]` |
| "Page layout: main video + information + sidebar with suggestions" | VideoPlayer, VideoTitle, ChannelNameRow, DescriptionCard, SuggestedVideoCard (overall page composition) | `/watch/[publicId]` |
| "Video description with expand/collapse" | DescriptionCard, DescriptionExpandToggle | `/watch/[publicId]` |
| "View count" | ViewCountAndDate | `/watch/[publicId]` |
| "Suggested videos from the same category in the sidebar" | SuggestedVideoCard | `/watch/[publicId]` |
| "Anonymous access to video viewing" | VideoPlayer (public data fetch) | `/watch/[publicId]` |
| "Video download button" | DownloadButton | `/watch/[publicId]` |
| "Unlisted videos accessible only via direct link (not shown in listings)" | — _(no distinct UI; enforced by backend authorization only, see `phase-05-video-watch-page/TD-01`)_ | — |

## Open questions

_None — all four decisions raised during inventorying were resolved with the user (see Observations and the progress file's Decisions log)._
