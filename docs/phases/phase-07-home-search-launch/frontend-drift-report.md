---
kind: drift-report
phase: phase-07-home-search-launch
plan_mtime: "2026-09-16T21:02:00Z"
---

# phase-07-home-search-launch — Drift Report

## Screen: home-catalog-show — audited at SI-07.4.0 (2026-09-16)

**Quick scan:** 10 alinhado · 2 drift menor · 12 drift relevante · 0 ausente

- BrandLogo (`brand-logo.tsx`) → `alinhado`
- SearchIcon (`search-icon.tsx`) → `alinhado`
- CameraIcon (`camera-icon.tsx`) → `alinhado`
- ChevronDownIcon (`chevron-down-icon.tsx`) → `alinhado`
- SubscribedChannelRow (`subscribed-channel-row.tsx`) → `drift relevante` (exception)
- PaginationControls (`pagination-controls.tsx`) → `drift relevante` (exception)
- Badge (`badge.tsx`) → `drift relevante`
- Avatar (`avatar.tsx`) → `drift relevante`
- Sheet (`sheet.tsx`) → `drift relevante` (3 changes)
- Spinner (`spinner.tsx`) → `alinhado`
- VideoGrid (`video-grid.tsx`) → `alinhado`
- VideoGridCard (`video-grid-card.tsx`) → `drift relevante` (4 changes)
- CategoryFilterBar (`category-filter-bar.tsx`) → `alinhado`
- CategoryChip (`category-chip.tsx`) → `drift relevante` (2 changes)
- Header (`header.tsx`) → `drift menor`
- SidebarToggleButton (`sidebar-toggle-button.tsx`) → `alinhado`
- SearchBar (`search-bar.tsx`) → `drift relevante`
- CreateButton (`create-button.tsx`) → `drift menor`
- AvatarButton (`avatar-button.tsx`) → `alinhado`
- Sidebar (`sidebar.tsx`) → `alinhado`
- SidebarNavItem (`sidebar-nav-item.tsx`) → `drift relevante` (2 changes)
- AccountMenuCloseIcon (`close-icon.tsx`) → `drift relevante`
- AccountMenuIdentityBlock (`account-menu-identity.tsx`) → `drift relevante`
- AccountMenuItem (`account-menu-item.tsx`) → `drift relevante` (2 changes)

### components/auth/brand-logo.tsx — BrandLogo

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

Note: Figma's header logo instance (icon ~33.75×30px, text 20px/28/700) is closer to the component's existing `size="md"` variant (icon 32px, `text-h2` 20px/28/600 — only font-weight differs by one step, still `alinhado` at the component-definition level) than to `size="lg"`. Which size prop the caller passes is an SI-07.4a call-site decision, not a drift in this file's own variant definitions — both variants already exist and are internally consistent.

### components/icons/search-icon.tsx — SearchIcon

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

### components/icons/camera-icon.tsx — CameraIcon

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

### components/icons/chevron-down-icon.tsx — ChevronDownIcon

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

### components/subscriptions/subscribed-channel-row.tsx — SubscribedChannelRow

- **Status:** drift relevante
- **Decision:** `exception`
  - reason: reused unchanged from Phase 06 per this screen's UI Contract ("reused unchanged from Phase 06"). Figma's sidebar-subscription-row demands a compact ~24px avatar in a 40px-tall row; the component hardcodes `size-10` (40px) with no smaller-size prop, so the sidebar instance renders visibly larger than the Figma mock. Accepted as-is per the plan's explicit reuse instruction — not in scope for this phase's edits.
- **Prior:** _(none)_

### components/subscriptions/pagination-controls.tsx — PaginationControls

