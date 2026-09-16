---
kind: phase
name: phase-06-social-interactions
test_specs_aware: true
sources_mtime:
  docs/phases/phase-06-social-interactions/context.md: "2026-09-15T00:23:45"
  docs/project-plan.md: "2026-09-10T22:11:45"
  docs/decisions/technical-decisions-social-interactions.md: "2026-09-14T23:03:53"
  docs/decisions/technical-decisions-next-frontend-msw-foundation.md: "2026-09-10T22:11:45"
  docs/decisions/technical-decisions-next-frontend-openapi-typing.md: "2026-09-07T21:58:17"
  docs/phases/phase-01-configuracao-base/context.md: "2026-09-10T22:11:45"
  docs/phases/phase-02-auth/context.md: "2026-09-10T22:11:45"
  docs/phases/phase-02-auth-frontend/context.md: "2026-09-10T22:11:45"
  docs/phases/phase-03-videos/context.md: "2026-09-10T22:11:45"
  docs/phases/phase-04-video-channel-management/context.md: "2026-09-13T13:08:28"
  docs/phases/phase-05-video-watch-page/context.md: "2026-09-14T22:41:23"
  docs/inventories/screen-inventory-phase-06-social-interactions.md: "2026-09-14T23:39:11"
  .claude/skills/testing-guide-nestjs-project/SKILL.md: "2026-09-07T21:58:17"
  .claude/skills/testing-guide-next-frontend/SKILL.md: "2026-09-07T21:58:17"
---

# Phase 06 — Social Interactions (Likes, Comments, Subscriptions)

## Objective

Implement authenticated like/dislike on videos and comments, single-level comment replies, channel subscriptions (follow/unfollow), a dedicated followed-channels listing page, and real subscriber/like/comment counts on the video watch page, channel page, and owner dashboard — delivering working likes/dislikes, comments with replies, channel subscriptions, and a followed-channels listing.

---

## Step Implementations

### SI-06.0.1 — Custom-business simple group: empty-subscriptions-state + pagination-controls + subscribed-channel-row + subscribed-channels-list + comment-form

**Description:** Autorar os 5 componentes novos, pure-presentational ou sem lógica complexa, identificados no B2.6 sweep das UI Contracts.

**Technical actions:**

1. Author `components/subscriptions/empty-subscriptions-state.tsx` per `### UI Contracts → Screen: Followed Channels Page`.
2. Author `components/subscriptions/pagination-controls.tsx` per `### UI Contracts → Screen: Followed Channels Page` — links via `?page=n+1`, composed from `components/ui/button.tsx`/`components/ui/icon-button.tsx`, no local state (Server Component + `searchParams` per `phase-04-video-channel-management/TD-06`).
3. Author `components/subscriptions/subscribed-channel-row.tsx` per `### UI Contracts → Screen: Followed Channels Page` — avatar + channel name, `next/link` to `/channel/[nickname]`.
4. Author `components/subscriptions/subscribed-channels-list.tsx` per `### UI Contracts → Screen: Followed Channels Page` — fetches via `GET /api/subscriptions` (§API Contracts → BFF tier), renders `SubscribedChannelRow` per item, `EmptySubscriptionsState` when empty.
5. Author `components/video/comment-form.tsx` per `### UI Contracts → Screen: Video Watch Page` — the "Add a comment..." composer, posts to `POST /api/videos/public/[publicId]/comments` (§API Contracts → BFF tier).

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `empty-subscriptions-state.tsx` | Unit per `testing-guide-next-frontend` § "Feature component" — renders heading + description | `components/subscriptions/__tests__/empty-subscriptions-state.test.tsx` |
| `pagination-controls.tsx` | Unit per `testing-guide-next-frontend` § "Client Components" — renders prev/next links with correct `?page=` hrefs, disables prev on page 1 | `components/subscriptions/__tests__/pagination-controls.test.tsx` |
| `subscribed-channel-row.tsx` | Unit per `testing-guide-next-frontend` § "Feature component" — renders avatar, name, correct `href` | `components/subscriptions/__tests__/subscribed-channel-row.test.tsx` |
| `subscribed-channels-list.tsx` | Unit per `testing-guide-next-frontend` § "Client Components" — renders rows from props, renders empty state when `items` is empty | `components/subscriptions/__tests__/subscribed-channels-list.test.tsx` |
| `comment-form.tsx` | Unit per `testing-guide-next-frontend` § "Client Components" — submit disabled when empty, calls `onSubmit` with trimmed body | `components/video/__tests__/comment-form.test.tsx` |

**Dependencies:** none

**Acceptance criteria:**

- Each of the 5 components exists at its declared path and matches its UI Contract.
- Unit tests exercise rendering + the documented props/behaviors for each component.
- `npx tsc --noEmit` and `npm run lint` pass in `next-frontend/`.

---

### SI-06.0.2 — Custom-business simple group: comment-list + comments-section

**Description:** Autorar os 2 componentes de listagem/composição de comentários restantes do B2.6 sweep.

**Technical actions:**

