# phase-04-video-channel-management — Screen Inventory

> **Phase:** Video and Channel Management
> **Status:** Validated
> **Date:** 2026-09-11
> **Screens in scope:** 4

---

## Screen: Tela de edição de vídeo (Edit/Publish Video)

**Route:** `/dashboard/videos/[id]/edit`
**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-29 (node `40c57EfcNjN6u5St7n5SlG:39:29`)
**Purpose (from project-plan.md):** "Video information editing: title, description, category, and custom thumbnail"

### Component inventory

| Component (Figma node) | Type | In DS? | Reuse? | Notes |
|---|---|---|---|---|
| Sidebar toggle button (39:205) | Local-interactive | ✗ | new | hamburger icon in header, toggles nav |
| StreamTube logo/brand (39:206) | Presentational | ✗ | new | logo + wordmark |
| SearchBar (39:220, submit button 39:221) | Local-interactive | ✗ | new | local input state; no Phase 04 capability covers global search |
| Header quick-action icon button (39:208) | Local-interactive | ✗ | new | icon-only button, action not determinable from Figma output alone |
| User avatar button (39:209) | Local-interactive | ✗ | new | assumed opens account menu |
| Home nav link (42:403) | Local-interactive | ✗ | new | shared app-shell nav |
| Subscriptions nav link (42:409) | Local-interactive | ✗ | new | shared app-shell nav |
| "Your videos" nav link (42:417) | Local-interactive | ✗ | new | shared app-shell nav |
| "Liked videos" nav link (42:423) | Local-interactive | ✗ | new | shown in active/highlighted state |
| SubscriptionListItem (42:433, ×6 instances: 42:433/436/439/442/445/448) | Local-interactive | ✗ | new | avatar + channel name, links to channel page |
| "Show 12 more" toggle (42:451) | Local-interactive | ✗ | new | expands subscriptions list, local state |
| Page title "Publish / Edit Video" (39:224) | Presentational | ✗ | new | static h1 |
| "Details" section heading (39:275) | Presentational | ✗ | new | — |
| Title input (39:300) | Server-connected | ✗ | new | required field, current value pre-filled from server |
| Description textarea (39:302) | Server-connected | ✗ | new | current value pre-filled from server |
| "Thumbnail" section heading (39:279) | Presentational | ✗ | new | — |
| Thumbnail helper text (39:281) | Presentational | ✗ | new | — |
| Thumbnail preview image (39:304 / 39:327) | Presentational | ✗ | new | displays current thumbnail value; the adjacent button performs the edit action |
| "Change Thumbnail" button (39:305) | Server-connected | ✗ | new | triggers new custom thumbnail upload |
| "Category" section heading (39:284) | Presentational | ✗ | new | — |
| Category helper text (39:286) | Presentational | ✗ | new | — |
| Category select (39:306) | Server-connected | ✗ | new | options sourced from server; selection edits the video |
| "Visibility" section heading (39:289) | Presentational | ✗ | new | — |
| Visibility helper text (39:291) | Presentational | ✗ | new | — |
| VisibilityRadioGroup (39:292; options: Public 39:312, Unlisted 39:313) | Server-connected | ✗ | new | mutually exclusive radio group |
| Checks status message (39:248, "Checks complete. No issues found.") | Presentational | ✗ | new | read-only status text; see Observations |
| "Save as draft" button (39:272) | Server-connected | ✗ | new | — |
| "Publish" button (39:273) | Server-connected | ✗ | new | primary CTA (destructive/red emphasis in mock) |
| Video preview player (39:293, play icon, timestamp "0:00") | Presentational | ✗ | new | read-only preview + duration |
| Video link display (39:317 / 39:364, "streamtube.com/v/tech2024") | Presentational | ✗ | new | read-only; see Observations |
| Copy-link button (39:339 / 39:365) | Local-interactive | ✗ | new | clipboard copy, no backend call |
| Filename display (39:340 / 39:368) | Presentational | ✗ | new | read-only metadata |
| Video Quality display (39:321 / 39:343 / 39:344) | Presentational | ✗ | new | read-only metadata |

### Verbs of intent

