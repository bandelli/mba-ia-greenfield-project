---
kind: drift-report
phase: phase-05-video-watch-page
plan_mtime: "2026-09-13T23:13:25Z"
---

# phase-05-video-watch-page — Drift Report

## Screen: video-watch-page — audited at SI-05.6.0 (2026-09-14)

**Audit method note:** `figma:figma-implement-design` (the packaged plugin skill) is not installed in this environment; per user direction, the audit was performed by calling the underlying Figma MCP tools directly (`get_design_context` on each target node, `get_screenshot` for visual confirmation), following the same design-to-code guidance the packaged skill would apply (loaded via the `skill://figma/figma-design-to-code/SKILL.md` MCP resource). `get_design_context` was obtained for all 4 button usages in the Reused DS list (nodes `39:1094`, `39:1096`, `39:1098`, `39:1070`). One `get_screenshot` call (node `39:1042`, the subscribe/like/share/download/more-options row) succeeded and visually confirmed the color/shape reasoning below; a second screenshot request (node `39:1043`, the description area) hit the Figma MCP Professional-seat rate limit — not retried, since `get_design_context`'s returned code for the "Show more" node (`39:1070`) already provided sufficient data (exact classes, text, color) without needing visual confirmation.

**Quick scan:** 0 alinhado · 0 drift menor · 2 drift relevante · 0 ausente

- Button (`button.tsx`) → `drift relevante` (4 changes)
- IconButton (`icon-button.tsx`) → `drift relevante` (2 changes)

### components/ui/button.tsx — Button (SubscribeButton, ShareButton, DescriptionExpandToggle)

- **Status:** drift relevante
- **Decision:** `auto-Edit`
  - +variant 'red' from Figma demand (SubscribeButton — node `39:1094` — `bg-[red]` (#ff0000) pill with white text; shape/size already matches the existing `chip` size exactly — h-9/36px, `rounded-[var(--radius-full)]`, confirmed via screenshot. No current color variant matches: closest is `destructive` at `#fb3748`, a distinctly different hue. Missing a bright-red color surface for this pill)
  - +size 'chip-lg' from Figma demand (ShareButton — node `39:1096` — `bg-[#272727]` `rounded-[9999px]` pill at `h-[44px]`, icon+text, confirmed via screenshot; existing `secondary` color token (`--secondary` / `--color-almost-black-900` = `#282828`) already matches Figma's `#272727` closely — 1-value hex rounding, same neutral family, no color edit needed — but no existing size variant produces a 44px-tall pill: `chip` is h-9/36px, `lg` is a much larger `px-12` pill. Missing a taller compact-pill size)
  - +variant 'fill' from Figma demand (ShareButton — node `39:1096` — `bg-[#272727]` pill with **no border**, confirmed via screenshot; the existing `secondary` variant that carries this same background color also adds `border-border` (`#3d3d3d` in dark mode — visible against the `#282828` fill, not transparent). Retuning `secondary` itself is unsafe: it's already reused elsewhere with an intentional border, e.g. `channel-public-page.tsx`'s sort-tab buttons (`variant="secondary" size="action"`). Missing a borderless solid-fill surface — additive, found late during SI-05.6a implementation, not part of the original SI-05.6.0 pass)
  - +variant 'quiet' from Figma demand (DescriptionExpandToggle "Show more" — node `39:1070` — `bg-transparent`, `text-[#f1f1f1]` (near `--foreground` dark `#ffffff`), `font-bold` (700), compact ~77×20px footprint with no button padding. Closest existing variant `ghost` matches background/color intent but its size utilities fix `font-weight` at 500 (`text-label-md`); `link` was considered but its `text-link` blue (`#3ea6ff`) does not match Figma's near-white text — this toggle is plain bold text, not a hyperlink. Missing a compact, bold, foreground-colored text-button surface)
- **Prior:** _(none)_

### components/ui/icon-button.tsx — IconButton (MoreOptionsButton)

- **Status:** drift relevante
- **Decision:** `auto-Edit`
  - +variant 'secondary' from Figma demand (MoreOptionsButton — node `39:1098` — `bg-[#272727]` ≈ existing `--secondary` / `--color-almost-black-900` `#282828`, near-exact match, same neutral family. No current icon-button variant (`default`/`outline`/`ghost`) produces a filled secondary-colored background)
  - +size 'xl' from Figma demand (MoreOptionsButton — `rounded-[9999px]` (full/pill) at an exported box of `31.75×44px`; screenshot confirms the rendered button is visually circular, so the asymmetric export dimensions are an auto-layout artifact from the taller sibling row — like/dislike/share/download buttons are all `h-44` — not an intentional non-square design, same footprint anomaly noted for `VideoRowMenuButton` in `phase-04-video-channel-management`'s audit. No current size reaches ~44px or uses full/pill radius: `sm`=32px, `md`=36px, `lg`=40px, all `radius-2`/`radius-3`)
- **Prior:** _(none)_
