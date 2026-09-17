# phase-07-home-search-launch — Screen Inventory

> **Phase:** Phase 07 — Home Page, Search, and Wrap-up
> **Status:** Validated
> **Date:** 2026-09-16
> **Screens in scope:** 1

---

## Screen: Home (Catalog Show)

**Route:** `/`
**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-379 (node `39:379`)
**Purpose (from project-plan.md):** "Home page with a video grid (thumbnail, title, channel, views, and publish time)"

### Component inventory

| Component (Figma node) | Type | In DS? | Reuse? | Notes |
|---|---|---|---|---|
| StreamTube logo mark (39:399/39:438) | Presentational | ✓ | `components/auth/brand-logo.tsx` | — |
| Search icon glyph (39:497-39:499) | Presentational | ✓ | `components/icons/search-icon.tsx` | — |
| Camera/create icon glyph (39:441/imgFrame12) | Presentational | ✓ | `components/icons/camera-icon.tsx` | compare vs `header-create-camera-icon.svg` before final reuse |
| Chevron-down icon, sidebar "Show 12 more" (42:224-42:226) | Presentational | ✓ | `components/icons/chevron-down-icon.tsx` | — |
| VideoGrid (main content area, 39:383) | Server-connected | ✗ | `components/video/video-grid.tsx (new)` | owns fetch + infinite-scroll pagination of the feed |
| VideoGridCard (repeating grid item, e.g. 39:403) | Server-connected | ✗ | `components/video/video-grid-card.tsx (new)` | 266×245.625px vertical card, 36px avatar, title/channel/views·age; visually similar to `components/video/suggested-video-card.tsx` (horizontal layout) but NOT a drop-in match — needs its own component, though it may share the same underlying video-summary prop shape |
| DurationBadge (timestamp pill on thumbnail, e.g. 39:502 "14:20") | Presentational | ✗ | `components/ui/badge.tsx (new)` | generic dark semi-transparent pill; also underlies the out-of-scope LIVE badge variant (not built this phase) |
| ChannelAvatar (36px circular avatar in card, e.g. 39:503; initials-fallback variant at 39:585 "M" on `bg-[#2563eb]`) | Presentational | ✗ | `components/ui/avatar.tsx (new)` | needs both an image variant and an initials-fallback variant |
| InfiniteScrollLoader (spinner, 39:411/39:459/39:460) | Presentational | ✗ | `components/ui/spinner.tsx (new)` | matches downloaded `infinite-scroll-loading-spinner.svg`; visual feedback for VideoGrid's fetch-more action |
| CategoryFilterBar (39:390) | Server-connected | ✗ | `components/layout/category-filter-bar.tsx (new)` | sticky-looking bar, `bg-[rgba(15,15,15,0.95)]`, border-b |
| CategoryChip (11 pills: All, Gaming, Music, Live, Mixes, Programming, Podcasts, News, Recently uploaded, Watched, New to you — 39:412-39:423) | Server-connected | ✗ | `components/layout/category-chip.tsx (new)` | `rounded-[8px]` pill shape already flagged as a cross-phase DS gap in Phase 04's figma-reference — reuse whatever fix lands there rather than re-deriving; no filter-icon glyph present in this frame's data, chips are plain text |
| Header (container, 39:382) | Presentational | ✗ | `components/layout/header.tsx (new)` | layout shell composing logo, search, create/avatar buttons |
| SidebarToggleButton (hamburger, 39:398) | Local-interactive | ✗ | `components/layout/sidebar-toggle-button.tsx (new)` | maps to "Responsive layout for mobile devices" (mobile-only sidebar-toggle affordance, per user decision); glyph may reuse `components/icons/align-left-icon.tsx` — verify visually before reuse |
| SearchBar (input + submit button, 39:400) | Server-connected | ✗ | `components/layout/search-bar.tsx (new)` | filters the same Home grid inline via `?q=`, no dedicated results route |
| CreateButton (camera icon button, 39:401) | Local-interactive | ✗ | `components/layout/create-button.tsx (new)` | framework nav link to the existing upload flow (earlier phase); no new Phase 07 capability |
| AvatarButton (39:402) | Server-connected | ✗ | `components/layout/avatar-button.tsx (new)` | renders avatar if authenticated / login affordance if not (server auth state); opens Account User Menu |
| Sidebar (aside container, 42:173) | Presentational | ✗ | `components/layout/sidebar.tsx (new)` | — |
| SidebarNavItem (Home 42:175, Subscriptions 42:181, Your videos 42:189, Liked videos 42:195) | Local-interactive | ✗ | `components/layout/sidebar-nav-item.tsx (new)` | framework nav links; "Liked videos" (42:195) carries the `bg-[#272727]` active/hover highlight in this frame instead of "Home" (42:175) — see Open questions |
| Sidebar section divider (hr, 42:187/42:201) | Presentational | ✗ | `new` | pure-DOM `<hr>` |
| "Subscriptions" section heading (42:204) | Presentational | ✗ | `new` | pure-DOM text |
| SubscribedChannelRow (6 rows: Tech Reviews, Gaming Central, Design Daily, Music Zone, Fitness Pro, Cooking Master — 42:205-42:222) | Server-connected | ✓ | `components/subscriptions/subscribed-channel-row.tsx` | pre-existing Phase 06 component, reused unchanged on Home sidebar; no new Phase 07 capability |
| "Show 12 more" expand control (42:223-42:228) | Server-connected | ✓ | `components/subscriptions/pagination-controls.tsx` | pre-existing Phase 06 component, expands/paginates subscribed-channels list; no new Phase 07 capability |
| AccountUserMenuSheet (slide-over panel + backdrop, 39:1513/39:1517) | Local-interactive | ✗ | `components/ui/sheet.tsx (new)` | right-anchored 320px drawer, `bg-[#272727]`, drop-shadow, over full-screen `bg-[rgba(0,0,0,0.7)]` backdrop — new pattern vs. phases 01-04's corner dropdowns; check for shadcn `sheet.tsx`/`drawer.tsx` before hand-rolling (`npx shadcn@latest add sheet` likely fits) |
| Account menu close "X" button (39:1580) | Local-interactive | ✗ | `components/icons/account-menu-close-icon.tsx (new)` | svg already downloaded (`account-menu-close-icon.svg`), tsx wrapper not yet created |
| AccountMenuIdentityBlock (64px avatar + channel name + @handle) | Server-connected | ✗ | `components/layout/account-menu-identity.tsx (new)` | same data shape as Channel Settings identity block (Phase 04), smaller avatar; shows the authenticated user's own channel identity |
| "Edit Channel" menu item (icon 39:1585) | Local-interactive | ✗ | `components/layout/account-menu-item.tsx (new)` | framework nav link, presumably to `/dashboard/channel` (Phase 04); icon svg downloaded (`account-menu-edit-channel-icon.svg`), tsx wrapper not yet created; no new Phase 07 capability |
| "Sign Out" menu item (icon 39:1589) | Server-connected | ✗ | `components/layout/account-menu-item.tsx (new)` | presumably invokes the existing Phase 02 logout flow (`/auth/logout` via BFF); icon svg downloaded (`account-menu-signout-icon.svg`); no new Phase 07 capability |

