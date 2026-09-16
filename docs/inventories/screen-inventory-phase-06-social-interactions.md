# phase-06-social-interactions — Screen Inventory

> **Phase:** Social Interactions (Likes, Comments, Subscriptions)
> **Status:** Validated
> **Date:** 2026-09-14
> **Screens in scope:** 3

---

## Screen: Video Watch Page

**Route:** `/watch/[publicId]`
**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-1013 (node `40c57EfcNjN6u5St7n5SlG:39:1013`)
**Purpose (from project-plan.md):** "Complete comments, likes, and subscriptions interface" — this screen was fully inventoried in `phase-05-video-watch-page/`; only the components this phase adds or re-classifies are listed below.

### Component inventory

| Component (Figma node) | Type | In DS? | Reuse? | Notes |
|---|---|---|---|---|
| LikeDislikeButton (39:1095) | Server-connected | ✓ | `components/video/like-dislike-button.tsx` | Inherited from `phase-05-video-watch-page` as a Presentational stub (`... (new)`); promoted here because the file now exists on disk (see Observations). Wiring adds real like/dislike counts, current-user vote state, and click handlers — no new file needed. |
| SubscribeButton (39:1094) | Server-connected | ✓ | `components/ui/button.tsx` | Inherited from `phase-05-video-watch-page` as a Presentational stub. Same generic `Button` primitive; wiring wraps it with real subscribed-state + click handler (small client island, per `social-interactions/TD-06`). |
| SubscriberCount (39:1141) | Server-connected | ✗ | new | Inherited from `phase-05-video-watch-page` as a Presentational stub ("1.2M subscribers" hardcoded text). Now renders the channel's real `subscribers_count` (`social-interactions/TD-01`). |
| ~~CommentsSectionStub (39:1044 + descendants 39:1103/1104/1073/1074)~~ | _(superseded)_ | — | — | The Phase-05 stub (`components/video/comments-section-stub.tsx`) is a single hardcoded-data function mixing count header + sort button + comment form + one example comment. It exists on disk (would mechanically promote per the cross-phase promotion rule), but is **not** reused in place — decomposed into the rows below instead; the stub file is deleted during implementation. See Observations. |
| CommentCount (39:1103) | Server-connected | ✗ | new | Real total comment count ("N Comments" heading), replacing the stub's hardcoded "4,256 Comments". |
| CommentSortControl (39:1104) | Local-interactive | ✗ | new | "Sort by" trigger — no phase-06 capability describes comment sorting; rendered functional with a fixed default order. No verb assigned (see Observations). |
| CommentForm (39:1073) | Server-connected | ✗ | new | Posts a new top-level comment (single-level model, `social-interactions/TD-04`). |
| CommentList (39:1074 and repeats) | Server-connected | ✗ | new | Fetches and renders the video's top-level comments, with embedded replies (`social-interactions/TD-04`). |
| CommentItem (sub-component of CommentList) | Server-connected | ✗ | new | One comment: author, text, relative time, like/dislike, Reply action. |
| CommentLikeDislikeButton (sub-component of CommentItem) | Server-connected | ✗ | new | Per-comment like/dislike — same toggle pattern as `LikeDislikeButton`, scoped to a comment (`social-interactions/TD-01`, `TD-02`). |
| ReplyAction (sub-component of CommentItem) | Server-connected | ✗ | new | Opens an inline reply form under a comment; posting creates a depth-1 reply (`social-interactions/TD-04`). Not shown expanded anywhere in the Figma source — see Observations. |
| ReplyItem (rendered under a top-level CommentItem) | Server-connected | ✗ | new | Renders a depth-1 reply; same shape as `CommentItem` minus its own `ReplyAction` (replies cannot themselves be replied to, per `TD-04`). Fully inferred — absent from the Figma source entirely. See Observations. |

### Verbs of intent

| Verb | Component | Capability (project-plan.md) |
|---|---|---|
| Curtir ou descurtir o vídeo | LikeDislikeButton | "Like and dislike on videos (authenticated users)" |
| Inscrever-se ou cancelar inscrição no canal a partir da página do vídeo | SubscribeButton | "Channel subscriptions (follow/unfollow)" |
| Exibir contagem real de inscritos do canal | SubscriberCount | "Subscriber count on the channel page" |
| Exibir contagem real de comentários do vídeo | CommentCount | "Comments on videos (authenticated users)" |
| Publicar um novo comentário no vídeo | CommentForm | "Comments on videos (authenticated users)" |
| Exibir lista de comentários do vídeo | CommentList | "Comments on videos (authenticated users)" |
| Curtir ou descurtir um comentário | CommentLikeDislikeButton | "Like and dislike on comments (authenticated users)" |
| Responder a um comentário | ReplyAction | "Replies to comments (nested comments)" |
| Exibir respostas de um comentário | ReplyItem | "Replies to comments (nested comments)" |

### Observations

