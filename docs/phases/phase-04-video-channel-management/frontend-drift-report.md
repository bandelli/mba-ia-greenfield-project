---
kind: drift-report
phase: phase-04-video-channel-management
plan_mtime: "2026-09-12T07:35:46Z"
---

# phase-04-video-channel-management — Drift Report

## Screen: tela-de-edicao-de-video — audited at SI-04.8.0 (2026-09-12)

**Quick scan:** 0 alinhado · 0 drift menor · 0 drift relevante · 0 ausente

_(no components — this screen's Reused DS list is empty; every component is new per the screen inventory)_

## Screen: dashboard-de-gerenciamento-de-videos-do-canal — audited at SI-04.9.0 (2026-09-12)

**Quick scan:** 2 alinhado · 0 drift menor · 2 drift relevante · 0 ausente

**Audit method note (superseded — see below):** this audit-SI initially resumed after the Figma MCP tool call limit (Starter plan) blocked `get_design_context`, and was first completed using user-provided screenshots instead. The user then purchased Figma credits, lifting the rate limit; a full `get_design_context` re-fetch was performed for `39:652` (this screen) plus `39:1384` and `39:30` (the two remaining phase screens, gathered ahead of need per user request — see `figma-assets/raw/*.reference.txt`, sibling of this file). **The classification below is now `get_design_context`-confirmed**, with one correction versus the screenshot-based pass: `UploadVideoButton` was mis-read from the screenshot as an already-aligned `rounded-full` pill: the real node is `rounded-[8px]`, which is a drift too (added as a second `button.tsx` specifics bullet below). Icon SVG assets for this and the other two screens have been downloaded to `figma-assets/icons/` (remote Figma URLs expire ~7 days from capture).

- Button (`button.tsx`) → `drift relevante` (2 changes)
- Input (`input.tsx`) → `drift relevante`
- IconButton (`icon-button.tsx`) → `alinhado`
- BrandLogo (`brand-logo.tsx`) → `alinhado`

### components/ui/button.tsx — Button (FilterButton, VisibilityFilterChip "Public", DateFilterChip, UploadVideoButton)

- **Status:** drift relevante
- **Decision:** `auto-Edit`
  - +size 'chip' from Figma demand (`get_design_context` on node `39:652` confirms Filter/Public/Date — nodes `39:734`/`39:735`/`39:736` — as `h-[36px]` `bg-[#272727]` `rounded-[9999px]` buttons with **no border** (corrects the earlier screenshot-based guess of a bordered chip); compact horizontal padding (~16px). No existing size produces a pill at this compact scale — `sm`/`md` use `--radius-3`/`--radius-4`, only `lg` is `rounded-full` but with much larger padding (`px-12`) unsuitable for a chip)
  - +size 'action' from Figma demand (`get_design_context` confirms `UploadVideoButton` — node `210:11` — as `h-[40px]` `bg-[red]` `rounded-[8px]` (NOT `rounded-full` as the earlier screenshot-based pass assumed), `px-6`-ish horizontal padding. The same `h-40/rounded-[8px]` shape recurs on `SaveChangesButton`/`CancelButton` on the Channel Settings screen — `get_design_context` on node `39:1384` — and the pagination number buttons on this same screen — nodes `39:755`–`39:760`, `h-[36px] rounded-[8px]`. No existing size uses `--radius-2` (8px); `sm`=`--radius-3`(12px), `md`=`--radius-4`(16px), `lg`=`rounded-full`. This looks like the project's real "standard action button" shape, missing from the current variant set)
- **Prior:** _(none)_

### components/ui/input.tsx — Input (SearchVideosInput)

- **Status:** drift relevante
- **Decision:** `auto-Edit`
  - +variant 'pill' from Figma demand (`get_design_context` on node `39:767` confirms a `256×38px` `bg-[#0f0f0f]` `border border-[#3f3f3f]` `rounded-[9999px]` search field — confirms the earlier screenshot-based reading exactly. Current `Input` is fixed to `rounded-[var(--radius-1)]` (4px) with no shape variant. Cannot retune the base value: `Input` is shared verbatim by `login-form.tsx`, `signup-form.tsx`, `forgot-password-form.tsx`, and `video-edit-form.tsx`, all of which demand the current rectangular shape — retuning the base would break those screens)
- **Prior:** _(none)_

### components/ui/icon-button.tsx — IconButton (SidebarToggleButton, CreateVideoIconButton, VideoRowMenuButton)

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

_(Verified via screenshot for SidebarToggleButton — hamburger icon, header — and CreateVideoIconButton — camera icon, header — both consistent with the current `ghost`/`md` styling. **VideoRowMenuButton (node `39:884`) confirmed via `get_design_context`**: `bg-[rgba(0,0,0,0)]` (fully transparent) `rounded-[9999px]` containing a small icon — matches the current `ghost` variant's `bg-transparent` base exactly. Bounding box is `w-[20px] h-[40px]` (a tall click-target rectangle, not square) rather than one of `icon-button.tsx`'s square sizes (`sm`=32, `md`=36, `lg`=40) — noted as a minor implementation detail for SI-04.9b, not a visual drift, since the button is invisible except on `hover:bg-muted` regardless of its exact hitbox shape.)_

### components/auth/brand-logo.tsx — BrandLogo

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

_(Not independently re-verified via screenshot this run — reasoned from the existing `tela-de-edicao-de-video` implementation, which already renders this exact shared header/BrandLogo design and was visually confirmed against Figma at SI-04.8a with high fidelity.)_

## Screen: edicao-de-informacoes-do-canal — audited at SI-04.10.0 (2026-09-12)

**Quick scan:** 0 alinhado · 0 drift menor · 0 drift relevante · 0 ausente

_(no components — this screen's Reused DS list is empty; every component is new per the screen inventory)_

## Screen: pagina-publica-do-canal — audited at SI-04.11.0 (2026-09-12)

**Quick scan:** 0 alinhado · 0 drift menor · 0 drift relevante · 0 ausente

_(no components — this screen's Reused DS list is empty; every component is new per the screen inventory)_