| Verb | Component | Capability (project-plan.md) |
|---|---|---|
| Editar título do vídeo | Title input (39:300) | "Video information editing: title, description, category, and custom thumbnail" |
| Editar descrição do vídeo | Description textarea (39:302) | "Video information editing: title, description, category, and custom thumbnail" |
| Disparar upload de novo thumbnail customizado | "Change Thumbnail" button (39:305) | "Video information editing: title, description, category, and custom thumbnail" |
| Exibir categorias disponíveis para seleção | Category select (39:306) | "Video categories available on the platform" |
| Selecionar categoria do vídeo | Category select (39:306) | "Video information editing: title, description, category, and custom thumbnail" |
| Selecionar visibilidade do vídeo (público ou não listado) | VisibilityRadioGroup (39:292) | "Video visibility: public (shown to everyone) or unlisted (accessible only via link)" |
| Salvar vídeo como rascunho | "Save as draft" button (39:272) | "Draft → publish flow" |
| Publicar vídeo | "Publish" button (39:273) | "Draft → publish flow" |

### Observations

- Header (39:197) and sidebar (42:401) elements — SearchBar, header icon buttons, nav links, SubscriptionListItem, "Show 12 more" — are shared app-shell/navigation chrome, not specific to this screen's edit/publish behavior. None of them map to a Phase 04 capability; classified purely on interactivity evidence.
- Checks status message (39:248, "Checks complete. No issues found.") was classified Presentational as a read-only status line, but it plausibly reflects a server-computed validation result (likely inherited from Phase 03 video-processing checks). No Phase 04 capability explicitly covers it.
- Video link display (39:317/39:364) is read-only in this design (no edit affordance), so no verb was derived from it even though it conceptually overlaps with "Video visibility: ... unlisted (accessible only via link)". That capability's verb is instead attached to the VisibilityRadioGroup control.
- Filename (39:340) and Video Quality (39:321) displays in the right-hand preview panel are read-only metadata with no matching Phase 04 capability (carried over from Phase 03 upload/processing); classified Presentational and given no verb.
- No components appeared in the screenshot that were absent from `get_design_context` — the two extractions are consistent for this node.

---

## Screen: Dashboard de gerenciamento de vídeos do canal (My videos list)

**Route:** `/dashboard/videos`
**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-652 (node `40c57EfcNjN6u5St7n5SlG:39:652`)
**Purpose (from project-plan.md):** "Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)"

### Component inventory

| Component (Figma node) | Type | In DS? | Reuse? | Notes |
|---|---|---|---|---|
| SidebarToggleButton (39:663) | Local-interactive | ✓ | `components/ui/icon-button.tsx` | collapses/expands left nav; no backend dependency |
| BrandLogo (39:664) | Presentational | ✓ | `components/auth/brand-logo.tsx` | logo mark + "StreamTube" wordmark; existing auth component reused in global header |
| GlobalSearchBar (39:665) | Server-connected | ✗ | new | site-wide search input + submit button; see Observations |
| CreateVideoIconButton (39:666) | Local-interactive | ✓ | `components/ui/icon-button.tsx` | camera-icon shortcut, likely navigates to upload flow (route change only) |
| UserAvatar (39:667) | Presentational | ✗ | new | renders current user's avatar image; no avatar component in filesystem yet |
| SidebarNavItems — Home / Subscriptions / Your videos / Liked videos (42:460, 42:466, 42:474, 42:480) | Local-interactive | ✗ | new | client-side route links (framework navigation); consolidated as one repeating NavItem pattern |
| SidebarSubscriptionsChannelList (42:487) | Server-connected | ✗ | new | list of user's subscribed channels (avatar + name) plus "Show 12 more" expander; see Observations |
| PageHeader — "Channel content" title + "Manage your videos and content" subtitle (39:714) | Presentational | ✗ | new | static heading block |
| UploadVideoButton (210:11) | Local-interactive | ✓ | `components/ui/button.tsx` | navigates to the video upload flow (Phase 03 capability); button press itself is just a route trigger |
| FilterButton (39:734) | Local-interactive | ✓ | `components/ui/button.tsx` | disclosure trigger; opens a filter panel whose contents are not shown in this frame |
| VisibilityFilterChip "Public" (39:735) | Server-connected | ✓ | `components/ui/button.tsx` | quick filter chip for video visibility |
| DateFilterChip (39:736) | Server-connected | ✓ | `components/ui/button.tsx` | quick filter/sort chip by publish date |
| SearchVideosInput (39:767) | Server-connected | ✓ | `components/ui/input.tsx` | searches within the channel's own paginated video list |
| VideoCountLabel — "24 videos" (39:718) | Server-connected | ✗ | new | displays total video count from backend |
| SortByDropdown — "Sort by: Latest" (39:719) | Server-connected | ✗ | new | reorders the paginated (offset/limit, per TD-05) video list |
| VideoRow — list item container, repeats 6× (39:720–39:725) | Server-connected | ✗ | new | one row per channel video; depends on server state to render |
| VideoThumbnail + duration overlay (sub-component of VideoRow, e.g. 39:742/39:771/39:795) | Server-connected | ✗ | new | thumbnail image (custom or auto-generated) + duration badge |
| VideoTitle (sub-component of VideoRow, e.g. 39:830) | Server-connected | ✗ | new | video title text |
| VideoDescription (sub-component of VideoRow, e.g. 39:797) | Server-connected | ✗ | new | video description text; see Observations |
| VideoStats — views/likes/comments (sub-component of VideoRow, e.g. 39:799/832/833/834) | Server-connected | ✗ | new | three inline counters (views, likes, comments); per TD-05 these render as `0` placeholders in this phase |
| VideoPublishedAt — e.g. "2 days ago" (sub-component of VideoRow, e.g. 39:836) | Server-connected | ✗ | new | relative publish-time text |
| VideoStatusBadge — "Public"/"Unlisted" (sub-component of VideoRow, e.g. 39:838/39:865) | Server-connected | ✗ | new | visibility status label |
| VideoRowMenuButton — kebab trigger (sub-component of VideoRow, e.g. 39:884) | Server-connected | ✓ | `components/ui/icon-button.tsx` | opens a per-video actions menu; entry point for "Editing videos from the dashboard" (menu contents not present in this Figma node — see Observations) |
| PaginationControls (39:726) | Server-connected | ✗ | new | prev/next arrows + numbered pages; composed of `button.tsx`/`icon-button.tsx` primitives but no compound pagination component exists yet |