- This screen was fully inventoried in `phase-05-video-watch-page/` (`VideoPlayer`, `DescriptionCard`, `SuggestedVideoCard`, header chrome, etc. — 13 other rows). Only the phase-06-owned rows are listed here; nothing else on this screen changes in this phase.
- **Cross-phase promotion:** `LikeDislikeButton`'s inherited `(new)` marker is stripped and `In DS?` flips to ✓ because `components/video/like-dislike-button.tsx` now exists on disk (built as a visual-only stub in Phase 05, confirmed by direct filesystem check in this session). `SubscribeButton` was always `components/ui/button.tsx` (a generic primitive already in DS), so only its Type flips.
- **Deliberate deviation from mechanical promotion:** `components/video/comments-section-stub.tsx` also exists on disk and would mechanically promote to `In DS?: ✓`, but per this project's Single-Responsibility principle (CLAUDE.md), a monolithic stub that mixes count display + sort + form + comment-item + like/dislike + reply should not be wired in place once each concern becomes real and independently stateful. Decomposed into `CommentCount`/`CommentSortControl`/`CommentForm`/`CommentList`/`CommentItem`/`CommentLikeDislikeButton`/`ReplyAction`/`ReplyItem` instead; the stub file is deleted during implementation.
- `ReplyAction`'s expanded state and `ReplyItem`'s rendering are not present anywhere in the Figma source (per `docs/figma-reference/phase-06-social-interactions/figma-reference.md`: "the frame has a 'Reply' button but no expanded reply thread/nesting depth"). Their shape follows `social-interactions/TD-04`'s decided single-level model — flagged for visual/UX review during `/implement` since there is no design reference to validate pixel fidelity against.
- `CommentSortControl` ("Sort by" button, visible in Figma) has no phase-06 capability requiring real sort behavior — rendered as a functional trigger with a fixed default order (newest-first), matching the project's established pattern for design elements with no backing capability (e.g. phase-05's `MoreOptionsButton`, phase-04's "About" tab).
- Live-validated in this session: `get_metadata` on the Figma file root (`40c57EfcNjN6u5St7n5SlG`, page `0:1`) confirms the file has exactly 13 top-level frames, matching the pre-collection count in `docs/figma-reference/phase-06-social-interactions/figma-reference.md` — no new frame was added since that pass. This screen's own component-level extraction reused `phase-05-video-watch-page`'s already-cached classification rather than a fresh `get_design_context` call, per this project's established practice of not re-hitting Figma for already-captured frames (and the account's Figma seat is rate-limited at the time of this run).

---

## Screen: Channel Public Page (Channel show)

**Route:** `/channel/[nickname]`
**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-30 (node `40c57EfcNjN6u5St7n5SlG:39:30`)
**Purpose (from project-plan.md):** "Channel subscriptions (follow/unfollow)" — this screen was fully inventoried in `phase-04-video-channel-management/`; only the components this phase adds or re-classifies are listed below.

### Component inventory

| Component (Figma node) | Type | In DS? | Reuse? | Notes |
|---|---|---|---|---|
| SubscribeButton (39:133) | Server-connected | ✓ | `components/ui/button.tsx` | Inherited from `phase-04-video-channel-management` as an out-of-scope stub (`variant="destructive"`, no `onClick`). Wiring adds real subscribed-state + click handler (small client island, per `social-interactions/TD-06`); `channel-public-page.tsx` is already `"use client"`. |
| ChannelProfileHeader (39:39/66/128/130/131) | Server-connected | ✗ | new | Same composite inherited from `phase-04-video-channel-management` (banner, avatar, name, handle, description). No new sub-component — its already-present `subscriberCount` prop stops being always-`undefined` and starts receiving the channel's real `subscribers_count` (`social-interactions/TD-01`). |
| NotificationBellButton (39:134) | Presentational | ✓ | `components/ui/icon-button.tsx` | Carried forward unresolved from `phase-04-video-channel-management`'s Open Questions — still no capability in any phase (including this one) describes notifications. Stays decorative/inert; re-flagged below. |

### Verbs of intent

| Verb | Component | Capability (project-plan.md) |
|---|---|---|
| Inscrever-se ou cancelar inscrição no canal | SubscribeButton | "Channel subscriptions (follow/unfollow)" |
| Exibir contagem real de inscritos do canal | ChannelProfileHeader | "Subscriber count on the channel page" |

### Observations

- This screen was fully inventoried in `phase-04-video-channel-management/` (`ChannelTabs`, `VideoCard` listing, `VideoSortControl`, header/sidebar chrome, etc.). Only the phase-06-owned rows are listed here.
- `NotificationBellButton` has no `Reuse?` change from phase-04 (still `components/ui/icon-button.tsx`, still inert) — listed here only to re-surface the still-unresolved open question, not because anything about it changes in this phase.

---

## Screen: Followed Channels Page

**Route:** `/subscriptions`
**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-1307 (node `40c57EfcNjN6u5St7n5SlG:39:1307`) — **reference only**, see Observations. No dedicated frame exists for this screen.
**Purpose (from project-plan.md):** "Followed-channels area with quick access to their videos"

