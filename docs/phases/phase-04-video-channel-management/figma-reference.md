---
kind: figma-reference
phase: phase-04-video-channel-management
captured: "2026-09-13"
figma_file: "https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão"
---

# phase-04-video-channel-management — Figma Reference

Consolidated, pre-fetched Figma data for the 3 remaining screens of this phase (SI-04.9a/9b, SI-04.10a/10b, SI-04.11a/11b), gathered in one pass on 2026-09-13 (after the Figma MCP Starter rate limit was lifted by a plan upgrade) so implementation does not need to call the Figma MCP again. This file is the index — see the linked raw files for full detail.

**If anything here looks insufficient during implementation** (a measurement, a state, an asset), that's a real gap — ask the user before guessing, rather than calling the Figma MCP again without checking first. The intent of this doc is to avoid *routine* re-fetching, not to forbid it if something was genuinely missed.

## Contents

- `frontend-drift-report.md` (sibling of this file) — the formal drift-audit output for `dashboard-de-gerenciamento-de-videos-do-canal` (SI-04.9.0), now `get_design_context`-confirmed. Channel Settings and Public Channel Page both have **empty** Reused DS lists (SI-04.10.0 / SI-04.11.0, already completed) — no formal drift-report entries for them, but see "Cross-screen findings" below for style-consistency issues that fall outside that report's per-component scope.
- `figma-assets/raw/dashboard-39-652.reference.txt` — full `get_design_context` reference code for the dashboard (`/dashboard/videos`, node `39:652`).
- `figma-assets/raw/channel-settings-39-1384.reference.txt` — condensed, annotated `get_design_context` reference for Channel Settings (`/dashboard/channel`, node `39:1384`).
- `figma-assets/raw/channel-show-39-30.reference.txt` — condensed, annotated `get_design_context` reference for the public channel page (node `39:30`; exact route TBD — confirm at SI-04.11b).
- `figma-assets/icons/*.svg` — 22 icon assets downloaded from the Figma-hosted URLs (which expire ~7 days from capture, i.e. ~2026-09-20) so they survive past that window. See "Icon inventory" below for what each one is and whether it can reuse an existing `components/icons/*.tsx` file.

## Icon inventory