### Verbs of intent

| Verb | Component | Capability (project-plan.md) |
|---|---|---|
| Filtrar vídeos do canal por status de visibilidade (Public) | VisibilityFilterChip "Public" | "Video visibility: public (shown to everyone) or unlisted (accessible only via link)" |
| Filtrar/ordenar vídeos do canal por data de publicação | DateFilterChip | "Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)" |
| Buscar vídeos do canal por palavra-chave | SearchVideosInput | "Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)" |
| Exibir contagem total de vídeos do canal | VideoCountLabel | "Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)" |
| Reordenar lista de vídeos do canal | SortByDropdown | "Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)" |
| Exibir vídeo individual do canal na lista do dashboard | VideoRow | "Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)" |
| Exibir thumbnail do vídeo na lista do dashboard | VideoThumbnail | "Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)" |
| Exibir título do vídeo na lista do dashboard | VideoTitle | "Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)" |
| Exibir contagem de visualizações do vídeo | VideoStats | "Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)" |
| Exibir contagem de curtidas do vídeo | VideoStats | "Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)" |
| Exibir contagem de comentários do vídeo | VideoStats | "Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)" |
| Exibir tempo de publicação do vídeo | VideoPublishedAt | "Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)" |
| Exibir status de visibilidade do vídeo (Public/Unlisted) | VideoStatusBadge | "Video visibility: public (shown to everyone) or unlisted (accessible only via link)" |
| Navegar entre páginas da lista de vídeos do canal | PaginationControls | "Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)" |
| Abrir menu de ações do vídeo (entry point para edição) | VideoRowMenuButton | "Editing videos from the dashboard" |

### Observations