### Verbs of intent

| Verb | Component | Capability (project-plan.md) |
|---|---|---|
| Exibir grade de vídeos com thumbnail, título, canal, visualizações e tempo de publicação | VideoGrid / VideoGridCard | "Home page with a video grid (thumbnail, title, channel, views, and publish time)" |
| Carregar mais vídeos por scroll infinito ao alcançar o fim da grade | VideoGrid (InfiniteScrollLoader) | "Pagination or infinite scroll in video listings" |
| Filtrar vídeos da home por categoria | CategoryFilterBar / CategoryChip | "Video filter by category on the home page" |
| Buscar vídeos por título ou nome do canal | SearchBar | "Search bar (search by title and channel)" |
| Exibir botão de login ou avatar conforme sessão do usuário autenticado | AvatarButton | "Header/navbar with logo, search bar, login/avatar button, and navigation" |
| Exibir identidade do usuário autenticado (avatar, nome do canal, @handle) no menu de conta | AccountMenuIdentityBlock | "Header/navbar with logo, search bar, login/avatar button, and navigation" |

### Observations

- Two design elements visible in Figma are out of scope for this phase per user decision (2026-09-16): the "LIVE" broadcast badge/viewer-count card variant (nodes 39:511, 39:564-39:566, "24K watching" at 39:571/39:616) and the "verified channel" checkmark badge next to a channel name (small icon elements at 39:603/39:640, 39:615/39:643, 39:622/39:646, 39:636/39:649). `DurationBadge`'s generic pill primitive underlies the LIVE variant but is built without it this phase.
- The Account User Menu is a right-anchored slide-over panel over a full-screen backdrop, not a simple corner dropdown — a new UI pattern relative to phases 01-04. No existing `sheet.tsx`/`drawer.tsx` primitive in `next-frontend/components/ui/`; recommend a shadcn Sheet (Radix Dialog-based) rather than a hand-rolled absolutely-positioned div.
- Search has no dedicated results screen (confirmed by user): SearchBar filters this same Home grid inline via `?q=` on route `/`, targeting the same data source as CategoryFilterBar rather than a separate route/component.
- Several components on this screen are pre-existing flows reused unchanged from earlier phases — `SubscribedChannelRow` and the "Show 12 more" expand control (Phase 06, Subscriptions), `CreateButton` (upload flow, earlier phase), and the account menu's "Edit Channel" (Phase 04) / "Sign Out" (Phase 02) items — classified by actual behavior (Server-connected/Local-interactive) but with no Phase 07 capability to map a verb to, so no Verbs-of-intent row was created for them.
- Only 2 actionable items ("Edit Channel", "Sign Out") appear in the Account User Menu per the Figma frame — no additional menu items (e.g. "View channel") should be invented without a product decision.
- Three Phase 07 capability bullets are not screen-shaped and have no component/verb row in this inventory by design: "Responsive layout for mobile devices" (structurally implemented by `SidebarToggleButton`'s mobile collapse behavior, but carries no server-connected verb), "Tests for the platform's main flows" (covered by `home-search-launch/TD-06`, not a UI element), and "Production environment and deployment" (covered by `home-search-launch/TD-05`, not a UI element).

---

## Reconciliation summary

| Capability (project-plan.md) | Covered by | Screens |
|---|---|---|
| "Home page with a video grid (thumbnail, title, channel, views, and publish time)" | VideoGrid, VideoGridCard | `/` |
| "Video filter by category on the home page" | CategoryFilterBar, CategoryChip | `/` |
| "Search bar (search by title and channel)" | SearchBar | `/` |
| "Header/navbar with logo, search bar, login/avatar button, and navigation" | Header, SidebarToggleButton, SearchBar, CreateButton, AvatarButton, Sidebar, SidebarNavItem, AccountUserMenuSheet, AccountMenuIdentityBlock | `/` |
| "Pagination or infinite scroll in video listings" | VideoGrid, InfiniteScrollLoader | `/` |
| "Responsive layout for mobile devices" | — _(not a dedicated component; structurally implemented by `SidebarToggleButton`'s mobile collapse, no server-connected verb of its own)_ | `/` |
| "Tests for the platform's main flows" | — _(not UI-shaped; covered by `home-search-launch/TD-06` in the decisions doc)_ | — |
| "Production environment and deployment" | — _(not UI-shaped; covered by `home-search-launch/TD-05` in the decisions doc)_ | — |

## Open questions

- **Sidebar active-item mismatch:** the Figma frame highlights "Liked videos" (`bg-[#272727]`) as the active/hover sidebar item instead of "Home", even though this is the Home screen. Confirm with the designer whether this is a mockup artifact (Home should be visually active on `/`) before implementing the active-state logic.
- **"Liked videos" sidebar destination:** no phase in `docs/project-plan.md` commissions a "Liked videos" page (same gap already flagged in `home-search-launch/TD-04`). The sidebar nav item is designed and will render on every screen via the shared shell (TD-04) — decide whether to build a stub page, disable/hide the item, or redirect it elsewhere before this phase ships.