| File | Role | Reuse existing icon? |
|---|---|---|
| `sidebar-toggle-hamburger.svg` | Header hamburger / sidebar toggle | No existing icon — new |
| `header-search-icon.svg` | Header global search submit button | No existing icon — new (also used inside dashboard's `SearchVideosInput`, `dashboard-search-input-icon.svg` is the same glyph re-exported) |
| `header-create-camera-icon.svg` | Header "create video" shortcut icon | Compare against `components/icons/camera-icon.tsx` before reuse — not byte-verified in this pass |
| `nav-home-icon.svg` | Sidebar "Home" nav item | No existing icon — new |
| `nav-subscriptions-icon.svg` | Sidebar "Subscriptions" nav item | No existing icon — new |
| `nav-your-videos-icon.svg` | Sidebar "Your videos" nav item | No existing icon — new (compare against `camera-icon.tsx`, likely a different outline-video glyph) |
| `nav-liked-videos-icon.svg` | Sidebar "Liked videos" nav item (filled thumbs-up) | No existing icon — new |
| `dashboard-filter-icon.svg` | Dashboard "Filter" chip funnel icon | No existing icon — new |
| `dashboard-search-input-icon.svg` | Dashboard `SearchVideosInput` magnifier | Same glyph as `header-search-icon.svg` — implement once, reuse both places |
| `dashboard-sort-icon.svg` | Dashboard "Sort by: Latest" icon | No existing icon — new |
| `video-stat-eye-icon.svg` | Views count icon (dashboard video rows) | **Not a match** for `components/icons/eye-icon.tsx` — existing icon is outline/stroke-based (`viewBox 0 0 24 24`, `stroke="currentColor"`), this Figma icon is filled/solid (`viewBox 0 0 13.5 12`, hardcoded `fill="#AAAAAA"`). Decide at SI-04.9a whether to add a filled variant or reconcile styles — don't silently pick one. |
| `video-stat-thumbsup-icon.svg` | Likes count icon (dashboard video rows) | No existing icon — new |
| `video-stat-comment-icon.svg` | Comments count icon (dashboard video rows) | No existing icon — new |
| `pagination-prev-arrow.svg` | Pagination "previous" control | No existing icon — new (not a match for `arrow-back-icon.tsx`, not byte-verified) |
| `pagination-next-arrow.svg` | Pagination "next" control | No existing icon — new |
| `upload-button-plus-icon.svg` | "+ Upload video" button icon | No existing icon — new (simple plus glyph) |
| `channel-settings-subscribers-icon.svg` | Channel Settings "1.2M subscribers" stat icon | No existing icon — new |
| `channel-settings-videos-count-icon.svg` | Channel Settings "342 videos" stat icon | No existing icon — new |
| `channel-settings-basicinfo-heading-icon.svg` | "Basic Information" section heading icon | No existing icon — new |
| `channel-settings-about-heading-icon.svg` | "About Channel" section heading icon | No existing icon — new |
| `channel-settings-lastupdated-clock-icon.svg` | "Last updated: ..." footer icon | No existing icon — new |
| `channel-show-notification-bell-icon.svg` | Notification-bell button next to Subscribe | No existing icon — new |

Not downloaded (already have a matching component, verify before reuse rather than re-deriving):
- **StreamTube logo mark** (header, all 3 screens) — reuse `components/icons/streamtube-icon.tsx` / `components/auth/brand-logo.tsx` (already audited `alinhado` in SI-04.9.0).
- **"Show 12 more" chevron** (sidebar, all 3 screens) — likely reuses `components/icons/chevron-down-icon.tsx`; not byte-verified against the Figma glyph in this pass, spot-check at implementation time.

**Not an icon asset at all:** the per-video-row kebab/"more actions" trigger (`VideoRowMenuButton`, node `39:884`) returned no image asset from `get_design_context` — it's 3 small dots with no exported SVG. Build it as a trivial hand-authored `MoreVerticalIcon` (3 evenly spaced small circles/rects in a narrow bounding box) rather than trying to source an asset for it.

## Cross-screen findings (outside the formal drift-report's scope)

The formal `frontend-drift-report.md` only classifies components on a screen's **Reused DS list**. Channel Settings and Public Channel Page both have empty lists (every component new), so the following observations — gathered from the raw `get_design_context` data above — have nowhere else to live. Surface these to the user before/during the relevant visual-shell SI rather than resolving them silently, since they involve picking one shape among several observed in the actual designs:

1. **Three different "text input" shapes across the phase**, all presumably meant to use `components/ui/input.tsx` conceptually:
   - Video edit form Title/Description (SI-04.8): `h-9` (36px), `rounded-[var(--radius-1)]` (4px), label above the field.
   - Dashboard SearchVideosInput (SI-04.9, already in the formal drift-report as a `pill` addition): `h-[38px]`, `rounded-full`.
   - Channel Settings Nickname/Channel Name/Description (SI-04.10): `h-[58px]`/`h-[200px]` textarea, `rounded-[8px]`, **floating inset label** (label sits inside the top-left of the field, not above it) — a different label pattern than the established login/signup/video-edit-form convention (TD-04, separate `<Label>` above the field).
   Decide at SI-04.10a whether Channel Settings should match Figma exactly (new floating-label field variant) or fold into the established separate-label convention for consistency — don't decide this silently, it affects 3 fields on that screen.

2. **A "standard action button" shape is missing from `button.tsx`**: `h-[40px]`/`h-[42px]`, `rounded-[8px]` (`--radius-2`), used by Upload video (dashboard), Save Changes + Cancel (channel settings), and the pagination number buttons (`h-[36px] rounded-[8px]`, dashboard). Already captured as an `auto-Edit` bullet on `frontend-drift-report.md`'s `button.tsx` section (`+size 'action'`) — SI-04.9a will add it; SI-04.10a should reuse the same new size rather than re-deriving it.

3. **Three different "chip" shapes across the phase**:
   - Dashboard Filter/Public/Date (SI-04.9, in the formal drift-report): `rounded-full`, `bg-[#272727]`.
   - Public channel page Latest/Popular/Oldest sort chips: `rounded-[8px]` (not pill), `bg-[#f1f1f1]` when active / `bg-[#272727]` when inactive — introduces an "active" filled-white state not present in the dashboard chips.
   Flag both to the user at SI-04.11a — don't assume the dashboard's new `'chip'` size automatically covers this screen's sort chips; the shape (radius) and states (active/inactive) differ.

4. **Subscribe button** (public channel page): `h-[44px]`, `rounded-full`, `bg-[red]`, no icon, `px-[24px]`. Visually closest to `size="lg"` but verify the exact box against `lg`'s computed padding/height before reusing it as-is — don't assume it fits without checking.

5. **Card container pattern**: Channel Settings' two cards and the public channel page's video-grid thumbnails both use `rounded-[12px]` (`--radius-3`) `bg-[#272727]` `border border-[#3f3f3f]` (cards) — check whether the project already has an established "card" convention/token (`--card`, `--border`) before hand-picking these literals at SI-04.10a/11a.

## Corrections made to `frontend-drift-report.md` after this pass

The dashboard's drift-report section (SI-04.9.0) was originally written from user-provided screenshots (Figma MCP was rate-limited at the time). Once `get_design_context` became available, it was re-run for real and one finding was corrected: `UploadVideoButton` was misread from the screenshot as already matching `variant="destructive" size="lg"` (`rounded-full`) — the real node is `rounded-[8px]`, which is drift (see finding #2 above). The report file has been updated in place; no other findings changed (input.tsx pill shape and icon-button.tsx alignment were both confirmed exactly as the screenshot-based pass had them).