- The per-video kebab menu trigger (VideoRowMenuButton, e.g. node 39:884) has no visible expanded/open state in this Figma node — no menu items (Edit, Delete, Unpublish, etc.) were extracted. **Resolved:** assigned as the entry point for "Editing videos from the dashboard" regardless — clicking it is assumed to open a per-video actions menu whose "Edit" option navigates to `/dashboard/videos/[id]/edit` (the "Tela de edição de vídeo" screen already inventoried in this document). If a future Figma revision adds a frame/variant showing the expanded menu, re-run `/screen-inventory` (extension run) to capture its exact items.
- This screen does not visibly cover: "Video categories available on the platform", "Video information editing: title, description, category, and custom thumbnail", "Draft → publish flow" (only "Public"/"Unlisted" statuses appear in sample data, no "Draft" instance), "Channel information editing: nickname, name, and description", or "Public channel page with information and video listing" — these live on other screens in this inventory.
- Views/likes/comments counts (VideoStats) are rendered with populated sample numbers in the Figma mock, but per TD-05 these will be `0` placeholders in this phase since view tracking, likes, and comments subsystems are not built until Phases 05/06.
- **Resolved:** GlobalSearchBar (header, node 39:665) is out of scope for Phase 04 — platform-wide search belongs to Phase 07 ("Search bar (search by title and channel)"). Shared app-shell chrome; no Phase 04 verb assigned.
- **Resolved:** SidebarSubscriptionsChannelList (node 42:487) is out of scope for Phase 04 — the followed-channels list belongs to Phase 06 ("Followed-channels area with quick access to their videos"). Shared app-shell chrome; no Phase 04 verb assigned.
- **Resolved:** VideoDescription (node 39:797) is out of scope for Phase 04's dashboard capability — the capability enumerates its columns exhaustively ("thumbnail, title, views, likes, comments, publish time, and status") and description is not among them. Left as rich design detail with no assigned verb/capability; not required for this phase's implementation.

---

## Screen: Edição de informações do canal (Channel Settings)

**Route:** `/dashboard/channel`
**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-1384 (node `40c57EfcNjN6u5St7n5SlG:39:1384`)
**Purpose (from project-plan.md):** "Channel information editing: nickname, name, and description"

### Component inventory

| Component (Figma node)                | Type              | In DS? | Reuse? | Notes |
|----------------------------------------|-------------------|--------|--------|-------|
| SidebarToggleButton (39:1395)          | Local-interactive | ✗      | new    | header hamburger icon; toggles sidebar visibility (shared app-shell chrome) |
| BrandLogo (39:1396)                    | Local-interactive | ✗      | new    | "StreamTube" wordmark/logo; acts as Home navigation link (shared chrome) |
| SearchBar (39:1415)                    | Local-interactive | ✗      | new    | header search input + submit button (39:1416); see screen: Dashboard de gerenciamento de vídeos do canal (GlobalSearchBar) |
| UploadEntryButton (39:1398)            | Local-interactive | ✗      | new    | camera icon button in header; entry point to video-upload flow (Phase 03 scope) |
| UserAvatarMenu (39:1420)               | Local-interactive | ✗      | new    | header avatar button; opens account menu (shared chrome) |
| NavItem: Home (42:517)                 | Local-interactive | ✗      | new    | sidebar navigation link |
| NavItem: Subscriptions (42:523)        | Local-interactive | ✗      | new    | sidebar navigation link |
| NavItem: Your videos (42:531)          | Local-interactive | ✗      | new    | sidebar navigation link, routes to the channel video management dashboard |
| NavItem: Liked videos (42:537)         | Local-interactive | ✗      | new    | sidebar navigation link, shown in active/current state |
| SubscriptionListItem (42:547–42:562)   | Local-interactive | ✗      | new    | see screen: Dashboard de gerenciamento de vídeos do canal (SidebarSubscriptionsChannelList) |
| ShowMoreSubscriptionsToggle (42:565)   | Local-interactive | ✗      | new    | "Show 12 more" — expands the truncated sidebar subscriptions list |
| ChannelAvatarPreview (39:1464)         | Presentational    | ✗      | new    | read-only channel picture; no upload/edit affordance present in this node, consistent with the Phase 04 capability listing only nickname/name/description (no photo) |
| ChannelIdentitySummary (39:1453)       | Presentational    | ✗      | new    | channel name heading, handle, subscriber count, video count — read-only summary shown above the edit form |
| SectionHeading: Basic Information (39:1454) | Presentational | ✗   | new    | icon + heading text |
| NicknameField (39:1486)                | Server-connected  | ✗      | new    | labeled input "Nickname" (`@techmaster2024`) with helper text "Your unique identifier on StreamTube"; edits the channel's unique handle |
| ChannelNameField (39:1490)             | Server-connected  | ✗      | new    | labeled input "Channel Name" with helper text "The name that appears on your channel"; edits the display name |
| SectionHeading: About Channel (39:1456) | Presentational   | ✗      | new    | icon + heading text |
| DescriptionField (39:1479)             | Server-connected  | ✗      | new    | labeled textarea "Description" with character counter (342/5000) and helper text; edits the channel description |
| LastUpdatedTimestamp (39:1450)         | Presentational    | ✗      | new    | "Last updated: January 15, 2024" with clock icon |
| CancelButton (39:1462)                 | Local-interactive | ✗      | new    | discards unsaved edits (assumed local-only reset/navigation; no distinct Figma state confirms a server call) |
| SaveChangesButton (39:1463)            | Server-connected  | ✗      | new    | submits the edited nickname, name, and description to the server |