1. Author `components/video/comment-list.tsx` per `### UI Contracts → Screen: Video Watch Page` — fetches via `GET /api/videos/public/[publicId]/comments` (§API Contracts → BFF tier), renders one `CommentItem` per top-level comment.
2. Author `components/video/comments-section.tsx` per `### UI Contracts → Screen: Video Watch Page` — replaces `components/video/comments-section-stub.tsx`; composes the "N Comments" heading (inline `CommentCount`) + sort trigger (inline `CommentSortControl`, fixed newest-first order per this phase's screen inventory Observations) + `CommentForm` + `CommentList`.

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `comment-list.tsx` | Unit per `testing-guide-next-frontend` § "Client Components" — renders one row per item, renders "No comments yet" when empty | `components/video/__tests__/comment-list.test.tsx` |
| `comments-section.tsx` | Unit per `testing-guide-next-frontend` § "Client Components" — renders real comment count in the heading, composes `CommentForm` + `CommentList` | `components/video/__tests__/comments-section.test.tsx` |

**Dependencies:** SI-06.0.1 (comment-form.tsx must exist before comments-section.tsx composes it)

**Acceptance criteria:**

- Both components exist at their declared paths and match their UI Contracts.
- Unit tests exercise rendering + composition for each component.
- `npx tsc --noEmit` and `npm run lint` pass in `next-frontend/`.

---

### SI-06.0.3 — Custom-business complex: comment-item

**Description:** Autorar `comment-item.tsx` — o componente mais complexo do sweep (like/dislike, toggle de resposta inline, renderização recursiva de replies).

**Technical actions:**

1. Author `components/video/comment-item.tsx` per `### UI Contracts → Screen: Video Watch Page` — author, text, relative time, like/dislike row (reusing `like-dislike-button.tsx`'s visual shape, scoped to a comment via `PUT /api/comments/[commentId]/reaction`), `ReplyAction` (local toggle state opening an inline reply composer, top-level comments only), and recursive rendering of `replies` with `ReplyAction` hidden.

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `comment-item.tsx` | Unit per `testing-guide-next-frontend` § "Client Components" baseline — renders author/text/time/counts | `components/video/__tests__/comment-item.test.tsx` |
| `comment-item.tsx` | Unit: `ReplyAction` toggle opens/closes the inline composer; `ReplyAction` absent when rendering a reply (depth-1 cap) | (same file) |

**Dependencies:** none

**Acceptance criteria:**

- `comment-item.tsx` exists and matches its UI Contract.
- Unit tests cover baseline rendering, the reply-composer toggle, and the depth-1 `ReplyAction` suppression.
- `npx tsc --noEmit` and `npm run lint` pass in `next-frontend/`.

---

### SI-06.1 — Entidades e migração de dados sociais + exposição de subscribersCount

**Description:** Cria as 4 novas entidades de interação social e os contadores denormalizados em `Video`/`Channel` (per `social-interactions/TD-01`, `TD-02`), e expõe `subscribersCount` nos dois endpoints existentes que já retornam o canal.

**Technical actions:**

1. Criar `VideoReaction`, `CommentReaction`, `Comment`, `Subscription` (per `### Data Model`), e adicionar `likes_count`/`dislikes_count`/`comments_count` a `Video` e `subscribers_count` a `Channel`.
2. Gerar migração via `npm run migration:generate` (TypeORM CLI, per o padrão já usado em `phase-05-video-watch-page`'s `AddVideoViews`) e rodar `npm run migration:run`.
3. Atualizar `VideosService`'s mapper de `GET /videos/public/:publicId` para incluir `channel.subscribersCount` (per `### API Contracts → Modified existing endpoints`).
4. Atualizar `ChannelsService`'s mapper de `GET /channels/:nickname` para incluir `subscribersCount` (per `### API Contracts → Modified existing endpoints`), e o mapper do dashboard (`OwnerVideoListItem`/`PublicVideoListItem`) para parar de retornar `likes`/`comments` fixos em `0` (per `### Data Model → Video (modified)`).

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `VideoReaction` | Integration: unique `(user_id, video_id)`, FK constraints | `nestjs-project/src/videos/entities/video-reaction.entity.integration-spec.ts` |
| `CommentReaction` | Integration: unique `(user_id, comment_id)`, FK constraints | `nestjs-project/src/videos/entities/comment-reaction.entity.integration-spec.ts` |
| `Comment` | Integration: `parent_comment_id` self-FK nullable, defaults | `nestjs-project/src/videos/entities/comment.entity.integration-spec.ts` |
| `Subscription` | Integration: unique `(subscriber_user_id, channel_id)`, FK constraints | `nestjs-project/src/channels/entities/subscription.entity.integration-spec.ts` |
| `VideosService.findPublicVideo` | Integration: response includes `channel.subscribersCount` | `nestjs-project/src/videos/videos.service.integration-spec.ts` |
| `ChannelsService.findByNickname` | Integration: response includes `subscribersCount` | `nestjs-project/src/channels/channels.service.integration-spec.ts` |

**Dependencies:** none

**Acceptance criteria:**

- Migration runs cleanly against a populated `videos`/`channels` table (existing rows backfill `likes_count`/`dislikes_count`/`comments_count`/`subscribers_count` to `0`).
- `GET /videos/public/:publicId` response includes `channel.subscribersCount: 0` for a channel with no subscribers.
- `GET /channels/:nickname` response includes `subscribersCount: 0` for a channel with no subscribers.
- Dashboard listing no longer hardcodes `likes`/`comments` to `0` — reads the new columns.

---

### SI-06.2 — Endpoint de like/dislike de vídeo

**Description:** Implementa o toggle idempotente de like/dislike em vídeos (per `social-interactions/TD-01`, `TD-02`, `TD-03`).

**Route:** PUT /videos/:publicId/reaction

**Test Specs:** see `nestjs-project/specs/video-reaction.plan.md`

**Technical actions:**

1. Criar `VideoReactionService.setReaction(userId, publicId, type)` — resolve o vídeo pelo predicado de visibilidade pública (`phase-05-video-watch-page/TD-01`), faz upsert/delete de `VideoReaction` conforme `type`, e atualiza `videos.likes_count`/`dislikes_count` via `UPDATE ... RETURNING` (per `phase-05-video-watch-page/TD-02`'s atomic-counter pattern).
2. Criar `SetReactionDto` (`type: 'like' | 'dislike' | null`, per `### API Contracts → Validation Rules — Reactions & subscriptions`).
3. Adicionar rota `PUT /videos/:publicId/reaction` em `VideosController`, guardada por `JwtAuthGuard`.
4. Mapear `VIDEO_NOT_FOUND` (per `### Error Catalog`) quando `publicId` não resolve a um vídeo publicamente visível.

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `VideoReactionService.setReaction` | Unit: branch logic (like → dislike flip, like → null removal, mock repo) | `nestjs-project/src/videos/video-reaction.service.spec.ts` |
| `VideoReactionService.setReaction` | Integration: atomic counter under concurrent requests, unique constraint enforcement | `nestjs-project/src/videos/video-reaction.service.integration-spec.ts` |

_E2E scenarios (auth enforcement, idempotency, validation, `VIDEO_NOT_FOUND`) are authored externally per `**Test Specs:**` above._

**Dependencies:** SI-06.1

**Acceptance criteria:**

- `PUT /videos/:publicId/reaction` sem token retorna `401 UNAUTHORIZED`.
- `PUT /videos/:publicId/reaction` com `{ type: 'like' }` autenticado retorna `200` com `likesCount` incrementado e `type: 'like'`.
- Repetir a mesma requisição `{ type: 'like' }` não duplica o incremento (idempotência).
- `PUT /videos/:publicId/reaction` com `{ type: 'dislike' }` após já ter `like` troca o tipo sem passar por um estado intermediário de remoção.
- `PUT /videos/:publicId/reaction` com `publicId` inexistente ou não-visível retorna `404 VIDEO_NOT_FOUND`.

---

### SI-06.4 — Endpoints de comentários (listar + criar)

**Description:** Implementa a listagem paginada de comentários (com replies embutidas) e a criação de comentário de nível superior (per `social-interactions/TD-04`).

**Route:** GET /videos/:publicId/comments, POST /videos/:publicId/comments

**Test Specs:** see `nestjs-project/specs/video-comments.plan.md`

**Technical actions:**

1. Criar `CommentsService.findComments(publicId, { limit, offset })` — retorna comentários de nível superior (`parent_comment_id IS NULL`) com `replies` embutidas, incluindo `currentUserReaction` quando autenticado.
2. Criar `CommentsService.createComment(userId, publicId, body)` — cria `Comment` com `parent_comment_id: null`, incrementa `videos.comments_count` via `UPDATE ... RETURNING`.
3. Criar `CreateCommentDto` (`body: string`, per `### API Contracts → Validation Rules — Comments & replies`).
4. Adicionar rotas `GET /videos/:publicId/comments` (`@Public()`, sem guard) e `POST /videos/:publicId/comments` (`JwtAuthGuard`) em `VideosController`.
5. Mapear `VIDEO_NOT_FOUND` e `validation error` (per `### Error Catalog`).

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `CommentsService.findComments` | Unit: pagination branch logic (mock repo) | `nestjs-project/src/videos/comments.service.spec.ts` |
| `CommentsService.findComments` | Integration: real query, embedded replies shape, `currentUserReaction` for anonymous vs. authenticated | `nestjs-project/src/videos/comments.service.integration-spec.ts` |
| `CommentsService.createComment` | Integration: atomic `comments_count` increment | `nestjs-project/src/videos/comments.service.integration-spec.ts` |

_E2E scenarios (anonymous read, auth-required write, validation, pagination) are authored externally per `**Test Specs:**` above._

**Dependencies:** SI-06.1

**Acceptance criteria:**

- `GET /videos/:publicId/comments` sem token retorna `200` com a lista (leitura anônima).
- `GET /videos/:publicId/comments?limit=1` retorna exatamente 1 item e o `total` correto.
- `POST /videos/:publicId/comments` sem token retorna `401 UNAUTHORIZED`.
- `POST /videos/:publicId/comments` com `{ body: '' }` retorna `400` com erro de validação.
- `POST /videos/:publicId/comments` autenticado com `body` válido retorna `201` e o próximo `GET` reflete o novo comentário e `comments_count` incrementado.

---

### SI-06.5 — Endpoint de like/dislike de comentário

**Description:** Mesmo padrão idempotente de `SI-06.2`, escopado a um comentário (per `social-interactions/TD-01`, `TD-02`, `TD-03`).

**Route:** PUT /comments/:commentId/reaction

**Test Specs:** see `nestjs-project/specs/comment-reaction.plan.md`

**Technical actions:**

1. Criar `CommentReactionService.setReaction(userId, commentId, type)` — upsert/delete de `CommentReaction` conforme `type`, atualiza `comments.likes_count`/`dislikes_count` via `UPDATE ... RETURNING`.
2. Reutilizar `SetReactionDto` (`SI-06.2`).
3. Adicionar rota `PUT /comments/:commentId/reaction` em um novo `CommentsController` (ou extensão do existente), guardada por `JwtAuthGuard`.
4. Mapear `COMMENT_NOT_FOUND` (per `### Error Catalog`).

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `CommentReactionService.setReaction` | Unit: branch logic (mock repo) | `nestjs-project/src/videos/comment-reaction.service.spec.ts` |
| `CommentReactionService.setReaction` | Integration: atomic counter, unique constraint | `nestjs-project/src/videos/comment-reaction.service.integration-spec.ts` |

_E2E scenarios (auth enforcement, idempotency, `COMMENT_NOT_FOUND`) are authored externally per `**Test Specs:**` above._

**Dependencies:** SI-06.4 (comments must exist to be reacted to)

**Acceptance criteria:**

- `PUT /comments/:commentId/reaction` sem token retorna `401 UNAUTHORIZED`.
- `PUT /comments/:commentId/reaction` com `{ type: 'like' }` autenticado retorna `200` com `likesCount` incrementado.
- Repetir a mesma requisição não duplica o incremento.
- `PUT /comments/:commentId/reaction` com `commentId` inexistente retorna `404 COMMENT_NOT_FOUND`.

---

### SI-06.6 — Endpoint de resposta a comentário

**Description:** Implementa a criação de replies com o cap de profundidade única (per `social-interactions/TD-04`).

**Route:** POST /videos/:publicId/comments/:commentId/replies

**Test Specs:** see `nestjs-project/specs/comment-replies.plan.md`

**Technical actions:**

1. Criar `CommentsService.createReply(userId, publicId, commentId, body)` — valida que `commentId` existe e pertence a `publicId`, rejeita quando `commentId`'s `parent_comment_id` já é não-nulo (`REPLY_DEPTH_EXCEEDED`), cria `Comment` com `parent_comment_id: commentId`, incrementa `videos.comments_count`.
2. Reutilizar `CreateCommentDto` (`SI-06.4`).
3. Adicionar rota `POST /videos/:publicId/comments/:commentId/replies` em `VideosController`, guardada por `JwtAuthGuard`.
4. Mapear `VIDEO_NOT_FOUND`, `COMMENT_NOT_FOUND`, `REPLY_DEPTH_EXCEEDED` (per `### Error Catalog`).

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `CommentsService.createReply` | Unit: depth-cap branch logic (mock repo) | `nestjs-project/src/videos/comments.service.spec.ts` |
| `CommentsService.createReply` | Integration: real depth-cap rejection, `comments_count` increment | `nestjs-project/src/videos/comments.service.integration-spec.ts` |

_E2E scenarios (auth, depth-cap rejection, validation) are authored externally per `**Test Specs:**` above._

**Dependencies:** SI-06.4

**Acceptance criteria:**

- `POST /videos/:publicId/comments/:commentId/replies` sem token retorna `401 UNAUTHORIZED`.
- Responder a um comentário de nível superior retorna `201` e o próximo `GET /videos/:publicId/comments` mostra a reply embutida em `replies`.
- Responder a uma reply existente (cujo `parent_comment_id` já é não-nulo) retorna `400 REPLY_DEPTH_EXCEEDED`.
- `commentId` ou `publicId` inexistente retorna `404`.

---

### SI-06.7 — Endpoint de inscrição em canal

**Description:** Implementa o toggle idempotente de inscrição em canal, com a proteção contra auto-inscrição (per `social-interactions/TD-02`, `TD-03`).

**Route:** PUT /channels/:nickname/subscription

**Test Specs:** see `nestjs-project/specs/channel-subscription.plan.md`

**Technical actions:**

1. Criar `SubscriptionService.setSubscription(userId, nickname, subscribed)` — resolve o canal por `nickname`, rejeita quando `userId` é o dono do canal (`CANNOT_SUBSCRIBE_OWN_CHANNEL`), faz upsert/delete de `Subscription`, atualiza `channels.subscribers_count` via `UPDATE ... RETURNING`.
2. Criar `SetSubscriptionDto` (`subscribed: boolean`, per `### API Contracts → Validation Rules — Reactions & subscriptions`).
3. Adicionar rota `PUT /channels/:nickname/subscription` em `ChannelsController`, guardada por `JwtAuthGuard`.
4. Mapear `CHANNEL_NOT_FOUND`, `CANNOT_SUBSCRIBE_OWN_CHANNEL` (per `### Error Catalog`).

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `SubscriptionService.setSubscription` | Unit: self-subscribe rejection, branch logic (mock repo) | `nestjs-project/src/channels/subscription.service.spec.ts` |
| `SubscriptionService.setSubscription` | Integration: atomic counter, unique constraint | `nestjs-project/src/channels/subscription.service.integration-spec.ts` |

_E2E scenarios (auth, idempotency, self-subscribe rejection, `CHANNEL_NOT_FOUND`) are authored externally per `**Test Specs:**` above._

**Dependencies:** SI-06.1

**Acceptance criteria:**

- `PUT /channels/:nickname/subscription` sem token retorna `401 UNAUTHORIZED`.
- `{ subscribed: true }` autenticado (não-dono) retorna `200` com `subscribersCount` incrementado.
- Repetir a mesma requisição não duplica o incremento.
- O dono do canal tentando se inscrever no próprio canal retorna `409 CANNOT_SUBSCRIBE_OWN_CHANNEL`.
- `nickname` inexistente retorna `404 CHANNEL_NOT_FOUND`.

---

### SI-06.8 — Endpoint de canais seguidos

**Description:** Lista paginada dos canais que o usuário autenticado segue (per `social-interactions/TD-05`, herdando a convenção offset/limit de `phase-04-video-channel-management/TD-05`).

**Route:** GET /users/me/subscriptions

**Test Specs:** see `nestjs-project/specs/my-subscriptions.plan.md`

**Technical actions:**

1. Criar `SubscriptionService.findMySubscriptions(userId, { limit, offset })` — retorna os canais seguidos por `userId`, paginado.
2. Adicionar rota `GET /users/me/subscriptions` (novo `UsersController` ou extensão do existente), guardada por `JwtAuthGuard`.

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `SubscriptionService.findMySubscriptions` | Unit: pagination branch logic (mock repo) | `nestjs-project/src/channels/subscription.service.spec.ts` |
| `SubscriptionService.findMySubscriptions` | Integration: real paginated query | `nestjs-project/src/channels/subscription.service.integration-spec.ts` |

_E2E scenarios (auth enforcement, pagination) are authored externally per `**Test Specs:**` above._

**Dependencies:** SI-06.7

**Acceptance criteria:**

- `GET /users/me/subscriptions` sem token retorna `401 UNAUTHORIZED`.
- Após seguir 2 canais, `GET /users/me/subscriptions` retorna os 2 canais e `total: 2`.
- `GET /users/me/subscriptions?limit=1` retorna exatamente 1 item.

---

### SI-06.9 — BFF: rotas de reaction (vídeo + comentário)

**Description:** Route Handlers same-origin que proxeiam os dois endpoints de reaction (per `next-frontend/CLAUDE.md`'s strict-BFF model).

**Technical actions:**

1. Criar `app/api/videos/public/[publicId]/reaction/route.ts` (`PUT`) per `### API Contracts → BFF tier`.
2. Criar `app/api/comments/[commentId]/reaction/route.ts` (`PUT`) per `### API Contracts → BFF tier`.
3. Adicionar handlers MSW para os dois endpoints em `mocks/handlers/videos.ts` (ou novo `mocks/handlers/reactions.ts`, per `next-frontend-msw-foundation/TD-01`'s per-domain-file convention) + registrar no barrel.
4. Regenerar `openapi.json`/`types.gen.ts` via o fluxo já estabelecido (`npm run openapi:export` no backend + script de sync + `npm run openapi:types`, per `next-frontend-openapi-typing/TD-01..03`).

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `app/api/videos/public/[publicId]/reaction/route.ts` | Integration (Vitest + MSW): forwards request shape, pass-through response/errors | `app/api/videos/public/[publicId]/reaction/__tests__/route.integration.test.ts` |
| `app/api/comments/[commentId]/reaction/route.ts` | Integration (Vitest + MSW): forwards request shape, pass-through response/errors | `app/api/comments/[commentId]/reaction/__tests__/route.integration.test.ts` |

**Dependencies:** SI-06.2, SI-06.5

**Acceptance criteria:**

- `PUT /api/videos/public/[publicId]/reaction` forwards to `PUT /videos/:publicId/reaction` with the exact request body and returns the upstream response/status unchanged.
- `PUT /api/comments/[commentId]/reaction` forwards to `PUT /comments/:commentId/reaction` with the exact request body and returns the upstream response/status unchanged.
- `npx tsc --noEmit` passes after `types.gen.ts` regeneration (no stale-type errors).

---

### SI-06.10 — BFF: rotas de comentários (listar + criar)

**Description:** Route Handler same-origin para listagem (anônima) e criação (autenticada) de comentários.

**Technical actions:**

1. Criar `app/api/videos/public/[publicId]/comments/route.ts` (`GET`, `POST`) per `### API Contracts → BFF tier`.
2. Adicionar handlers MSW para os dois endpoints em `mocks/handlers/videos.ts` (ou `mocks/handlers/reactions.ts`).

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `app/api/videos/public/[publicId]/comments/route.ts` | Integration (Vitest + MSW): `GET` forwards query params + pass-through, `POST` forwards body + auth + pass-through errors | `app/api/videos/public/[publicId]/comments/__tests__/route.integration.test.ts` |

**Dependencies:** SI-06.4

**Acceptance criteria:**

- `GET /api/videos/public/[publicId]/comments?limit=1` forwards `limit=1` and returns the upstream `items`/`total` unchanged.
- `POST /api/videos/public/[publicId]/comments` forwards the request body and returns the upstream `201` response or error unchanged.

---

### SI-06.11 — BFF: rota de resposta a comentário

**Description:** Route Handler same-origin para criação de reply.

**Technical actions:**

1. Criar `app/api/videos/public/[publicId]/comments/[commentId]/replies/route.ts` (`POST`) per `### API Contracts → BFF tier`.
2. Adicionar handler MSW para o endpoint.

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `app/api/videos/public/[publicId]/comments/[commentId]/replies/route.ts` | Integration (Vitest + MSW): forwards body, pass-through `201`/errors incluindo `REPLY_DEPTH_EXCEEDED` | `app/api/videos/public/[publicId]/comments/[commentId]/replies/__tests__/route.integration.test.ts` |

**Dependencies:** SI-06.6

**Acceptance criteria:**

- `POST /api/videos/public/[publicId]/comments/[commentId]/replies` forwards the request body and returns the upstream response/status unchanged, including `REPLY_DEPTH_EXCEEDED`.

---

### SI-06.12 — BFF: rota de inscrição em canal

**Description:** Route Handler same-origin para o toggle de inscrição.

**Technical actions:**

1. Criar `app/api/channels/[nickname]/subscription/route.ts` (`PUT`) per `### API Contracts → BFF tier`.
2. Adicionar handler MSW para o endpoint em `mocks/handlers/channels.ts`.

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `app/api/channels/[nickname]/subscription/route.ts` | Integration (Vitest + MSW): forwards body, pass-through response incluindo `CANNOT_SUBSCRIBE_OWN_CHANNEL` | `app/api/channels/[nickname]/subscription/__tests__/route.integration.test.ts` |

**Dependencies:** SI-06.7

**Acceptance criteria:**

- `PUT /api/channels/[nickname]/subscription` forwards the request body and returns the upstream response/status unchanged, including `CANNOT_SUBSCRIBE_OWN_CHANNEL`.

---

### SI-06.13 — BFF: rota de canais seguidos

**Description:** Route Handler same-origin para a listagem paginada de canais seguidos, consumida pela nova Followed Channels Page.

**Technical actions:**

1. Criar `app/api/subscriptions/route.ts` (`GET`) per `### API Contracts → BFF tier` — forwards `limit`/`offset` query params.
2. Adicionar handler MSW para o endpoint.

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `app/api/subscriptions/route.ts` | Integration (Vitest + MSW): forwards query params, pass-through response | `app/api/subscriptions/__tests__/route.integration.test.ts` |

**Dependencies:** SI-06.8

**Acceptance criteria:**

- `GET /api/subscriptions?limit=1` forwards `limit=1` and returns the upstream `items`/`total` unchanged.
- Request without a valid session returns the upstream `401` unchanged.

---

### SI-06.17 — Padrão useOptimistic para ações sociais (Setup)

**Frontend Runtime spec:** see `## Technical Specifications` → `### Frontend Runtime` → `#### social-interactions/TD-06 — Frontend Interaction Pattern for Social Actions`

**Technical actions:**

1. Nenhuma instalação necessária — `useOptimistic` é nativo do React 19, já presente em `next-frontend/package.json`. Documentar o padrão canônico (per `### Frontend Runtime → Setup` snippet) diretamente no primeiro componente que o adota, `components/video/comment-form.tsx` (já autorado em `SI-06.0.1`), como referência para as demais migrações.
2. Confirmar que `components/video/comment-form.tsx` usa o snippet canônico (`useOptimistic` + `startTransition` + `fetch` + `router.refresh()`) como implementação de referência.

**Dependencies:** —

**Tests:** _(empty — Setup SI; smoke-gated by AC; behavior tests live in Migration SIs)_

**Acceptance criteria:**

- Nenhuma nova dependência adicionada a `package.json` (confirmado: `useOptimistic` é built-in do React 19 já instalado).
- `components/video/comment-form.tsx` usa `useOptimistic` + `startTransition` per o snippet canônico.
- Aplicação builda sem erro relacionado ao novo padrão.

---

### SI-06.18 — Migração: like-dislike-button.tsx → useOptimistic

**Frontend Runtime spec:** see `## Technical Specifications` → `### Frontend Runtime` → `#### social-interactions/TD-06` → Migração row for `components/video/like-dislike-button.tsx`

**Technical actions:**

1. Ler `components/video/like-dislike-button.tsx` — stub visual estático do `phase-05-video-watch-page` (contagem "24K" fixa, sem `onClick`).
2. Converter em `"use client"`, receber `likesCount`/`dislikesCount`/`currentUserReaction` como props, usar `useOptimistic` + `startTransition` para chamar `PUT /api/videos/public/[publicId]/reaction` no clique, per o snippet canônico de `SI-06.17`.
3. Atualizar `app/watch/[publicId]/page.tsx` para passar `likesCount`/`dislikesCount`/`currentUserReaction` reais (vindos de `GET /api/videos/public/[publicId]`) em vez do placeholder estático.

**Dependencies:** SI-06.17, SI-06.9

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `like-dislike-button.tsx` | Unit per `testing-guide-next-frontend` § "Client Components" — clique aplica estado otimista antes do fetch resolver; reverte em erro (MSW error trigger) | `components/video/__tests__/like-dislike-button.test.tsx` |

**Acceptance criteria:**

- `like-dislike-button.tsx` não contém mais texto/contagem hardcoded — renderiza `likesCount`/`dislikesCount` reais recebidos via props.
- `like-dislike-button.tsx` usa `useOptimistic` (grep-verificável).
- Clicar em "like" atualiza a UI imediatamente, antes da resposta do `fetch`.
- Uma falha de rede (MSW error trigger) reverte o estado otimista ao valor anterior.

---

### SI-06.19 — Migração: channel-public-page.tsx SubscribeButton → useOptimistic

**Frontend Runtime spec:** see `## Technical Specifications` → `### Frontend Runtime` → `#### social-interactions/TD-06` → Migração row for `components/channel/channel-public-page.tsx`

**Technical actions:**

1. Ler `components/channel/channel-public-page.tsx` — `SubscribeButton` é um stub `variant="destructive"` do `phase-04-video-channel-management`, sem `onClick`.
2. Adicionar `useOptimistic` + `startTransition` ao `SubscribeButton` (o arquivo já é `"use client"`) para chamar `PUT /api/channels/[nickname]/subscription` no clique, per o snippet canônico de `SI-06.17`; ocultar o botão quando `isOwnChannel` (per `CANNOT_SUBSCRIBE_OWN_CHANNEL`).
3. Atualizar `app/channel/[nickname]/page.tsx` para passar o `subscriberCount` real de `GET /api/channels/[nickname]` (que agora inclui o campo, per `SI-06.1`) em vez de sempre `undefined`.

**Dependencies:** SI-06.17, SI-06.12, SI-06.1

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `channel-public-page.tsx` | Unit per `testing-guide-next-frontend` § "Client Components" — clique no `SubscribeButton` aplica estado otimista; botão ausente quando `isOwnChannel` | `components/channel/__tests__/channel-public-page.test.tsx` |

**Acceptance criteria:**

- `SubscribeButton` usa `useOptimistic` (grep-verificável) e não é mais um stub sem `onClick`.
- Clicar em "Subscribe" atualiza a UI imediatamente, antes da resposta do `fetch`.
- `SubscribeButton` não é renderizado quando o usuário autenticado é o dono do canal.
- `subscriberCount` exibido na página reflete o valor real retornado pelo backend (não mais sempre oculto).

---

### SI-06.14b — Video Watch Page: composição da página (seção de comentários real)

**Description:** Troca o `CommentsSectionStub` (fase 05) pela nova `CommentsSection` real, encerrando o último placeholder desta tela.

**Test Specs:** see `next-frontend/specs/video-watch-page.plan.md`

**Technical actions:**

1. Em `app/watch/[publicId]/page.tsx`, substituir `<CommentsSectionStub />` por `<CommentsSection videoPublicId={publicId} />` (per `### UI Contracts → Screen: Video Watch Page`).
2. Deletar `components/video/comments-section-stub.tsx` (não é mais referenciado por nenhum arquivo).

**Tests:** _(empty — `app/watch/[publicId]/page.tsx` is an async Server Component per `testing-guide-next-frontend` § "Pages"; not Vitest-renderable. E2E scenario authored externally per `**Test Specs:**` above)_

**Dependencies:** SI-06.0.2, SI-06.10

**Acceptance criteria:**

- `app/watch/[publicId]/page.tsx` não referencia mais `CommentsSectionStub`.
- `components/video/comments-section-stub.tsx` não existe mais no repositório.
- A página renderiza a lista real de comentários do vídeo.

---

### SI-06.16b — Followed Channels Page: composição da página

**Description:** Nova rota `/subscriptions` — Server Component + `searchParams`, sem cache client-side, compondo os componentes autorados em `SI-06.0.1` (per `### UI Contracts → Screen: Followed Channels Page`).

**Test Specs:** see `next-frontend/specs/subscriptions.plan.md`

**Technical actions:**

1. Criar `app/subscriptions/page.tsx` (Server Component) — lê `?page=` de `searchParams`, faz `fetch` em `GET /api/subscriptions` com `limit`/`offset` derivados, renderiza `SubscribedChannelsList` + `PaginationControls`.
2. Criar `app/subscriptions/loading.tsx` — skeleton per a convenção estabelecida do projeto.

**Tests:** _(empty — `app/subscriptions/page.tsx` is an async Server Component per `testing-guide-next-frontend` § "Pages"; not Vitest-renderable. E2E scenarios authored externally per `**Test Specs:**` above)_

**Dependencies:** SI-06.0.1, SI-06.13

**Acceptance criteria:**

- `/subscriptions` acessado por um usuário autenticado renderiza a lista real de canais seguidos.
- `/subscriptions` acessado por um usuário anônimo redireciona para `/login`.
- `/subscriptions?page=2` renderiza a segunda página da listagem.
- `app/subscriptions/loading.tsx` existe e é exibido durante o carregamento.

---

## Technical Specifications

### Data Model

#### VideoReaction

| Field | Type | Constraints |
|-------|------|-------------|
| id | uuid | PK, generated |
| user_id | uuid | FK → `users.id`, not null |
| video_id | uuid | FK → `videos.id`, not null |
| type | enum('like', 'dislike') | not null |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

**Relations:** `User` has many `VideoReaction`; `Video` has many `VideoReaction`.
**Indexes:** unique on `(user_id, video_id)` — one reaction per user per video *(per `social-interactions/TD-02`, dedicated per-domain table with a real FK; `social-interactions/TD-03`'s idempotent `PUT` upserts/deletes this row to match the requested state)*.

---

#### CommentReaction

| Field | Type | Constraints |
|-------|------|-------------|
| id | uuid | PK, generated |
| user_id | uuid | FK → `users.id`, not null |
| comment_id | uuid | FK → `comments.id`, not null |
| type | enum('like', 'dislike') | not null |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

**Relations:** `User` has many `CommentReaction`; `Comment` has many `CommentReaction`.
**Indexes:** unique on `(user_id, comment_id)` *(per `social-interactions/TD-02`)*.

---

#### Comment

| Field | Type | Constraints |
|-------|------|-------------|
| id | uuid | PK, generated |
| video_id | uuid | FK → `videos.id`, not null |
| user_id | uuid | FK → `users.id`, not null (author) |
| parent_comment_id | uuid, nullable | FK → `comments.id` (self-referencing), nullable |
| body | text | not null |
| likes_count | int | default 0 |
| dislikes_count | int | default 0 |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

**Relations:** `Video` has many `Comment`; `User` has many `Comment` (author); `Comment` has many `Comment` (self-referencing replies via `parent_comment_id`, adjacency list).
**Indexes:** index on `(video_id, parent_comment_id)` for the paginated top-level-comments-plus-replies query.
**Constraints (application-level, not DB):** a comment whose `parent_comment_id` is already non-null cannot itself be the target of a new reply — single-level depth cap *(per `social-interactions/TD-04`, Option A: adjacency list capped at depth 1; the cap is enforced in the service layer, not the schema)*.
**Counter strategy:** `likes_count`/`dislikes_count` are denormalized atomic counters, updated via `UPDATE ... SET col = col + 1 RETURNING col` on every `CommentReaction` insert/update/delete *(per `social-interactions/TD-01`, reusing the atomic-counter pattern established for `videos.views` in `phase-05-video-watch-page/TD-02`)*.

---

#### Subscription

| Field | Type | Constraints |
|-------|------|-------------|
| id | uuid | PK, generated |
| subscriber_user_id | uuid | FK → `users.id`, not null |
| channel_id | uuid | FK → `channels.id`, not null |
| created_at | timestamptz | default now() |

**Relations:** `User` has many `Subscription` (as subscriber); `Channel` has many `Subscription` (as followed channel).
**Indexes:** unique on `(subscriber_user_id, channel_id)` — one subscription row per user per channel *(per `social-interactions/TD-02`, dedicated table, same convention as `VideoReaction`/`CommentReaction`)*.

---

#### Video (modified)

| Field | Type | Constraints |
|-------|------|-------------|
| likes_count | int | default 0 (new column) |
| dislikes_count | int | default 0 (new column) |
| comments_count | int | default 0 (new column) |

**Counter strategy:** all three are denormalized atomic counters, updated via `UPDATE ... SET col = col + 1 RETURNING col` on every `VideoReaction` insert/update/delete (`likes_count`/`dislikes_count`) or `Comment` insert (`comments_count`) *(per `social-interactions/TD-01`)*. Replaces the hardcoded `0` placeholders `channels.service.ts` has carried since `phase-04-video-channel-management` (`// views/likes/comments are fixed at 0 — those subsystems ... don't exist until Phase 05/06`) for the owner dashboard's `OwnerVideoListItem`/`PublicVideoListItem` mappers.

---

#### Channel (modified)

| Field | Type | Constraints |
|-------|------|-------------|
| subscribers_count | int | default 0 (new column) |

**Counter strategy:** denormalized atomic counter, updated via `UPDATE ... SET col = col + 1 RETURNING col` on every `Subscription` insert/delete *(per `social-interactions/TD-01`)*. Fills the `subscriberCount?: number` prop `channel-public-page.tsx` and `channel-settings-form.tsx` have carried as always-`undefined` since `phase-04-video-channel-management`.

---

### API Contracts

## Backend tier

#### PUT /videos/:publicId/reaction (SI-06.2)

**Request headers:**
- Authorization: Bearer {access_token}

**Request body:**
- type: 'like' | 'dislike' | null, required — the reaction state the client wants to end up in; `null` removes any existing reaction

**Response 200:**
- type: 'like' | 'dislike' | null
- likesCount: number
- dislikesCount: number

**Error responses:**
- 401 UNAUTHORIZED: when no valid access token is presented
- 404 VIDEO_NOT_FOUND: when `publicId` does not resolve to a publicly-visible video (same predicate as `phase-05-video-watch-page/TD-01`: `published_at IS NOT NULL AND visibility` allows the caller)
- 400 validation error: when `type` is present but not one of `'like' | 'dislike' | null`

*(Idempotent "set state" contract per `social-interactions/TD-03`, Option A — repeating the same request is safe.)*

---

#### PUT /comments/:commentId/reaction (SI-06.5)

**Request headers:**
- Authorization: Bearer {access_token}

**Request body:**
- type: 'like' | 'dislike' | null, required

**Response 200:**
- type: 'like' | 'dislike' | null
- likesCount: number
- dislikesCount: number

**Error responses:**
- 401 UNAUTHORIZED
- 404 COMMENT_NOT_FOUND: when `commentId` does not exist
- 400 validation error

*(Same idempotent contract as the video reaction endpoint, scoped to a comment — per `social-interactions/TD-01`, `TD-02`, `TD-03`.)*

---

#### GET /videos/:publicId/comments (SI-06.4)

**Request query parameters:**
- limit: number, optional, default 20, max 50
- offset: number, optional, default 0

**Response 200:**
- items: array of:
  - id: string (uuid)
  - body: string
  - author: `{ id: string, nickname: string }`
  - createdAt: string (ISO-8601)
  - likesCount: number
  - dislikesCount: number
  - currentUserReaction: 'like' | 'dislike' | null — `null` when the request is anonymous
  - replies: array of the same shape (depth 1, no further nested `replies` field)
- total: number

**Error responses:**
- 404 VIDEO_NOT_FOUND: same visibility predicate as above

*(No `Authorization` header required — anonymous read, consistent with the project's established public/anonymous-read convention for video-scoped data. Embeds replies alongside top-level comments in one response per `social-interactions/TD-04`, Option A — no separate reply-pagination endpoint.)*

---

#### POST /videos/:publicId/comments (SI-06.4)

**Request headers:**
- Authorization: Bearer {access_token}

**Request body:**
- body: string, required, min 1, max 2000 characters

**Response 201:**
- id, body, author, createdAt, likesCount: 0, dislikesCount: 0, currentUserReaction: null, replies: []

**Error responses:**
- 401 UNAUTHORIZED
- 404 VIDEO_NOT_FOUND
- 400 validation error: when `body` is empty or exceeds 2000 characters

---

#### POST /videos/:publicId/comments/:commentId/replies (SI-06.6)

**Request headers:**
- Authorization: Bearer {access_token}

**Request body:**
- body: string, required, min 1, max 2000 characters

**Response 201:**
- id, body, author, createdAt, likesCount: 0, dislikesCount: 0, currentUserReaction: null

**Error responses:**
- 401 UNAUTHORIZED
- 404 VIDEO_NOT_FOUND or COMMENT_NOT_FOUND: when the video or the target comment does not exist
- 400 REPLY_DEPTH_EXCEEDED: when `commentId` already has a non-null `parent_comment_id` — replies cannot themselves be replied to *(per `social-interactions/TD-04`, single-level depth cap)*
- 400 validation error

---

#### PUT /channels/:nickname/subscription (SI-06.7)

**Request headers:**
- Authorization: Bearer {access_token}

**Request body:**
- subscribed: boolean, required — the subscription state the client wants to end up in

**Response 200:**
- subscribed: boolean
- subscribersCount: number

**Error responses:**
- 401 UNAUTHORIZED
- 404 CHANNEL_NOT_FOUND
- 409 CANNOT_SUBSCRIBE_OWN_CHANNEL: when the authenticated user is the owner of `:nickname`'s channel
- 400 validation error

*(Idempotent "set state" contract, same pattern as the reaction endpoints — per `social-interactions/TD-03`.)*

---

#### GET /users/me/subscriptions (SI-06.8)

**Request headers:**
- Authorization: Bearer {access_token}

**Request query parameters:**
- limit: number, optional, default 20, max 50
- offset: number, optional, default 0

**Response 200:**
- items: array of `{ id: string, nickname: string, name: string, avatarUrl: string | null }`
- total: number

**Error responses:**
- 401 UNAUTHORIZED

*(Offset/limit pagination, inheriting `phase-04-video-channel-management/TD-05`'s channel-scoped-list convention — per `social-interactions/TD-05`.)*

---

#### Modified existing endpoints (subscriber count exposure)

Two endpoints from prior phases gain a new response field so the real `channels.subscribers_count` (per `social-interactions/TD-01`) reaches the two screens that display it — no new endpoint, no new route, field addition only:

- **`GET /videos/public/:publicId`** (SI-06.1) — introduced in `phase-05-video-watch-page/TD-01`. Response gains `channel.subscribersCount: number`, alongside the existing nested `channel` object this endpoint already returns.
- **`GET /channels/:nickname`** (SI-06.1) — introduced in `phase-04-video-channel-management`. Response gains `subscribersCount: number` at the top level.

Both reuse the same atomic-counter column (`social-interactions/TD-01`) — no duplicated write path, only a duplicated read projection. The FE-facing BFF routes for both already exist (`GET /api/videos/public/[publicId]`, `GET /api/channels/[nickname]`) and pass the new field through unchanged — no new BFF-tier block needed, the existing pass-through already forwards the full upstream response body.

#### Validation Rules — Comments & replies

- `body`: required, min 1, max 2000 characters (both top-level comments and replies)

#### Validation Rules — Reactions & subscriptions

- `type` (video/comment reaction): required, one of `'like' | 'dislike' | null`
- `subscribed` (channel subscription): required, boolean

## BFF tier (frontend-exposed contract)

> _BFF tier — frontend-exposed contract. The browser calls the FE-facing route; the route proxies the upstream per `next-frontend/CLAUDE.md`'s strict-BFF model (same-origin Route Handler under `app/api/**`, server-side `fetch` to `env.API_URL`)._

#### PUT /api/videos/public/[publicId]/reaction (SI-06.9)

**forwards-to:** `PUT /videos/:publicId/reaction` *(derived: this phase's own backend tier above)*

**Request headers:**
- Content-Type: application/json *(derived: this phase's own backend tier above)*

**Request body:** `{ type: 'like' | 'dislike' | null }` *(derived: this phase's own backend tier above — fields per the backend tier; not re-spelled here to avoid duplication)*

**Response 200 (FE-facing):** `{ type, likesCount, dislikesCount }` — pass-through *(derived: this phase's own backend tier above; reshape: none)*

**Error responses (FE-facing):**
- 401 UNAUTHORIZED: pass-through *(derived: this phase's own backend tier above)*
- 404 VIDEO_NOT_FOUND: pass-through *(derived: this phase's own backend tier above)*
- 400 validation error: pass-through *(derived: this phase's own backend tier above)*

---

#### PUT /api/comments/[commentId]/reaction (SI-06.9)

**forwards-to:** `PUT /comments/:commentId/reaction` *(derived: this phase's own backend tier above)*

**Request headers:**
- Content-Type: application/json *(derived: this phase's own backend tier above)*

**Request body:** `{ type: 'like' | 'dislike' | null }` *(derived: this phase's own backend tier above)*

**Response 200 (FE-facing):** `{ type, likesCount, dislikesCount }` — pass-through *(derived: this phase's own backend tier above)*

**Error responses (FE-facing):**
- 401 UNAUTHORIZED: pass-through *(derived: this phase's own backend tier above)*
- 404 COMMENT_NOT_FOUND: pass-through *(derived: this phase's own backend tier above)*
- 400 validation error: pass-through *(derived: this phase's own backend tier above)*

---

#### GET /api/videos/public/[publicId]/comments (SI-06.10)

**forwards-to:** `GET /videos/:publicId/comments` *(derived: this phase's own backend tier above)*

**Request query parameters:**
- limit, offset *(derived: this phase's own backend tier above)*

**Response 200 (FE-facing):** `{ items, total }` — pass-through *(derived: this phase's own backend tier above; reshape: none)*

**Error responses (FE-facing):**
- 404 VIDEO_NOT_FOUND: pass-through *(derived: this phase's own backend tier above)*

---

#### POST /api/videos/public/[publicId]/comments (SI-06.10)

**forwards-to:** `POST /videos/:publicId/comments` *(derived: this phase's own backend tier above)*

**Request headers:**
- Content-Type: application/json *(derived: this phase's own backend tier above)*

**Request body:** `{ body: string }` *(derived: this phase's own backend tier above)*

**Response 201 (FE-facing):** Comment DTO — pass-through *(derived: this phase's own backend tier above)*

**Error responses (FE-facing):**
- 401 UNAUTHORIZED: pass-through *(derived: this phase's own backend tier above)*
- 404 VIDEO_NOT_FOUND: pass-through *(derived: this phase's own backend tier above)*
- 400 validation error: pass-through *(derived: this phase's own backend tier above)*

---

#### POST /api/videos/public/[publicId]/comments/[commentId]/replies (SI-06.11)

**forwards-to:** `POST /videos/:publicId/comments/:commentId/replies` *(derived: this phase's own backend tier above)*

**Request headers:**
- Content-Type: application/json *(derived: this phase's own backend tier above)*

**Request body:** `{ body: string }` *(derived: this phase's own backend tier above)*

**Response 201 (FE-facing):** Comment DTO — pass-through *(derived: this phase's own backend tier above)*

**Error responses (FE-facing):**
- 401 UNAUTHORIZED: pass-through *(derived: this phase's own backend tier above)*
- 404 VIDEO_NOT_FOUND or COMMENT_NOT_FOUND: pass-through *(derived: this phase's own backend tier above)*
- 400 REPLY_DEPTH_EXCEEDED: pass-through *(derived: this phase's own backend tier above)*
- 400 validation error: pass-through *(derived: this phase's own backend tier above)*

---

#### PUT /api/channels/[nickname]/subscription (SI-06.12)

**forwards-to:** `PUT /channels/:nickname/subscription` *(derived: this phase's own backend tier above)*

**Request headers:**
- Content-Type: application/json *(derived: this phase's own backend tier above)*

**Request body:** `{ subscribed: boolean }` *(derived: this phase's own backend tier above)*

**Response 200 (FE-facing):** `{ subscribed, subscribersCount }` — pass-through *(derived: this phase's own backend tier above)*

**Error responses (FE-facing):**
- 401 UNAUTHORIZED: pass-through *(derived: this phase's own backend tier above)*
- 404 CHANNEL_NOT_FOUND: pass-through *(derived: this phase's own backend tier above)*
- 409 CANNOT_SUBSCRIBE_OWN_CHANNEL: pass-through *(derived: this phase's own backend tier above)*
- 400 validation error: pass-through *(derived: this phase's own backend tier above)*

---

#### GET /api/subscriptions (SI-06.13)

**forwards-to:** `GET /users/me/subscriptions` *(derived: this phase's own backend tier above)*

**Request query parameters:**
- limit, offset *(derived: this phase's own backend tier above)*

**Response 200 (FE-facing):** `{ items, total }` — pass-through *(derived: this phase's own backend tier above)*

**Error responses (FE-facing):**
- 401 UNAUTHORIZED: pass-through *(derived: this phase's own backend tier above)*

*(Route path `/api/subscriptions` is a projection decision — not itself in the upstream contract — chosen to mirror the Followed Channels Page's own route `/subscriptions` per `social-interactions/TD-05`; tagged as a BFF-only routing choice, not a reshape.)*

### Authorization Matrix

| Endpoint | Anonymous | Authenticated |
|----------|-----------|----------------|
| PUT /videos/:publicId/reaction | ✗ | ✓ |
| PUT /comments/:commentId/reaction | ✗ | ✓ |
| GET /videos/:publicId/comments | ✓ | ✓ |
| POST /videos/:publicId/comments | ✗ | ✓ |
| POST /videos/:publicId/comments/:commentId/replies | ✗ | ✓ |
| PUT /channels/:nickname/subscription | ✗ | ✓ |
| GET /users/me/subscriptions | ✗ | ✓ |

### Error Catalog

| errorCode | HTTP | Trigger |
|-----------|------|---------|
| UNAUTHORIZED | 401 | Reaction, comment, reply, or subscription action attempted without a valid access token *(error envelope shape per `phase-02-auth/TD-07`, inherited)* |
| VIDEO_NOT_FOUND | 404 | Reaction, comment listing, comment creation, or reply targets a `publicId` that doesn't resolve to a publicly-visible video |
| COMMENT_NOT_FOUND | 404 | Reaction or reply targets a `commentId` that doesn't exist |
| CHANNEL_NOT_FOUND | 404 | Subscription action targets a `nickname` that doesn't exist |
| REPLY_DEPTH_EXCEEDED | 400 | Attempting to reply to a comment that is itself already a reply (`parent_comment_id` already set) |
| CANNOT_SUBSCRIBE_OWN_CHANNEL | 409 | Authenticated user attempts to subscribe to the channel they own |
| validation error | 400 | Request body fails DTO validation (e.g., `type` not in `'like' \| 'dislike' \| null`, `body` empty or over 2000 characters) |


### UI Contracts

#### Screen: Video Watch Page

**Route:** `/watch/[publicId]`
**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-1013 (node `40c57EfcNjN6u5St7n5SlG:39:1013`)
**Purpose:** "Complete comments, likes, and subscriptions interface" — this screen was fully built in `phase-05-video-watch-page/`; this phase only wires the social-interaction components it left as inert stubs.

**Auth requirement:** Mixed — page load and comment reading stay Anonymous (per `phase-05-video-watch-page/TD-01`'s already-shipped "Anonymous access to video viewing"); liking/disliking the video, posting a comment or reply, liking/disliking a comment, and subscribing all require Authenticated (see `### Authorization Matrix`). The most-restrictive heuristic would flip this whole screen to Authenticated, which is wrong — this screen is the `mixed-auth-intentional` case explicitly carved out by this template's field-derivation rules.

**Rendering strategy:** Server Component page shell (established in `phase-05-video-watch-page`, unchanged); `LikeDislikeButton`, `CommentForm`, `CommentList`/`CommentItem`, `ReplyAction`, and the video-row `SubscribeButton` become small `"use client"` islands using React 19 `useOptimistic` _(source: `social-interactions/TD-06`)_.

**Reused DS components:**
- `components/video/like-dislike-button.tsx` — existing visual-only stub from `phase-05-video-watch-page`, wired with real data + `onClick` in this phase
- `components/ui/button.tsx` — underlying primitive for the video-row `SubscribeButton`
- `components/video/comments-section.tsx (new)` — replaces the phase-05 stub `components/video/comments-section-stub.tsx` (deleted); composes the comment count heading + sort trigger (inline) + `CommentForm` + `CommentList`
- `components/video/comment-form.tsx (new)` — the "Add a comment..." composer
- `components/video/comment-list.tsx (new)` — fetches/renders the paginated top-level comment list, one `CommentItem` per entry
- `components/video/comment-item.tsx (new)` — one comment or reply row (author, text, like/dislike, Reply action for top-level only); local toggle state for the inline reply composer; renders its own `replies` recursively via the same component with the Reply action hidden

**Server-connected components:**
- `LikeDislikeButton` — verbs: curtir/descurtir o vídeo | endpoint: `PUT /api/videos/public/[publicId]/reaction` (§API Contracts → BFF tier) | reuse: `components/video/like-dislike-button.tsx`
- `SubscribeButton` — verbs: inscrever-se/cancelar inscrição | endpoint: `PUT /api/channels/[nickname]/subscription` (§API Contracts → BFF tier) | reuse: `components/ui/button.tsx`
- `SubscriberCount` — verbs: exibir contagem de inscritos | endpoint: `GET /api/videos/public/[publicId]` (§API Contracts → Modified existing endpoints) | reuse: new (inline in `comments-section.tsx`'s sibling channel row, no separate file — same pattern as `phase-05-video-watch-page`'s `ViewCountAndDate`)
- `CommentCount` — verbs: exibir contagem de comentários | endpoint: `GET /api/videos/public/[publicId]/comments` (§API Contracts → BFF tier) | reuse: new (inline in `comments-section.tsx`, no separate file)
- `CommentForm` — verbs: publicar comentário | endpoint: `POST /api/videos/public/[publicId]/comments` (§API Contracts → BFF tier) | reuse: `components/video/comment-form.tsx (new)`
- `CommentList` — verbs: exibir lista de comentários | endpoint: `GET /api/videos/public/[publicId]/comments` (§API Contracts → BFF tier) | reuse: `components/video/comment-list.tsx (new)`
- `CommentItem` — verbs: exibir um comentário | endpoint: `GET /api/videos/public/[publicId]/comments` (§API Contracts → BFF tier) | reuse: `components/video/comment-item.tsx (new)`
- `CommentLikeDislikeButton` — verbs: curtir/descurtir comentário | endpoint: `PUT /api/comments/[commentId]/reaction` (§API Contracts → BFF tier) | reuse: new (inline in `comment-item.tsx`, reusing `like-dislike-button.tsx`'s visual shape, no separate file)
- `ReplyAction` — verbs: responder a um comentário | endpoint: `POST /api/videos/public/[publicId]/comments/[commentId]/replies` (§API Contracts → BFF tier) | reuse: new (inline in `comment-item.tsx`, no separate file)
- `ReplyItem` — verbs: exibir respostas | endpoint: `GET /api/videos/public/[publicId]/comments` (§API Contracts → BFF tier, `replies` field) | reuse: new (rendered via `comment-item.tsx` recursion, no separate file)

**Behaviors:**

*Rendered states:*
- Loading: existing `app/watch/[publicId]/loading.tsx` skeleton (per `phase-05-video-watch-page`'s established convention) extends to cover the comments section shape.
- Empty: `CommentList` renders "No comments yet — be the first to comment" when `items` is empty.
- Success: real like/dislike counts, real comment list with nested replies, real subscribed state and subscriber count.
- Error: see Error Catalog → UX mapping below.

*Interactions:*
- `LikeDislikeButton` thumbs-up click → optimistically flips to "liked" state and increments the count immediately, before the request resolves (`social-interactions/TD-06`); clicking thumbs-down while "liked" flips directly to "disliked" (single `PUT` call, not two).
- `ReplyAction` click → opens an inline reply composer beneath the comment; submitting collapses it back and appends the new `ReplyItem`.
- `SubscribeButton` click → optimistically flips label/state (e.g., "Subscribe" ↔ "Subscribed") before the request resolves.

**Error Catalog → UX mapping:**

| errorCode (from §Error Catalog) | UX treatment |
|---------------------------------|--------------|
| `UNAUTHORIZED` | Reaction/comment/reply/subscribe click while logged out redirects to `/login` (or shows an inline "Sign in to..." prompt) instead of silently failing |
| `VIDEO_NOT_FOUND` | Not reachable from this screen post-load (the page itself already 404s if the video isn't visible) |
| `COMMENT_NOT_FOUND` | Toast: comment was removed since the page loaded; re-fetch the comment list |
| `REPLY_DEPTH_EXCEEDED` | `ReplyAction` is not rendered at all on a comment that is itself a reply — this error should be unreachable from the UI; if hit, toast "Replies can't be nested further" |
| `validation error` | Inline error beneath `CommentForm`/reply composer textarea (e.g., "Comment can't be empty") |

**Client-side validation mirror:**
- `body` (comment/reply): required, max 2000 characters — client-side character counter, submit disabled when empty or over limit

**Accessibility notes:**
- `LikeDislikeButton` and `CommentLikeDislikeButton` expose pressed state via `aria-pressed`, not color alone.
- follow DS defaults otherwise.

---

#### Screen: Channel Public Page (Channel show)

**Route:** `/channel/[nickname]`
**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-30 (node `40c57EfcNjN6u5St7n5SlG:39:30`)
**Purpose:** "Channel subscriptions (follow/unfollow)" — this screen was fully built in `phase-04-video-channel-management/`; this phase only wires the `SubscribeButton` it left as an inert stub and the channel header's subscriber count.

**Auth requirement:** Mixed — the page itself and subscriber-count display stay Anonymous (per `phase-04-video-channel-management`'s already-shipped public channel page); subscribing/unsubscribing requires Authenticated. Same `mixed-auth-intentional` case as the Video Watch Page above.

**Rendering strategy:** `channel-public-page.tsx` is already `"use client"` (established in `phase-04-video-channel-management`); the `SubscribeButton` is wired in-place with `useOptimistic` _(source: `social-interactions/TD-06`)_ — no new client-boundary extraction needed.

**Reused DS components:**
- `components/ui/button.tsx` — underlying primitive for `SubscribeButton` (already used with `variant="destructive"` in `phase-04-video-channel-management`)

**Server-connected components:**
- `SubscribeButton` — verbs: inscrever-se/cancelar inscrição | endpoint: `PUT /api/channels/[nickname]/subscription` (§API Contracts → BFF tier) | reuse: `components/ui/button.tsx`
- `ChannelProfileHeader` — verbs: exibir contagem de inscritos | endpoint: `GET /api/channels/[nickname]` (§API Contracts → Modified existing endpoints) | reuse: new

**Behaviors:**

*Rendered states:*
- Success: real subscribed state and real subscriber count in `ChannelProfileHeader`'s stats row.
- Error: see Error Catalog → UX mapping below.

*Interactions:*
- `SubscribeButton` click → optimistic flip, same pattern as the Video Watch Page's `SubscribeButton` (same component, same wiring).

**Error Catalog → UX mapping:**

| errorCode (from §Error Catalog) | UX treatment |
|---------------------------------|--------------|
| `UNAUTHORIZED` | Redirect to `/login` (or inline "Sign in to subscribe" prompt) |
| `CHANNEL_NOT_FOUND` | Not reachable post-load (the page itself already 404s) |
| `CANNOT_SUBSCRIBE_OWN_CHANNEL` | `SubscribeButton` is not rendered at all when viewing one's own channel — this error should be unreachable from the UI |

**Client-side validation mirror:** _not applicable — this screen has no form input, only a toggle action._

**Accessibility notes:** follow DS defaults; `SubscribeButton` exposes subscribed state via `aria-pressed`.

---

#### Screen: Followed Channels Page

**Route:** `/subscriptions`
**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-1307 (node `40c57EfcNjN6u5St7n5SlG:39:1307`) — reference only, no dedicated frame (see `docs/inventories/screen-inventory-phase-06-social-interactions.md` Observations).
**Purpose:** "Followed-channels area with quick access to their videos"

**Auth requirement:** Authenticated — "my followed channels" has no meaningful anonymous state; anonymous visitors are redirected to `/login`.

**Rendering strategy:** Server Component + `searchParams`, no client-side cache _(source: `phase-04-video-channel-management/TD-06`, inherited — this list is channel-scoped-list-shaped, same as the Dashboard and Channel Page lists that established this pattern)_.

**Reused DS components:**
- `components/ui/button.tsx` / `components/ui/icon-button.tsx` — underlying primitives composed into `PaginationControls`
- `components/subscriptions/subscribed-channels-list.tsx (new)` — fetches/renders the paginated list
- `components/subscriptions/subscribed-channel-row.tsx (new)` — one followed channel (avatar + name, links to `/channel/[nickname]`)
- `components/subscriptions/pagination-controls.tsx (new)` — first dedicated pagination component in the project (closes the "no compound pagination component exists yet" gap flagged since `phase-04-video-channel-management`'s Dashboard screen)
- `components/subscriptions/empty-subscriptions-state.tsx (new)` — first `EmptyState` pattern in the project

**Server-connected components:**
- `SubscribedChannelsList` — verbs: exibir lista paginada de canais seguidos | endpoint: `GET /api/subscriptions` (§API Contracts → BFF tier) | reuse: `components/subscriptions/subscribed-channels-list.tsx (new)`
- `SubscribedChannelRow` — verbs: exibir canal seguido | endpoint: `GET /api/subscriptions` (§API Contracts → BFF tier) | reuse: `components/subscriptions/subscribed-channel-row.tsx (new)`
- `PaginationControls` — verbs: navegar entre páginas | endpoint: `GET /api/subscriptions` (§API Contracts → BFF tier) | reuse: `components/subscriptions/pagination-controls.tsx (new)`

**Behaviors:**

*Rendered states:*
- Loading: new `loading.tsx` skeleton (per the project's established per-route convention).
- Empty: `EmptySubscriptionsState` — "You haven't subscribed to any channel yet."
- Success: paginated list of followed channels, each linking to `/channel/[nickname]`.
- Error: see Error Catalog → UX mapping below.

**Error Catalog → UX mapping:**

| errorCode (from §Error Catalog) | UX treatment |
|---------------------------------|--------------|
| `UNAUTHORIZED` | Redirect to `/login` at the page/RSC level (whole screen requires auth) |

**Client-side validation mirror:** _not applicable — this screen has no form input._

**Accessibility notes:** first `EmptyState` pattern in the project — follow DS defaults (semantic heading + descriptive text, no icon-only messaging).

### Frontend Runtime

#### social-interactions/TD-06 — Frontend Interaction Pattern for Social Actions

**Pattern:** React 19 `useOptimistic` + Route Handler `PUT`/`POST` + `router.refresh()`. Each interactive element (reaction button, subscribe button, comment form) is a small client island using `useOptimistic(currentServerState, reducer)` to render the assumed end-state immediately on click, calls the BFF Route Handler (per `social-interactions/TD-03`'s idempotent contract) inside `startTransition`, and reconciles by revalidating the server-derived state on success or reverting the optimistic value on error. Zero new dependency — `useOptimistic` is a React 19 built-in, consistent with this project's stated preference against adding a client-cache library when the platform's own primitives suffice.

**Setup:**

```tsx
// components/video/like-dislike-button.tsx (illustrative — same shape applies to every social-action island)
const [optimisticReaction, setOptimisticReaction] = useOptimistic(
  currentUserReaction,
  (_state, next: "like" | "dislike" | null) => next,
);

function handleClick(next: "like" | "dislike" | null) {
  startTransition(async () => {
    setOptimisticReaction(next);
    await fetch("/api/videos/public/" + publicId + "/reaction", {
      method: "PUT",
      body: JSON.stringify({ type: next }),
    });
    router.refresh();
  });
}
```

**Aplicação:**

- **Adopts the pattern:** all Server-connected components in `## UI Inventory → ### Server-connected Components` that mutate state — `LikeDislikeButton`, `SubscribeButton` (both screens), `CommentForm`, `ReplyAction`, `CommentLikeDislikeButton`.
- **Excludes / boundaries:**
  - `SubscriberCount`, `CommentCount`, `CommentList`/`CommentItem`, `ReplyItem`, `ChannelProfileHeader`, `SubscribedChannelsList`, `SubscribedChannelRow`, `PaginationControls` — read-only Server-connected components; no mutation, no optimistic state needed, rendered directly from server-fetched data.

**Migração:**

| File | Current behavior | Required change | Owning SI |
|------|-----------------|-----------------|-----------|
| `components/video/like-dislike-button.tsx` | Static visual stub from `phase-05-video-watch-page` — hardcoded "24K" text, no `onClick`, no state | Wire to real like/dislike counts + current-user reaction state via `useOptimistic`; add click handlers calling `PUT /api/videos/public/[publicId]/reaction` | SI-06.18 |
| `components/channel/channel-public-page.tsx` | `SubscribeButton` is a static `variant="destructive"` stub from `phase-04-video-channel-management` — no `onClick` | Wire to real subscribed state via `useOptimistic`; add click handler calling `PUT /api/channels/[nickname]/subscription` | SI-06.19 |

**Verificação:**

- **Unit:** each client-island component's optimistic state transition is asserted directly (click → immediate UI state change, before any mock `fetch` resolves).
- **Integration:** BFF Route Handler tests (MSW) assert the idempotent `PUT` request shape matches `### API Contracts` exactly, independent of the optimistic-UI layer.
- **E2E:** clicking a reaction/subscribe button shows the new state without a full page reload; a failed request (MSW error trigger) reverts the optimistic state back to the pre-click value.
- **Regression guards:** every pre-existing test for `phase-04-video-channel-management`'s and `phase-05-video-watch-page`'s screens must still pass unmodified — this phase only replaces inert stubs, it does not touch any already-wired behavior on those screens.

### UI ↔ API Traceability Matrix

| Verb | Component | Screen | Endpoint (from API Contracts) | TD ref |
|------|-----------|--------|-------------------------------|--------|
| Curtir ou descurtir o vídeo | LikeDislikeButton | /watch/[publicId] | PUT /api/videos/public/[publicId]/reaction → forwards-to PUT /videos/:publicId/reaction | social-interactions/TD-01, TD-02, TD-03 |
| Inscrever-se ou cancelar inscrição no canal a partir da página do vídeo | SubscribeButton | /watch/[publicId] | PUT /api/channels/[nickname]/subscription → forwards-to PUT /channels/:nickname/subscription | social-interactions/TD-02, TD-03 |
| Exibir contagem real de inscritos do canal | SubscriberCount | /watch/[publicId] | GET /api/videos/public/[publicId] → forwards-to GET /videos/public/:publicId (`channel.subscribersCount`) | social-interactions/TD-01 |
| Exibir contagem real de comentários do vídeo | CommentCount | /watch/[publicId] | GET /api/videos/public/[publicId]/comments → forwards-to GET /videos/:publicId/comments (`total`) | social-interactions/TD-01, TD-04 |
| Publicar um novo comentário no vídeo | CommentForm | /watch/[publicId] | POST /api/videos/public/[publicId]/comments → forwards-to POST /videos/:publicId/comments | social-interactions/TD-04 |
| Exibir lista de comentários do vídeo | CommentList | /watch/[publicId] | GET /api/videos/public/[publicId]/comments → forwards-to GET /videos/:publicId/comments | social-interactions/TD-04 |
| Curtir ou descurtir um comentário | CommentLikeDislikeButton | /watch/[publicId] | PUT /api/comments/[commentId]/reaction → forwards-to PUT /comments/:commentId/reaction | social-interactions/TD-01, TD-02, TD-03 |
| Responder a um comentário | ReplyAction | /watch/[publicId] | POST /api/videos/public/[publicId]/comments/[commentId]/replies → forwards-to POST /videos/:publicId/comments/:commentId/replies | social-interactions/TD-04 |
| Exibir respostas de um comentário | ReplyItem | /watch/[publicId] | GET /api/videos/public/[publicId]/comments → forwards-to GET /videos/:publicId/comments (`replies`) | social-interactions/TD-04 |
| Inscrever-se ou cancelar inscrição no canal | SubscribeButton | /channel/[nickname] | PUT /api/channels/[nickname]/subscription → forwards-to PUT /channels/:nickname/subscription | social-interactions/TD-02, TD-03 |
| Exibir contagem real de inscritos do canal | ChannelProfileHeader | /channel/[nickname] | GET /api/channels/[nickname] → forwards-to GET /channels/:nickname (`subscribersCount`) | social-interactions/TD-01 |
| Exibir lista paginada de canais que o usuário segue | SubscribedChannelsList | /subscriptions | GET /api/subscriptions → forwards-to GET /users/me/subscriptions | social-interactions/TD-05 |
| Exibir cada canal seguido (avatar + nome) com link para a página do canal | SubscribedChannelRow | /subscriptions | GET /api/subscriptions → forwards-to GET /users/me/subscriptions | social-interactions/TD-05 |
| Navegar entre páginas da lista de canais seguidos | PaginationControls | /subscriptions | GET /api/subscriptions → forwards-to GET /users/me/subscriptions | social-interactions/TD-05 |

_Capabilities marked in `## Non-UI / Deferred Capabilities` are excluded from this matrix ("Complete comments, likes, and subscriptions interface" — satisfied transversally by every row above)._

---

<!-- phase-a-complete -->

## Dependency Map

```
SI-06.0.1 (root)
├── SI-06.0.2 — depends on SI-06.0.1 (comment-form.tsx must exist)
│   └── SI-06.14b — depends on SI-06.0.2 + SI-06.10 (comments-section.tsx + comments BFF)
└── SI-06.16b — depends on SI-06.0.1 + SI-06.13 (subscriptions components + BFF)

SI-06.0.3 (root, independent)

SI-06.1 (root — entities/migration)
├── SI-06.2 — depends on SI-06.1
│   └── SI-06.9 — depends on SI-06.2 + SI-06.5 (reaction BFF)
│       └── SI-06.18 — depends on SI-06.17 + SI-06.9 (like-dislike-button migration)
├── SI-06.4 — depends on SI-06.1
│   ├── SI-06.5 — depends on SI-06.4 → feeds SI-06.9 above
│   ├── SI-06.6 — depends on SI-06.4
│   │   └── SI-06.11 — depends on SI-06.6 (replies BFF)
│   └── SI-06.10 — depends on SI-06.4 → feeds SI-06.14b above
└── SI-06.7 — depends on SI-06.1
    ├── SI-06.8 — depends on SI-06.7
    │   └── SI-06.13 — depends on SI-06.8 (subscriptions BFF) → feeds SI-06.16b above
    └── SI-06.12 — depends on SI-06.7
        └── SI-06.19 — depends on SI-06.17 + SI-06.12 + SI-06.1 (channel page migration)

SI-06.17 (root — useOptimistic Setup)
├── SI-06.18 (see above)
└── SI-06.19 (see above)
```

---

## Deliverables

- [ ] SI-06.0.1 — Custom-business simple group A (empty-subscriptions-state, pagination-controls, subscribed-channel-row, subscribed-channels-list, comment-form)
- [ ] SI-06.0.2 — Custom-business simple group B (comment-list, comments-section)
- [ ] SI-06.0.3 — Custom-business complex (comment-item)
- [ ] SI-06.1 — Entidades e migração de dados sociais + exposição de subscribersCount
- [ ] SI-06.2 — Endpoint de like/dislike de vídeo
- [ ] SI-06.4 — Endpoints de comentários (listar + criar)
- [ ] SI-06.5 — Endpoint de like/dislike de comentário
- [ ] SI-06.6 — Endpoint de resposta a comentário
- [ ] SI-06.7 — Endpoint de inscrição em canal
- [ ] SI-06.8 — Endpoint de canais seguidos
- [ ] SI-06.9 — BFF: rotas de reaction (vídeo + comentário)
- [ ] SI-06.10 — BFF: rotas de comentários (listar + criar)
- [ ] SI-06.11 — BFF: rota de resposta a comentário
- [ ] SI-06.12 — BFF: rota de inscrição em canal
- [ ] SI-06.13 — BFF: rota de canais seguidos
- [ ] SI-06.17 — Padrão useOptimistic para ações sociais (Setup)
- [ ] SI-06.18 — Migração: like-dislike-button.tsx → useOptimistic
- [ ] SI-06.19 — Migração: channel-public-page.tsx SubscribeButton → useOptimistic
- [ ] SI-06.14b — Video Watch Page: composição da página (seção de comentários real)
- [ ] SI-06.16b — Followed Channels Page: composição da página

**Per-screen deliverables:**

- [ ] Screen Video Watch Page (`/watch/[publicId]`) — likes/dislikes, comentários (com replies), e inscrição real; contagem de inscritos real
- [ ] Screen Channel Public Page (`/channel/[nickname]`) — inscrição real; contagem de inscritos real
- [ ] Screen Followed Channels Page (`/subscriptions`) — nova, roteável, renderiza loading, empty, success, e redireciona anônimos para `/login`

**Full test suites:**

- [ ] Backend unit + integration tests pass (`cd nestjs-project && docker compose exec nestjs-api npm test -- --runInBand`)
- [ ] Backend E2E tests pass (`cd nestjs-project && docker compose exec nestjs-api npm run test:e2e`)
- [ ] Backend type-check passes (`cd nestjs-project && docker compose exec nestjs-api npx tsc --noEmit`)
- [ ] Backend lint passes (`cd nestjs-project && docker compose exec nestjs-api npm run lint`)
- [ ] Frontend unit + integration tests pass (`cd next-frontend && docker compose exec next-frontend npm test`)
- [ ] Frontend E2E tests pass (`cd next-frontend && npx playwright test`, host-only, per `next-frontend/CLAUDE.md`'s E2E prerequisites)
- [ ] Frontend type-check passes (`cd next-frontend && docker compose exec next-frontend npx tsc --noEmit`)
- [ ] Frontend lint passes (`cd next-frontend && docker compose exec next-frontend npm run lint`)
- [ ] Frontend build passes (`cd next-frontend && docker compose exec next-frontend npm run build`)
