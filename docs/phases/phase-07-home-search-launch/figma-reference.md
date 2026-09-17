---
kind: figma-reference-prefetch
project_plan_phase: "Phase 07 — Home Page, Search, and Wrap-up"
guessed_slug: home-search-wrapup
captured: "2026-09-13"
figma_file: "https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão"
status: pre-collected — no /plan-phase run yet for this phase
---

# Phase 07 — Home, Search, Wrap-up — Figma Reference (pre-collection)

**Read `docs/figma-reference/README.md` first.**

## Contents

- `figma-assets/raw/home-catalog-show-39-379.RAW.txt` — full, verbatim `get_design_context` output for "Home (Catalog Show)" (node `39:379`) — the home feed grid + category filter bar.
- `figma-assets/raw/account-user-menu-39-1513.RAW.txt` — annotated `get_design_context` output for "Account User Menu" (node `39:1513`) — the avatar dropdown/slide-over panel (Edit Channel / Sign Out). General nav chrome, relevant to this phase's "Header/navbar ... navigation" scope.
- "Left Menu" (node `39:1294`) was also checked — it's a duplicate rendering of the same sidebar already captured everywhere else (Home/Subscriptions/Your videos/Liked videos nav), just at a slightly different width (280px vs 263px elsewhere — likely an earlier design iteration left in the file). **No new data or icons** — not worth its own raw file.
- `figma-assets/icons/*.svg` — 6 new icon assets (Figma URLs expire ~2026-09-20).

## Home screen structure

- **Category filter bar** (sticky-looking, `bg-[rgba(15,15,15,0.95)]`, border-b): "All" (active, `bg-[#f1f1f1]` `rounded-[8px]`) + 10 inactive pill-ish chips (`bg-[#272727]` `rounded-[8px]`): Gaming, Music, Live, Mixes, Programming, Podcasts, News, Recently uploaded, Watched, New to you. Same `rounded-[8px]` (`--radius-2`) chip shape already flagged as a cross-phase recurring gap in Phase 04's `figma-reference.md` — reuse whatever DS fix gets made there, don't re-derive.
- **Video grid**: 4 columns × 2 rows visible (8 of what's presumably a longer/infinite-scrolling feed), `266×245.625px` cards (`rounded-[12px]` thumbnail, 36px circular avatar, title/channel/views·age below). One card shows a red `LIVE` badge (`bg-[#dc2626]`) with a small icon + "24K watching" instead of view count/age — confirms Phase 07 needs to handle a live-broadcast card variant, not just static VOD cards (not called out explicitly in project-plan.md's bullet list — flag this when planning, it's a real state the design shows that the plan prose doesn't mention).
- **Infinite-scroll loading spinner** at the bottom of the grid (`infinite-scroll-loading-spinner.svg`) — confirms "Pagination or infinite scroll" from project-plan.md leans toward infinite scroll in this design, not classic numbered pagination (contrast with the Phase 04 dashboard, which DOES show numbered pagination — two different pagination patterns exist across the file, don't assume one covers both).
- Some channel names carry a small verified-checkmark badge (`verified-checkmark-icon.svg`) — not mentioned in project-plan.md at all; a "verified channel" concept may or may not be in scope for this project — flag to the user rather than silently building it.

## Header + sidebar

Identical shared shell to every other screen (hamburger, logo, global search bar, camera/create icon, avatar; sidebar Home/Subscriptions/Your videos/Liked videos + Subscriptions list + "Show 12 more") — reuse icons already downloaded in `docs/phases/phase-04-video-channel-management/figma-assets/icons/`, do not re-fetch.

## Account User Menu (avatar dropdown)

Clicking the header avatar opens a **right-anchored slide-over panel** (320px, `bg-[#272727]`, drop-shadow, over a `bg-[rgba(0,0,0,0.7)]` full-screen backdrop) — NOT a simple corner dropdown. This is a new UI pattern relative to phases 01-04; check for an existing shadcn `sheet.tsx`/`drawer.tsx` in `next-frontend/components/ui/` before implementing (`npx shadcn@latest add sheet` if absent — Radix Dialog-based side panel is the closest primitive). Contents: "Account" header + close (X) + avatar/name/handle + "Edit Channel" (→ likely `/dashboard/channel`, Phase 04) + "Sign Out" (→ likely the existing Phase 02 logout flow). Only 2 menu items shown — don't invent more without asking.

## New icons downloaded (`figma-assets/icons/`)

| File | Role |
|---|---|
| `verified-checkmark-icon.svg` | Small checkmark badge next to some channel names (Home grid + reused in Phase 05's channel row) |
| `live-badge-camera-icon.svg` | Icon inside the red "LIVE" badge on a live-broadcast card |
| `infinite-scroll-loading-spinner.svg` | Bottom-of-grid loading indicator |
| `account-menu-close-icon.svg` | Close "X" button on the account slide-over panel |
| `account-menu-edit-channel-icon.svg` | "Edit Channel" menu item icon |
| `account-menu-signout-icon.svg` | "Sign Out" menu item icon |

## What's still open (not a Figma gap — needs a product/planning decision)

- No dedicated **search results** frame was found anywhere in the file — see `docs/figma-reference/README.md`.
- The **live-broadcast card variant** and the **verified-channel badge** are visible in Figma but not mentioned in project-plan.md's Phase 07 bullet list — surface both to the user when this phase is planned; don't assume either is in scope just because the design shows it, and don't silently drop them either.