### Verbs of intent

| Verb                                          | Component              | Capability (project-plan.md)                                              |
|------------------------------------------------|-------------------------|-----------------------------------------------------------------------------|
| Editar apelido (nickname) do canal             | NicknameField           | "Channel information editing: nickname, name, and description"             |
| Editar nome do canal                           | ChannelNameField        | "Channel information editing: nickname, name, and description"             |
| Editar descrição do canal                      | DescriptionField        | "Channel information editing: nickname, name, and description"             |
| Salvar alterações das informações do canal     | SaveChangesButton       | "Channel information editing: nickname, name, and description"             |

### Observations

- Header and left sidebar chrome (search, upload entry point, avatar menu, sidebar toggle, nav items, subscriptions list) are shared app-shell chrome present in this full-page Figma frame; none of their interactive elements map to any of the 8 listed Phase 04 capabilities, so no verbs were derived for them.
- No avatar/photo upload control exists in this node's tree for the channel picture (`ChannelAvatarPreview`, node 39:1464) — only a static `<img>`. Consistent with "Channel information editing: nickname, name, and description" not listing photo/avatar editing as in scope.
- `CancelButton` (39:1462) has no distinct Figma interaction state to confirm whether it discards local edits only or navigates away; classified Local-interactive under the assumption it performs no server write.
- Per TD-04 (nickname collision → 409 surfaced as inline field error), `NicknameField` is expected to receive server-side uniqueness validation on submit; noted here as behavioral context only.
- `get_design_context` returned no Code Connect map entries for any node in this tree, so every component's `Reuse?` defaults to the bare literal `new` (`In DS?: ✗`).
- No components appeared in the screenshot that were absent from `get_design_context`'s tree.

---

## Screen: Página pública do canal (Channel show)

**Route:** `/channel/[nickname]`
**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-30 (node `40c57EfcNjN6u5St7n5SlG:39:30`)
**Purpose (from project-plan.md):** "Public channel page with information and video listing"

### Component inventory

| Component (Figma node) | Type | In DS? | Reuse? | Notes |
|---|---|---|---|---|
| SidebarToggleButton (39:43) | Local-interactive | ✗ | new | see screen: Dashboard de gerenciamento de vídeos do canal |
| AppLogo (39:44) | Local-interactive | ✗ | new | Global header chrome; Home navigation link |
| SearchBar (39:45, input 39:61 + button 39:62) | Server-connected | ✗ | new | see screen: Dashboard de gerenciamento de vídeos do canal (GlobalSearchBar) |
| UploadEntryButton (39:46) | Local-interactive | ✗ | new | navigates to upload flow (Phase 03 scope) |
| AccountAvatarButton (39:47) | Local-interactive | ✗ | new | opens account menu / navigates to own channel |
| SidebarNav (42:289–42:300: Home, Subscriptions) | Local-interactive | ✗ | new | Framework navigation links |
| YourContentNav (42:302–42:314: Your videos, Liked videos) | Local-interactive | ✗ | new | Framework navigation links |
| SubscriptionsList (42:316–42:336, header + 6 channel-link items) | Server-connected | ✗ | new | see screen: Dashboard de gerenciamento de vídeos do canal (SidebarSubscriptionsChannelList) |
| ShowMoreSubscriptionsButton (42:337) | Local-interactive | ✗ | new | Expands truncated sidebar subscriptions list |
| ChannelProfileHeader (39:39 banner, 39:66 avatar, 39:128 name, 39:130 handle/stats, 39:131 description) | Server-connected | ✗ | new | Displays banner, avatar, name, @nickname, subscriber count, video count, description — all channel data from backend |
| SubscribeButton (39:133) | Server-connected | ✗ | new | see Observations |
| NotificationBellButton (39:134) | Server-connected | ✗ | new | see Observations |
| ChannelTabs (39:50: Videos 39:67, About 39:68) | Local-interactive | ✗ | new | Switches Videos/About sub-view; only "Videos" is rendered in this frame |
| VideoSortControl (39:51: Latest 39:69, Popular 39:70, Oldest 39:71) | Server-connected | ✗ | new | Reorders the channel's public video listing |
| VideoCard (repeated pattern: 39:72, 39:73, 39:74, 39:75, 39:76) | Server-connected | ✗ | new | Thumbnail, duration badge, title, view count, publish time; must render only PUBLISHED + `visibility: public` videos per TD-02/TD-05 |

