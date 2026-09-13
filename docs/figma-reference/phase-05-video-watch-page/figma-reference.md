---
kind: figma-reference-prefetch
project_plan_phase: "Phase 05 — Video Watch Page"
guessed_slug: video-watch-page
captured: "2026-09-13"
figma_file: "https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão"
status: pre-collected — no /plan-phase run yet for this phase
---

# Phase 05 — Video Watch Page — Figma Reference (pre-collection)

**Read `docs/figma-reference/README.md` first** for why this lives outside `docs/phases/` and what to do with it once `/plan-phase` runs for real.

## Contents

- `figma-assets/raw/video-show-39-1013.RAW.txt` — full, verbatim `get_design_context` output for the "Video show" frame (node `39:1013`), fileKey `40c57EfcNjN6u5St7n5SlG`. This is the ONLY frame found in the Figma file matching project-plan.md's Phase 05 description (player, description, suggestions sidebar, anonymous access, download).
- `figma-assets/icons/*.svg` — 8 new icon assets downloaded (Figma URLs expire ~2026-09-20).

## Layout note — no persistent left sidebar

Unlike every other screen captured so far (dashboard, channel settings, channel show, home), **this frame has no `aside`/left-nav sidebar** — the `main` content area starts at `left:0` (full 1440px width minus nothing), not `left:256`. Layout is: header (56px) → main, split into a ~968px left column (player + title + channel row + description card + comments) and a 400px right column (category chips + suggested-videos list), no left nav. Confirm this is intentional (a focused "theater mode" layout) rather than an inventory/audit gap when this phase is actually planned — the Figma data is clear on this, it's not a fetch limitation.

## Screen structure (top to bottom, left column)

1. **Player** — `968×544.5px`, `rounded-[12px]`, `shadow-[0px_4px_6px...,0px_10px_15px...]` (note: this shadow doesn't match any of the project's named shadow tokens in `figma-audit.json` — `shadow-card`/`shadow-drawer-left`/`shadow-button-focus`/`shadow-showcase-card` — check against `app/globals.css`'s actual shadow utilities at implementation time, may need a new token or may map to `shadow-showcase-card` approximately, don't assume). The frame only shows a static poster-image placeholder (`imgImg`, `opacity-80`) — no play/pause/volume/progress-bar controls are visible in this static export (players usually render controls on hover/interaction in real implementations, or the Figma mock simply didn't include them). **This is a real gap**: project-plan.md explicitly requires "Video player with controls: play/pause, volume, and progress bar" but Figma shows none of that. Flag to the user when Phase 05 is planned — the player controls will need to be designed/decided independent of this Figma frame (likely via a library like a native `<video>` element with custom controls, or check if the project already has a player component from Phase 03's upload-preview flow).
2. **Title** — `h1`, bold 24px, 2-line wrap observed for a long title.
3. **Channel row**: 48px avatar + channel name (bold 16px) + verified checkmark (12px — same glyph as `verified-checkmark-icon.svg`, see "Not downloaded" note below) + "1.2M subscribers" (14px muted) + **Subscribe** button (`h-36 rounded-full bg-[red]`, pill) + action cluster on the right: split-button **Like/Dislike** (`h-44 rounded-full bg-[#272727]`, divided by a `border-r border-[#3f3f3f]` into a left "👍 24K" segment and a right icon-only dislike segment) + **Share** button (pill, icon+label) + **Download** button (pill, icon+label) + a small icon-only **more-options** button (pill, `w-31.75`, no label — likely a kebab/overflow menu for report/save-to-playlist etc., contents not shown in this frame).
4. **Description card** — `bg-[#272727] rounded-[12px]`, contains "1.2M views • Oct 15, 2023" + multi-line description text + "Show more" toggle button + a bottom fade-out gradient overlay (`from-transparent to-[#272727]`) hinting the description is clamped/collapsed by default (typical YouTube-style truncated-description pattern — confirms "expand/collapse" from project-plan.md).
5. **Comments section** — "4,256 Comments" (h2) + "Sort by" button (icon+label, dropdown trigger) + a comment-input row (40px avatar + underlined input "Add a comment...") + one example top-level comment (40px avatar, `@handle` + relative time, comment text, then a row of: like button+count, dislike button (no count shown), "Reply" pill button). **No expanded reply thread or pagination is shown** — see `docs/figma-reference/README.md` for why that's a product decision, not a missing fetch.

## Right column (suggested videos sidebar)

- Category filter chips: "All" (active, `bg-[#f1f1f1]` `rounded-[8px]`), "From WebDev Simplified", "React", "Node.js" (inactive, `bg-[#272727]` `rounded-[8px]`) — same `rounded-[8px]` chip family as the Phase 07 Home screen's category chips and the Phase 04 dashboard's "standard action button" finding (`--radius-2`/8px recurs across phases — increasingly looks like a real missing DS size, not a one-off).
- 5 suggested-video list items (160×96px thumbnail + title/channel/views·age), one item's channel name carries the same verified-checkmark icon as the main channel row.

## Header

Identical shared shell (hamburger, logo, global search, camera/create icon button, avatar) to every other screen — reuse already-downloaded icons from `docs/phases/phase-04-video-channel-management/figma-assets/icons/` and `docs/figma-reference/phase-07-home-search-wrapup/figma-assets/icons/`, do not re-fetch.

## New icons downloaded (`figma-assets/icons/`)

| File | Role |
|---|---|
| `video-like-thumbsup-icon.svg` | Like segment of the split like/dislike button |
| `video-dislike-thumbsdown-icon.svg` | Dislike segment of the split like/dislike button |
| `video-share-icon.svg` | Share button |
| `video-download-icon.svg` | Download button |
| `video-more-options-icon.svg` | Icon-only overflow/more-options button next to Download |
| `comments-sort-icon.svg` | "Sort by" comments control |
| `comment-like-icon.svg` | Per-comment like button |
| `comment-dislike-icon.svg` | Per-comment dislike button |

Not downloaded (reuse existing): the verified-checkmark icon next to channel names — same glyph already downloaded at `docs/figma-reference/phase-07-home-search-wrapup/figma-assets/icons/verified-checkmark-icon.svg`.

## Cross-reference for Phase 06 (Social Interactions)

The Like/Dislike button (video-level) and the comment Like/Dislike buttons in this same frame are Phase 06 scope functionally (even though they're visually present in this Phase 05 frame) — see `docs/figma-reference/phase-06-social-interactions/figma-reference.md`, which points back here instead of duplicating the raw data.