- **Status:** drift relevante
- **Decision:** `exception`
  - reason: reused unchanged from Phase 06 per this screen's UI Contract ("reused unchanged from Phase 06"), used here for the sidebar's "Show 12 more" affordance. Figma shows a plain muted text+chevron expand-in-place link (no button chrome), while this component renders a full prev/next pager (two bordered "Previous"/"Next" buttons + a page counter) — a structurally different interaction pattern. Accepted as-is per the plan's explicit reuse instruction; flagging for the user as a likely SI-07.4b wiring concern (the component's prev/next API doesn't naturally express a "show N more" expand toggle).
- **Prior:** _(none)_

### components/ui/badge.tsx — Badge

- **Status:** drift relevante
- **Decision:** `auto-Edit`
  - +variant 'duration' bg-black/80 text-white rounded-[var(--radius-1)] from Figma demand — the video-card duration badge (Figma: `bg-[rgba(0,0,0,0.8)]`, `rounded-[4px]`, white 12px text) has no matching Badge variant; today `video-grid-card.tsx` reaches for a call-site `bg-black/80 text-white` override on top of the `default` variant (which is `bg-primary` + `rounded-4xl` — a full pill, not Figma's 4px box), which is the forbidden call-site visual-identity override pattern. Adding a `duration` variant lets the caller stop overriding.
- **Prior:** _(none)_

### components/ui/avatar.tsx — Avatar

- **Status:** drift relevante
- **Decision:** `auto-Edit`
  - +size 'xl' (64px) from Figma demand — the account-menu identity avatar is 64px; no existing size step (`sm`=24, `default`=32, `lg`=40) covers it, so `account-menu-identity.tsx` reaches for a call-site `className="size-16"` override on top of `size="lg"` — the forbidden call-site dimension-override pattern. Adding an `xl` step lets the caller pass `size="xl"` instead.
- **Prior:** _(none)_

### components/ui/sheet.tsx — Sheet

- **Status:** drift relevante
- **Decision:** `auto-Edit`
  - retune overlay: bg-black/10 → bg-overlay (project already defines `--overlay: #00000080` in `app/globals.css` but it is not surfaced as a `@theme inline` color token yet, so `bg-overlay` isn't an available utility today — add `--color-overlay: var(--overlay);` to `@theme inline` first, per `next-frontend-ui.md`'s "add the token before consuming it" rule. Figma demands `bg-[rgba(0,0,0,0.7)]`; the project's `--overlay` token (50%) is far closer to that than the current hardcoded `bg-black/10` (10%))
  - retune edge treatment: data-[side=right]:border-l → data-[side=right]:shadow-drawer-left (Figma's right-side sheet has no visible border, only a `drop-shadow(-4px 0px 12px rgba(0,0,0,0.5))` edge — the project already has a semantically-named `--shadow-drawer-left: -4px 0 24px 0 #00000080` token for exactly this case)
  - retune width: sm:max-w-sm (384px) → sm:max-w-[320px] (Figma's account-menu panel is 320px wide)
- **Prior:** _(none)_

### components/ui/spinner.tsx — Spinner

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

Note: verified byte-identical against the downloaded `figma-assets/icons/infinite-scroll-loading-spinner.svg` — same `viewBox="0 0 33.9411 33.9411"` and identical `d` path data. Figma's static fill is `#AAAAAA`, which is exactly `--muted-foreground` in dark mode — the component's `currentColor` + `text-muted-foreground` + `animate-spin` translation is correct.

### components/video/video-grid.tsx — VideoGrid

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

### components/video/video-grid-card.tsx — VideoGridCard

- **Status:** drift relevante
- **Decision:** `auto-Edit`
  - retune thumbnail background: bg-muted → bg-card (Figma's thumbnail placeholder is `bg-[#272727]`, which is near-identical to `--card`/`--popover` (`#282828` in dark mode) — not `--muted` (`#3d3d3d`). This same `#272727`→`bg-card` pattern recurs across this screen's other dark-elevated surfaces, see CategoryChip and SidebarNavItem below)
  - retune title typography: text-label-md font-bold → text-label-lg (Figma's title is 16px/medium — `text-label-lg` — not 14px/bold as currently applied)
  - retune channel-name/views-line typography: text-caption → text-body-md (Figma demands 14px for both the channel-name line and the views/time line; `text-caption` is 12px. Same recurring 12px-should-be-14px pattern as AccountMenuIdentityBlock's handle line below)
  - retune avatar size: default (32px) → the closest step to Figma's 36px demand; no exact token exists (36px sits between `default`=32 and `lg`=40) — recommend keeping `default` unless Avatar's `xl` addition (see above) is judged close enough after that variant lands. Flagging as informational rather than a hard mismatch given the small (4px) delta.
- **Prior:** _(none)_

### components/layout/category-filter-bar.tsx — CategoryFilterBar

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

Note: container-level styling (`bg-background/95` ≈ Figma's `rgba(15,15,15,0.95)`, `border-b border-border` ≈ Figma's `#3f3f3f`, `px-4` = Figma's 16px left padding) matches closely. The category-label wording mismatch (Figma shows YouTube-style demo labels like "Gaming"/"Live"/"Mixes"; the component renders the real backend `VideoCategory` enum) was already identified and deliberately resolved in SI-07.0.7's Observations — not re-flagged here.

### components/layout/category-chip.tsx — CategoryChip

- **Status:** drift relevante
- **Decision:** `auto-Edit`
  - retune inactive background: bg-muted → bg-card (same `#272727`→card pattern as VideoGridCard's thumbnail and SidebarNavItem's active row — Figma's inactive chip is `bg-[#272727]`, not `--muted` `#3d3d3d`)
  - retune inactive text: text-muted-foreground → text-muted-foreground/foreground — Figma's inactive-chip label is bright near-white (`#f1f1f1`), not the low-contrast muted-gray (`#aaaaaa`) the component currently uses; retune to `text-foreground`
- **Prior:** _(none)_

Note: active-chip styling (`bg-foreground text-background`) and radius (`rounded-[var(--radius-2)]` = Figma's `rounded-[8px]`, exact match) are already correct.

### components/layout/header.tsx — Header

- **Status:** drift menor
- **Decision:** `auto-Edit`
  - retune height: h-16 → h-14 (Figma's header is 56px tall; `h-16` is 64px, `h-14` is 56px — exact match, same spacing-scale family)
- **Prior:** _(none)_

### components/layout/sidebar-toggle-button.tsx — SidebarToggleButton

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

Note: no mobile-breakpoint frame was captured for this screen (Figma capture is the 1440px desktop frame only), so there is no counter-evidence of drift for this toggle's own styling — classified `alinhado` by default rather than invented.

### components/layout/search-bar.tsx — SearchBar

- **Status:** drift relevante
- **Decision:** `auto-Edit`
  - +layout 'joined-search-pill' from Figma demand — Figma's search control is a single continuous pill split into two halves (input rounded only on its outer-left corners, submit button rounded only on its outer-right corners, no gap and no radius on the shared inner edge). The component currently renders the `Input` with `shape="pill"` (rounded on all four corners) and a separate submit `<button>` with `gap-2` between them, producing two independent rounded elements with a visible gap instead of one seamless compound control.
- **Prior:** _(none)_

### components/layout/create-button.tsx — CreateButton

- **Status:** drift menor
- **Decision:** `auto-Edit`
  - retune variant: ghost → secondary (Figma's create button shows a persistent `bg-[#272727]` at rest; `variant="ghost"` is typically transparent until hover/focus. Not independently verified against `button.tsx`'s exact variant class definitions in this audit — recommend a quick visual check during SI-07.4a before applying)
- **Prior:** _(none)_

### components/layout/avatar-button.tsx — AvatarButton

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

Note: default `Avatar` size (32px, unset `size` prop) matches Figma's header avatar (32px) exactly. No logged-out-state frame was captured, so the "Log in" link branch has no counter-evidence either way.

### components/layout/sidebar.tsx — Sidebar

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

Note: `w-64` (256px) vs Figma's 263px is a 7px (~3%) difference — treated as within rounding tolerance of a fixed Tailwind width step, not a meaningfully distinct drift.

### components/layout/sidebar-nav-item.tsx — SidebarNavItem

- **Status:** drift relevante
- **Decision:** `auto-Edit`
  - retune active background: bg-muted → bg-card (same recurring `#272727`→card pattern as VideoGridCard and CategoryChip above — Figma's highlighted nav-item row is `bg-[#272727]`)
  - retune vertical padding: py-2 → py-3 (Figma's nav-item row is 52px tall; current `px-3 py-2` renders roughly 36px)
- **Prior:** _(none)_

### components/icons/close-icon.tsx — AccountMenuCloseIcon

**Path note:** the UI Contract lists this as `components/icons/account-menu-close-icon.tsx (new)`, but SI-07.0.1's Observations recorded that it was deliberately deduped into the pre-existing generic `components/icons/close-icon.tsx` instead of creating a byte-duplicate file. Audited against the actual file on disk, `close-icon.tsx`.

- **Status:** drift relevante
- **Decision:** `auto-Edit`
  - +path 'account-menu-close-icon' from Figma demand — SI-07.0.1's dedup claimed this icon was "byte-equivalent" to the generic close glyph, but diffing against the downloaded `figma-assets/icons/account-menu-close-icon.svg` shows they are NOT equivalent: the Figma asset is a single filled path on a `viewBox="0 0 15 20"` (rectangular, fill-based X), while `close-icon.tsx` is two stroked line segments on a `viewBox="0 0 24 24"` (square, stroke-based X). Both render as a recognizable "X" but via a structurally different technique and aspect ratio. Replace `close-icon.tsx`'s path data + viewBox with the Figma asset's exact path (`M13.3828 5.88281C13.8711 5.39453...` — see `figma-assets/icons/account-menu-close-icon.svg`) and switch from `stroke="currentColor"` to `fill="currentColor"` — OR, if `close-icon.tsx` is also used by `sheet.tsx`'s generic close button (which has no Figma-specific source of its own), consider whether a single shared icon should encode both use cases, or whether this warrants a second, dedicated component. Flagging for explicit user review given SI-07.0.1's prior (incorrect) equivalence claim.
- **Prior:** _(none)_

### components/layout/account-menu-identity.tsx — AccountMenuIdentityBlock

- **Status:** drift relevante
- **Decision:** `auto-Edit`
  - retune handle typography: text-caption → text-body-md (Figma's "@handle" line is 14px; `text-caption` is 12px — same recurring 12px-should-be-14px pattern as VideoGridCard's channel-name/views lines above)
- **Prior:** _(none)_

Note: this component's `<Avatar size="lg" className="size-16">` call-site override is a symptom of the Avatar `xl`-variant gap flagged at that component's own H3 above — once `size="xl"` exists, this call site should switch to it instead of the className override. Not re-flagged as a separate drift here since the root cause is Avatar's own missing variant, not something specific to this file's styling.

### components/layout/account-menu-item.tsx — AccountMenuItem

- **Status:** drift relevante
- **Decision:** `auto-Edit`
  - +state 'divider' border-b border-border from Figma demand — the captured account-user-menu notes describe "border-b divider between rows" for each 57px-tall menu row; `itemClassName` currently has no border at all.
  - retune icon size: [&_svg]:size-5 → [&_svg]:size-4 (captured notes describe 16px icons; component currently sizes descendant SVGs to 20px)
- **Prior:** _(none)_

Confidence note: the source for this component's Figma demand is the prose description in `figma-assets/raw/account-user-menu-39-1513.RAW.txt` (a written capture summary, not literal generated JSX/pixel values like the home-catalog-show capture) — lower confidence than most other findings in this report. Recommend a quick `get_screenshot`/`get_design_context` re-check on node `39:1513` before SI-07.4a applies these bullets verbatim.