### Verbs of intent

| Verb | Component | Capability (project-plan.md) |
|---|---|---|
| Exibir informações públicas do canal (banner, avatar, nome, @nickname, contagem de inscritos, contagem de vídeos, descrição) | ChannelProfileHeader | "Public channel page with information and video listing" |
| Exibir lista de vídeos publicados (visibilidade pública) do canal | VideoCard | "Public channel page with information and video listing" |
| Reordenar lista de vídeos publicados do canal (mais recentes / populares / mais antigos) | VideoSortControl | "Public channel page with information and video listing" |

### Observations

- SidebarToggleButton, AppLogo, SearchBar, UploadEntryButton, AccountAvatarButton, SidebarNav, YourContentNav, SubscriptionsList, and ShowMoreSubscriptionsButton are global header/sidebar chrome shared across screens — see "see screen" cross-references above.
- `get_design_context` for this node did not emit any Code Connect / DS reuse-path suggestions — every row resolves to `Reuse?: new`, `In DS?: ✗`.
- The "About" tab (part of ChannelTabs, node 39:68) has no visible content in this frame — only the "Videos" sub-view with "Latest" sort active is rendered.
- Per TD-02/TD-05, the VideoCard listing on this page must include only PUBLISHED videos with `visibility: public` — unlisted and draft videos must never appear here.
- All components visible in the screenshot matched components present in `get_design_context`.
- **Resolved:** SubscribeButton (node 39:133) is out of scope for Phase 04 — channel subscriptions belong to Phase 06 ("Channel subscriptions (follow/unfollow)"). No Phase 04 verb assigned.
- **Resolved:** NotificationBellButton (node 39:134) is out of scope for now — no phase in `docs/project-plan.md` currently documents a notifications capability. Left as a decorative/unimplemented design element for this phase; not tracked as a formal gap since no phase claims it.

---

## Reconciliation summary

| Capability (project-plan.md) | Covered by | Screens |
|---|---|---|
| "Video categories available on the platform" | Category select | `/dashboard/videos/[id]/edit` |
| "Video information editing: title, description, category, and custom thumbnail" | Title input, Description textarea, "Change Thumbnail" button, Category select | `/dashboard/videos/[id]/edit` |
| "Video visibility: public (shown to everyone) or unlisted (accessible only via link)" | VisibilityRadioGroup, VideoStatusBadge, VisibilityFilterChip | `/dashboard/videos/[id]/edit`, `/dashboard/videos` |
| "Draft → publish flow" | "Save as draft" button, "Publish" button | `/dashboard/videos/[id]/edit` |
| "Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)" | VideoRow, VideoThumbnail, VideoTitle, VideoStats, VideoPublishedAt, VideoCountLabel, SortByDropdown, DateFilterChip, SearchVideosInput, PaginationControls | `/dashboard/videos` |
| "Editing videos from the dashboard" | VideoRowMenuButton | `/dashboard/videos` |
| "Channel information editing: nickname, name, and description" | NicknameField, ChannelNameField, DescriptionField, SaveChangesButton | `/dashboard/channel` |
| "Public channel page with information and video listing" | ChannelProfileHeader, VideoCard, VideoSortControl | `/channel/[nickname]` |

## Open questions

- O sino de notificações (NotificationBellButton, tela "Página pública do canal") aparece no design mas nenhuma fase de `docs/project-plan.md` documenta uma capability de notificações. Ficou marcado como fora de escopo/decorativo por ora nesta reconciliação — mas pode ser um gap real de escopo do projeto que vale revisitar (talvez pertença à Fase 06, junto com subscriptions, ou precise de uma capability própria).