### Component inventory

| Component (Figma node) | Type | In DS? | Reuse? | Notes |
|---|---|---|---|---|
| PageHeader | Presentational | ✗ | new | Static heading (e.g. "Subscriptions") — same never-extracted pattern as every dashboard screen's `PageHeader`. |
| SubscribedChannelRow (visual reference: 39:1319–39:1324, the "Left Menu" frame's Subscriptions list rows) | Server-connected | ✗ | new | Avatar (24px circular image) + channel name, linking to `/channel/[nickname]`. Row style borrowed from the reference node for visual consistency only — see Observations. |
| SubscribedChannelsList | Server-connected | ✗ | new | Fetches the current user's followed channels, paginated (offset/limit, inherited convention from `phase-04-video-channel-management/TD-05`). |
| EmptySubscriptionsState | Presentational | ✗ | new | Shown when the user follows no channel yet. No existing EmptyState primitive in the codebase — first one in this project. |
| PaginationControls | Server-connected | ✗ | new | Same "no compound pagination component exists yet" gap already noted in `phase-04-video-channel-management`'s Dashboard screen; composed from `button.tsx`/`icon-button.tsx` primitives. |

### Verbs of intent

| Verb | Component | Capability (project-plan.md) |
|---|---|---|
| Exibir lista paginada de canais que o usuário segue | SubscribedChannelsList | "Followed-channels area with quick access to their videos" |
| Exibir cada canal seguido (avatar + nome) com link para a página do canal | SubscribedChannelRow | "Followed-channels area with quick access to their videos" |
| Navegar entre páginas da lista de canais seguidos | PaginationControls | "Followed-channels area with quick access to their videos" |

### Observations

- **No dedicated Figma frame exists for this screen.** Validated directly against the live Figma file in this session: `get_metadata` on the file root lists all 13 top-level frames (`User login`, `Upload video`, `Upload video processing`, `Channel Settings`, `Account User Menu`, `Left Menu`, `Create user account`, `Reset password`, `Video show`, `My videos list`, `Home (Catalog Show)`, `Channel show`, `Edit/Publish Video`) — none named "Comments", "Likes", "Subscriptions", or any equivalent content page. This confirms the earlier pre-collection finding in `docs/figma-reference/phase-06-social-interactions/figma-reference.md`. Per user decision (`social-interactions/TD-05`, Option A), this page is composed from existing DS primitives rather than a Figma spec.
- The cited Figma node (`39:1307`) is the "Left Menu" frame's Subscriptions section — confirmed via `get_metadata` to show the same "avatar + channel name" row repeated 6× ("Tech Reviews", "Gaming Central", "Design Daily", "Music Zone", "Fitness Pro", "Cooking Master") plus a "Show 12 more" affordance. This is the **persistent sidebar chrome** (`TD-05` explicitly decided against building that shell in this phase — Phase 07 owns shared navigation), not a content page. `SubscribedChannelRow`'s visual style is inspired by it; nothing here is a literal 1:1 reuse, and the "Left Menu" frame's own `main` content area (node `39:1298`) is empty in the Figma source — it was never a real page design to begin with.
- `EmptySubscriptionsState` and `PaginationControls` are fully inferred (no Figma reference at all) — first instances of these patterns in the project. Flagged for visual/UX review during `/implement` since there is no design to validate against.

---

## Reconciliation summary

| Capability (project-plan.md) | Covered by | Screens |
|---|---|---|
| "Like and dislike on videos (authenticated users)" | LikeDislikeButton | `/watch/[publicId]` |
| "Comments on videos (authenticated users)" | CommentCount, CommentForm, CommentList | `/watch/[publicId]` |
| "Replies to comments (nested comments)" | ReplyAction, ReplyItem | `/watch/[publicId]` |
| "Like and dislike on comments (authenticated users)" | CommentLikeDislikeButton | `/watch/[publicId]` |
| "Channel subscriptions (follow/unfollow)" | SubscribeButton | `/watch/[publicId]`, `/channel/[nickname]` |
| "Followed-channels area with quick access to their videos" | SubscribedChannelsList, SubscribedChannelRow, PaginationControls | `/subscriptions` |
| "Subscriber count on the channel page" | SubscriberCount, ChannelProfileHeader | `/watch/[publicId]`, `/channel/[nickname]` |
| "Complete comments, likes, and subscriptions interface" | _(umbrella — satisfied jointly by every row above, across all three screens)_ | `/watch/[publicId]`, `/channel/[nickname]`, `/subscriptions` |

## Open questions

- Carried forward, unresolved, from `phase-04-video-channel-management`'s Open Questions: `NotificationBellButton` (Channel Public Page, node `39:134`) appears in the Figma design but no phase in `docs/project-plan.md` — including this one — documents a notifications capability. Still decorative/inert. May be a real project-scope gap worth a dedicated capability in a future phase, or may simply be out of scope for this project's stated feature list.
