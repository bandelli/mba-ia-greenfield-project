---
kind: phase
name: phase-05-video-watch-page
test_specs_aware: true
sources_mtime:
  docs/phases/phase-05-video-watch-page/context.md: "2026-09-13T22:56:20Z"
  docs/decisions/technical-decisions-phase-05-video-watch-page.md: "2026-09-13T22:31:28Z"
  docs/decisions/technical-decisions-next-frontend-openapi-typing.md: "2026-09-08T00:58:17Z"
  docs/decisions/technical-decisions-next-frontend-msw-foundation.md: "2026-09-11T01:11:45Z"
  docs/decisions/technical-decisions-openapi-docs-nestjs.md: "2026-09-11T01:11:45Z"
---

# Phase 05 — Video Watch Page

## Objective

Deliver the watch page — a functional video player with play/pause, volume, and progress-bar controls, page layout (main video + information + suggestions sidebar), expandable description, view count, same-category suggested videos, a download button, and fully anonymous access (including to unlisted videos reached by direct link).

---

## Step Implementations

### SI-05.1 — Coluna `views` na entidade Video

**Description:** Adiciona o contador de visualizações (`views`) à entidade `Video` via migration, habilitando a persistência real da contagem de views (per `phase-05-video-watch-page/TD-02`).

**Technical actions:**

1. Criar migration `<timestamp>-AddVideoViews.ts` — adiciona coluna `views` (integer, not null, default 0) na tabela `videos` (per `phase-05-video-watch-page/TD-02`)
2. Adicionar campo `views: number` à entidade `Video` (`@Column({ type: 'int', default: 0 })`)

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `Video` entity | Integration: constraints, defaults (`views` defaults to 0) | `video.entity.integration-spec.ts` |

**Dependencies:** none

**Acceptance criteria:**

- Inserindo um novo vídeo sem especificar `views`, o valor persistido é `0`.
- A migration roda sem erro contra uma tabela `videos` já populada (backfill do default `0` para linhas existentes).

---

### SI-05.2 — Endpoint público de metadados do vídeo + incremento de views

**Description:** Implementa o endpoint público (anônimo) de metadados do vídeo, incluindo o incremento atômico de `views` a cada acesso bem-sucedido (per `phase-05-video-watch-page/TD-01`, TD-02).

**Technical actions:**

1. Criar `findPublicVideo(publicId)` em `VideosService` — busca por `public_id`, valida `status: ready` E (`visibility: public` OU `visibility: unlisted`), lança `VIDEO_NOT_FOUND` caso contrário (per `phase-05-video-watch-page/TD-01`)
2. Incrementar `views` atomicamente (`UPDATE videos SET views = views + 1 WHERE id = :id`) a cada chamada bem-sucedida (per `phase-05-video-watch-page/TD-02`)
3. Adicionar `GET /videos/public/:publicId` em `VideosController`, marcado `@Public()`, retornando os campos definidos em `### API Contracts`

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `VideosService.findPublicVideo` | Unit: branch logic — ready+public, ready+unlisted, draft, errored, wrong status (mock repo) | `videos.service.spec.ts` |
| `VideosService.findPublicVideo` + incremento de views | Integration: DB contract (query real, incremento real) | `videos.service.integration-spec.ts` |
| `GET /videos/public/:publicId` | E2E | `video-public-watch.e2e-spec.ts` |

**Dependencies:** SI-05.1

**Acceptance criteria:**

- `GET /videos/public/:publicId` com o `public_id` de um vídeo `ready`+`public` retorna `200` com os campos documentados.
- `GET /videos/public/:publicId` com o `public_id` de um vídeo `ready`+`unlisted` retorna `200` (acessível via link direto).
- `GET /videos/public/:publicId` com o `public_id` de um vídeo `draft`/`processing`/`error` retorna `404` com `VIDEO_NOT_FOUND`.
- `GET /videos/public/:publicId` com um `public_id` inexistente retorna `404` com `VIDEO_NOT_FOUND`.
- Cada `GET` bem-sucedido incrementa `views` do vídeo em exatamente `1`.

---

### SI-05.3 — Endpoints públicos de stream-url e download-url

**Description:** Implementa os endpoints públicos de streaming e download, reaproveitando o mecanismo de URL pré-assinada já decidido na Fase 03 (per `phase-05-video-watch-page/TD-01`, `phase-03-videos/TD-07`).

**Technical actions:**

1. Adicionar `GET /videos/public/:publicId/stream-url` em `VideosController`, `@Public()` — reaproveita `findPublicVideo` (SI-05.2) + `StorageService.getPresignedUrl` (per `phase-03-videos/TD-07`)
2. Adicionar `GET /videos/public/:publicId/download-url` em `VideosController`, `@Public()` — mesma composição

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `GET .../stream-url`, `GET .../download-url` | E2E | `video-public-watch.e2e-spec.ts` |

**Dependencies:** SI-05.2

**Acceptance criteria:**

- `GET /videos/public/:publicId/stream-url` com um vídeo `ready`+(`public`\|`unlisted`) retorna `200` com uma URL pré-assinada.
- `GET /videos/public/:publicId/download-url` com a mesma entrada retorna `200` com uma URL pré-assinada.
- Ambos os endpoints retornam `404 VIDEO_NOT_FOUND` sob o mesmo predicado do endpoint de metadados.

---

### SI-05.4 — Endpoint de vídeos sugeridos

**Description:** Implementa o endpoint de vídeos sugeridos da mesma categoria (per `phase-05-video-watch-page/TD-03`).

**Technical actions:**

1. Criar `findSuggestedVideos(publicId, limit)` em `VideosService` — mesma `category` do vídeo âncora, `status: ready`, `visibility: public`, exclui o próprio vídeo, ordenado por `published_at DESC`, limitado a `limit` (default e máximo 12) (per `phase-05-video-watch-page/TD-03`, reaproveitando o predicado de `phase-04-video-channel-management/TD-05`)
2. Adicionar `GET /videos/public/:publicId/suggested` em `VideosController`, `@Public()`

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `VideosService.findSuggestedVideos` | Unit: branch logic (mock repo) | `videos.service.spec.ts` |
| `VideosService.findSuggestedVideos` | Integration: DB contract (filtro de categoria, exclusão do próprio vídeo, ordenação, limite) | `videos.service.integration-spec.ts` |
| `GET .../suggested` | E2E | `video-public-watch.e2e-spec.ts` |

**Dependencies:** SI-05.2

**Acceptance criteria:**

- `GET /videos/public/:publicId/suggested` retorna até 12 itens, todos com a mesma categoria do vídeo âncora, todos `ready` e `public`.
- O próprio vídeo âncora nunca aparece nos itens retornados.
- Os itens vêm ordenados por `published_at` decrescente.
- `GET .../suggested` com um `public_id` inexistente/inacessível retorna `404 VIDEO_NOT_FOUND`.

---

### SI-05.5 — Camada BFF: Route Handlers para os endpoints públicos de vídeo

**Description:** Espelha os 4 endpoints públicos de vídeo na camada BFF (Route Handlers), seguindo o pipeline OpenAPI já estabelecido (per `next-frontend-openapi-typing/TD-01`, TD-04).

**Technical actions:**

1. Regenerar `next-frontend/openapi.json` + `lib/api/types.gen.ts` a partir do spec atualizado do backend (per `next-frontend-openapi-typing/TD-02`, TD-03)
2. Criar `app/api/videos/public/[publicId]/route.ts` — exporta `GET`, encaminha para `GET /videos/public/:publicId` (per `phase-05-video-watch-page/TD-01`)
3. Criar `app/api/videos/public/[publicId]/stream-url/route.ts` — exporta `GET`, encaminha
4. Criar `app/api/videos/public/[publicId]/download-url/route.ts` — exporta `GET`, encaminha
5. Criar `app/api/videos/public/[publicId]/suggested/route.ts` — exporta `GET`, encaminha, repassa o query param `limit`

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `GET /api/videos/public/[publicId]` | Integration (MSW) | `route.integration.test.ts` |
| `GET /api/videos/public/[publicId]/stream-url` | Integration (MSW) | `route.integration.test.ts` |
| `GET /api/videos/public/[publicId]/download-url` | Integration (MSW) | `route.integration.test.ts` |
| `GET /api/videos/public/[publicId]/suggested` | Integration (MSW) | `route.integration.test.ts` |

**Dependencies:** SI-05.2, SI-05.3, SI-05.4

**Acceptance criteria:**

- `GET /api/videos/public/[publicId]` repassa para o endpoint upstream e retorna o mesmo formato.
- `GET /api/videos/public/[publicId]/stream-url`, `.../download-url` e `.../suggested` repassam corretamente, incluindo o `limit` no último.
- Cada rota BFF retorna `404 VIDEO_NOT_FOUND` (pass-through) quando o upstream retorna.

---

### SI-05.6.0 — Drift audit: Video Watch Page

**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-1013
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Video Watch Page`

**Technical actions:**

1. **Drift audit** — invoke `figma:figma-implement-design` (narrow handoff per Decisão #31) com:
   - Figma URL: https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-1013
   - Reused DS components: [`components/ui/button.tsx` (SubscribeButton, ShareButton, DescriptionExpandToggle), `components/ui/icon-button.tsx` (MoreOptionsButton)]
   - Server-connected component names (sem endpoints/auth/erros): [VideoPlayer, DownloadButton, ViewCountAndDate, SuggestedVideoCard]
   - Target paths (contexto read-only para o audit; sem escrita aqui): `app/watch/[publicId]/page.tsx` + `components/video/*.tsx`

   Para cada componente da Reused DS list, diff de valor contra o arquivo em disco e classificação pelo enum de 4 valores (`alinhado` / `drift menor` / `drift relevante` / `componente ausente`). Compor Decision pela política default (`.claude/skills/plan-build/references/frontend-drift-report-schema.md` § Default decisions per status). Ler seções prévias de `frontend-drift-report.md` para `prior_decisions`. Escrever seção `## Screen: video-watch-page — audited at SI-05.6.0 ({YYYY-MM-DD})` em `frontend-drift-report.md`. **Sem edições de código — verificável via `git diff` ao fim do SI.**

**Dependencies:** none

**Tests:** _(empty — audit-only; the report is the deliverable)_

**Acceptance criteria:**

- `frontend-drift-report.md` existe com a seção `## Screen: video-watch-page` (com a data da rodada atual no heading).
- Todo componente da Reused DS list tem exatamente uma linha na tabela.
- Toda linha tem uma coluna Decision preenchida (`skip` / `auto-Edit "..."` / `exception "..."` / `create`, conforme o status).
- Toda decisão `exception` carrega uma justificativa de uma linha.
- `git diff --name-only HEAD -- next-frontend` está vazio ao final deste SI.

---

### SI-05.6a — Tela de Video Watch Page (visual shell)

**Route:** `/watch/[publicId]`
**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-1013
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Video Watch Page`
**Drift Report:** see `frontend-drift-report.md` → `## Screen: video-watch-page`

**Technical actions:**

1. **Apply drift decisions** — ler a seção do Drift Report para esta tela; para cada linha, aplicar o verbo da coluna Decision mecanicamente (sem novo julgamento).
2. **Visual shell generation** — invoke `figma:figma-implement-design` (narrow handoff per Decisão #31) com:
   - Figma URL: https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-1013
   - Reused DS components: [`components/ui/button.tsx`, `components/ui/icon-button.tsx`] (refletindo eventuais edições da ação 1)
   - Server-connected component names: [VideoPlayer, DownloadButton, ViewCountAndDate, SuggestedVideoCard]
   - Target paths: `app/watch/[publicId]/page.tsx` + `components/video/video-player.tsx` + `components/video/description-card.tsx` + `components/video/suggested-video-card.tsx` + `components/video/comments-section-stub.tsx` (Phase-06-deferred, inert) + `components/video/like-dislike-button.tsx` (Phase-06-deferred, inert)

**Dependencies:** SI-05.6.0

**Tests:** _(empty — shell smoke-gated by build AC; Unit tests live in SI-05.6b; E2E in /plan-test-specs spec)_

**Acceptance criteria:**

- Todos os target paths existem, exportam os componentes esperados, e compilam pelo comando de build do `next-frontend`.
- A renderização confere com a fidelidade do node do Figma dentro da tolerância do conjunto de componentes do design system.
- Nenhum import em runtime além da Reused DS list (mantém escopo visual).

---

### SI-05.6b — Tela de Video Watch Page (lógica & wiring)

**Test Specs:** see `next-frontend/specs/video-watch-page.plan.md`
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Video Watch Page`

**Technical actions:**

1. **Route guard application** — per UI Contract `**Auth requirement:**` (Anonymous): nenhum guard de autenticação aplicado — a rota é totalmente pública, mesmo padrão de `/channel/[nickname]` (Fase 04).
2. **Rendering strategy application** — per UI Contract `**Rendering strategy:**` (Server Component/RSC): `page.tsx` como Server Component assíncrono; os controles do `VideoPlayer` (play/pause, volume, progresso) e o `DescriptionExpandToggle` são ilhas `"use client"`.
3. **Endpoint wiring** — `Promise.all([upstream.GET("/videos/public/{publicId}", ...), upstream.GET("/videos/public/{publicId}/suggested", ...)])` diretamente do Server Component (padrão RSC-direto já estabelecido em `phase-04-video-channel-management`); buscar `stream-url` e `download-url` da mesma forma e repassar as URLs pré-assinadas resultantes como props (`src` do player, `href` do botão de download).
4. **Error mapping** — per UI Contract `**Error Catalog → UX mapping:**`: `VIDEO_NOT_FOUND` no fetch de metadados → `notFound()`.
5. **Video player controls** — implementar play/pause, volume e seek via barra de progresso no elemento `<video>` nativo (per `phase-05-video-watch-page/TD-04`), usando a `stream-url` pré-assinada como `src`.

**Dependencies:**

- `SI-05.6a` (visual shell deve existir antes da wiring).
- `SI-05.2`, `SI-05.3`, `SI-05.4` — endpoints backend referenciados pelo UI Contract desta tela.

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `components/video/video-player.tsx` | Unit per testing-guide-next-frontend § "Client Components" — toggle play/pause, mudança de volume, seek via barra de progresso | `video-player.test.tsx` |
| `components/video/description-card.tsx` (DescriptionExpandToggle) | Unit per testing-guide-next-frontend § "Client Components" — toggle expand/collapse | `description-card.test.tsx` |

E2E para a página (roteamento, fluxo completo de anônimo assistindo, 404) é autorado externamente por `/plan-test-specs` no spec referenciado por `**Test Specs:**` acima.

**Acceptance criteria:**

- Visitar `/watch/[publicId]` com o `public_id` de um vídeo `ready`+`public` renderiza player, título, informações do canal, descrição e vídeos sugeridos.
- Visitar `/watch/[publicId]` com o `public_id` de um vídeo `ready`+`unlisted` renderiza com sucesso (acessível via link direto, per TD-01).
- Visitar `/watch/[publicId]` com um `public_id` inexistente ou inacessível renderiza a página de not-found do Next.js.
- Clicar em play no `VideoPlayer` inicia a reprodução; clicar novamente pausa.
- Arrastar/clicar na barra de progresso avança o vídeo para o timestamp correspondente.
- Ajustar o controle de volume altera o volume de áudio do vídeo.
- Clicar em "Show more" na descrição expande o texto clampado (per TD-06).
- O `href` do botão de download aponta para a URL de download pré-assinada retornada pelo backend.

---

## Technical Specifications

### Data Model

#### Video (modified)

| Field | Type | Constraints |
|-------|------|-------------|
| views | integer | not null, default 0 |

**Relations:** unchanged (per `phase-03-videos`/`phase-04-video-channel-management`).
**Indexes:** none added — `views` is read/incremented by `public_id` lookup, which already has a unique index (per `phase-03-videos/TD-05`).

_(per `phase-05-video-watch-page/TD-02` — plain atomic counter, no dedup table.)_

### API Contracts

#### Backend tier (nestjs-project)

#### GET /videos/public/:publicId (SI-05.2)

**Request headers:** none required (`@Public()`).

**Response 200:**
- id: string (uuid)
- public_id: string
- title: string
- description: string | null
- category: string (enum)
- visibility: string (`public` | `unlisted`)
- duration_seconds: number | null
- thumbnail_key: string | null
- views: number
- published_at: string (ISO date)
- channel: { nickname: string, name: string }

**Error responses:**
- 404 VIDEO_NOT_FOUND: when `public_id` does not resolve to an existing video, or the video is not `status: ready` and (`visibility: public` or `visibility: unlisted`)

_Side effect: a successful 200 response atomically increments `views` by 1 (per `phase-05-video-watch-page/TD-02`)._

---

#### GET /videos/public/:publicId/stream-url (SI-05.3)

**Request headers:** none required (`@Public()`).

**Response 200:**
- url: string (presigned object-storage URL, per `phase-03-videos/TD-07`)

**Error responses:**
- 404 VIDEO_NOT_FOUND: same predicate as the metadata endpoint above

---

#### GET /videos/public/:publicId/download-url (SI-05.3)

**Request headers:** none required (`@Public()`).

**Response 200:**
- url: string (presigned object-storage URL, per `phase-03-videos/TD-07`)

**Error responses:**
- 404 VIDEO_NOT_FOUND: same predicate as the metadata endpoint above

---

#### GET /videos/public/:publicId/suggested (SI-05.4)

**Request query parameters:**
- limit: number, optional — default 12, max 12 (per `phase-05-video-watch-page/TD-03`)

**Response 200:**
- items: array of { id: string, public_id: string, title: string, thumbnail_key: string | null, duration_seconds: number | null, views: number, published_at: string, channel: { nickname: string, name: string } }

**Error responses:**
- 404 VIDEO_NOT_FOUND: when `public_id` does not resolve to an existing, ready, public/unlisted video (the anchor video whose category drives the suggestions)

_Selection: same `category` as the anchor video, `status: ready`, `visibility: public` only (never surfaces `unlisted` videos as someone else's suggestion), excludes the anchor video itself, ordered by `published_at DESC` (per `phase-05-video-watch-page/TD-03`, reusing `phase-04-video-channel-management/TD-05`'s predicate)._

---

#### BFF tier (next-frontend)

> _BFF tier — frontend-exposed contract. The browser calls the FE-facing route; the route proxies the upstream per the project's documented strict-BFF architecture (`next-frontend/CLAUDE.md`)._

#### GET /api/videos/public/[publicId] (SI-05.5)

**forwards-to:** `GET /videos/public/:publicId` *(derived: project contract source)*

**Response 200 (FE-facing):** pass-through *(derived: project contract source; reshape: none)*

**Error responses (FE-facing):**
- 404 VIDEO_NOT_FOUND: pass-through *(derived: project contract source)*

---

#### GET /api/videos/public/[publicId]/stream-url (SI-05.5)

**forwards-to:** `GET /videos/public/:publicId/stream-url` *(derived: project contract source)*

**Response 200 (FE-facing):** pass-through *(derived: project contract source; reshape: none)*

**Error responses (FE-facing):**
- 404 VIDEO_NOT_FOUND: pass-through *(derived: project contract source)*

---

#### GET /api/videos/public/[publicId]/download-url (SI-05.5)

**forwards-to:** `GET /videos/public/:publicId/download-url` *(derived: project contract source)*

**Response 200 (FE-facing):** pass-through *(derived: project contract source; reshape: none)*

**Error responses (FE-facing):**
- 404 VIDEO_NOT_FOUND: pass-through *(derived: project contract source)*

---

#### GET /api/videos/public/[publicId]/suggested (SI-05.5)

**forwards-to:** `GET /videos/public/:publicId/suggested` *(derived: project contract source)*

**Request query parameters:**
- limit: number, optional *(derived: project contract source)*

**Response 200 (FE-facing):** pass-through *(derived: project contract source; reshape: none)*

**Error responses (FE-facing):**
- 404 VIDEO_NOT_FOUND: pass-through *(derived: project contract source)*

---

_Note: per the project's established RSC-direct pattern (`phase-04-video-channel-management`'s dashboard/channel pages calling `upstream` directly from Server Components, per `next-frontend/CLAUDE.md`'s "from the server" caller rule), the Watch Page's own data fetch (SI-05.7) is expected to call `upstream` directly rather than these BFF routes — the BFF tier above exists as the documented FE-facing contract surface per the project's architecture, consistent with how `phase-04-video-channel-management` built (and did not consume from RSC) its own read-only BFF routes._

### Authorization Matrix

| Endpoint | Anonymous | Authenticated | Owner |
|----------|-----------|----------------|-------|
| GET /videos/public/:publicId | ✓ | ✓ | ✓ |
| GET /videos/public/:publicId/stream-url | ✓ | ✓ | ✓ |
| GET /videos/public/:publicId/download-url | ✓ | ✓ | ✓ |
| GET /videos/public/:publicId/suggested | ✓ | ✓ | ✓ |
| GET /api/videos/public/[publicId] (BFF) | ✓ | ✓ | ✓ |
| GET /api/videos/public/[publicId]/stream-url (BFF) | ✓ | ✓ | ✓ |
| GET /api/videos/public/[publicId]/download-url (BFF) | ✓ | ✓ | ✓ |
| GET /api/videos/public/[publicId]/suggested (BFF) | ✓ | ✓ | ✓ |

_All four endpoints are `@Public()` (per `phase-05-video-watch-page/TD-01`) — identical behavior regardless of authentication state; there is no owner-only variant of any of them (that surface is `phase-04-video-channel-management`'s dashboard/edit endpoints, untouched by this phase)._

### Error Catalog

| errorCode | HTTP | Trigger |
|-----------|------|---------|
| VIDEO_NOT_FOUND | 404 | `GET /videos/public/:publicId` (or its `/stream-url`, `/download-url`, `/suggested` siblings) when `public_id` does not exist, or the video is not `status: ready` and (`visibility: public` or `visibility: unlisted`) — draft/processing/error videos and genuinely private lookups return the same 404, never revealing which condition failed |

_Error response shape inherited from `phase-02-auth/TD-07`: `{ statusCode, error, message }`, `error` carrying the code above._

### UI Contracts

#### Screen: Video Watch Page

**Route:** `/watch/[publicId]`
**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-1013 (node `40c57EfcNjN6u5St7n5SlG:39:1013`)
**Purpose:** "Page where the user watches the video with a functional player, description, suggestions, and anonymous access."

**Auth requirement:** Anonymous _(source: §Authorization Matrix — every endpoint referenced by this screen is Anonymous)_

**Rendering strategy:** Server Component (RSC) _(source: `phase-04-video-channel-management/TD-06` — "every screen shipped in this project so far has favored the App Router's server-first primitives over a client-side cache library"; the description-expand toggle and player controls are client-side islands within the RSC page per `phase-05-video-watch-page/TD-04`/TD-06)_

**Reused DS components:**
- `components/ui/button.tsx` — SubscribeButton (Phase-06-deferred inert stub), ShareButton (inert stub, no capability), DescriptionExpandToggle ("Show more" toggle)
- `components/ui/icon-button.tsx` — MoreOptionsButton (inert stub, no capability)

**Server-connected components:**
- `VideoPlayer` — verbs: "Reproduzir vídeo com controles de play/pause, volume e barra de progresso", "Carregar vídeo publicado (público ou não-listado) sem autenticação, via public_id" | endpoint: `GET /api/videos/public/[publicId]` + `GET /api/videos/public/[publicId]/stream-url` (§API Contracts → BFF tier) | reuse: new
- `DownloadButton` — verbs: "Disparar download do vídeo" | endpoint: `GET /api/videos/public/[publicId]/download-url` (§API Contracts → BFF tier) | reuse: `components/ui/button.tsx`
- `ViewCountAndDate` — verbs: "Exibir contagem de visualizações do vídeo" | endpoint: `GET /api/videos/public/[publicId]` (§API Contracts → BFF tier) | reuse: new
- `SuggestedVideoCard` — verbs: "Exibir lista de vídeos sugeridos da mesma categoria" | endpoint: `GET /api/videos/public/[publicId]/suggested` (§API Contracts → BFF tier) | reuse: new

**Behaviors:**

*Rendered states:*
- Loading: skeleton matching the two-column layout (player rectangle + info block + sidebar card list), per the project's established `loading.tsx` convention.
- Empty: not applicable to the video itself (a valid `public_id` always yields one video); the suggestions sidebar renders zero `SuggestedVideoCard`s (no dedicated empty-state copy required by any capability) when no other video shares the category.
- Success: video metadata, player, description, and suggestions render from the single server-side data fetch.
- Error: `VIDEO_NOT_FOUND` → Next.js `notFound()` (404 page), per the established pattern in `phase-04-video-channel-management`'s public channel page.

*Interactions:*
- `DescriptionExpandToggle` ("Show more") click → expands the clamped description text in `DescriptionCard`, no backend I/O (per `phase-05-video-watch-page/TD-06`).

**Error Catalog → UX mapping:**

| errorCode (from §Error Catalog) | UX treatment |
|---------------------------------|--------------|
| `VIDEO_NOT_FOUND` | Next.js `notFound()` — renders the app's 404 page |

**Client-side validation mirror:** not applicable — this screen has no form fields.

**Accessibility notes:**
- Follow DS defaults (no a11y-specific Observations flagged in the screen inventory).

### UI ↔ API Traceability Matrix

| Verb | Component | Screen | Endpoint (from API Contracts) | TD ref |
|------|-----------|--------|-------------------------------|--------|
| Reproduzir vídeo com controles de play/pause, volume e barra de progresso | VideoPlayer | /watch/[publicId] | GET /api/videos/public/[publicId]/stream-url → forwards-to GET /videos/public/:publicId/stream-url | phase-05-video-watch-page/TD-01 |
| Carregar vídeo publicado (público ou não-listado) sem autenticação, via public_id | VideoPlayer | /watch/[publicId] | GET /api/videos/public/[publicId] → forwards-to GET /videos/public/:publicId | phase-05-video-watch-page/TD-01 |
| Disparar download do vídeo | DownloadButton | /watch/[publicId] | GET /api/videos/public/[publicId]/download-url → forwards-to GET /videos/public/:publicId/download-url | phase-05-video-watch-page/TD-01 |
| Exibir contagem de visualizações do vídeo | ViewCountAndDate | /watch/[publicId] | GET /api/videos/public/[publicId] → forwards-to GET /videos/public/:publicId | phase-05-video-watch-page/TD-02 |
| Exibir lista de vídeos sugeridos da mesma categoria | SuggestedVideoCard | /watch/[publicId] | GET /api/videos/public/[publicId]/suggested → forwards-to GET /videos/public/:publicId/suggested | phase-05-video-watch-page/TD-03 |

_Capabilities marked in `## Non-UI / Deferred Capabilities` ("Unlisted videos accessible only via direct link", "Page layout: main video + information + sidebar with suggestions", "Video description with expand/collapse") are excluded from this matrix._

---

<!-- phase-a-complete -->

## Dependency Map

```
SI-05.1 (root)
└── SI-05.2 — depends on SI-05.1 (views column must exist)
    ├── SI-05.3 — depends on SI-05.2 (reuses findPublicVideo)
    ├── SI-05.4 — depends on SI-05.2 (reuses findPublicVideo)
    └── SI-05.5 — depends on SI-05.2, SI-05.3, SI-05.4 (mirrors all 4 backend endpoints)
SI-05.6.0 (root, independent)
└── SI-05.6a — depends on SI-05.6.0 (audit precedes visual shell)
    └── SI-05.6b — depends on SI-05.6a, SI-05.2, SI-05.3, SI-05.4 (wiring needs shell + backend endpoints)
```

---

## Deliverables

- [ ] SI-05.1 — Coluna `views` na entidade Video
- [ ] SI-05.2 — Endpoint público de metadados do vídeo + incremento de views
- [ ] SI-05.3 — Endpoints públicos de stream-url e download-url
- [ ] SI-05.4 — Endpoint de vídeos sugeridos
- [ ] SI-05.5 — Camada BFF: Route Handlers para os endpoints públicos de vídeo
- [ ] SI-05.6.0 — Drift audit: Video Watch Page
- [ ] SI-05.6a — Tela de Video Watch Page (visual shell)
- [ ] SI-05.6b — Tela de Video Watch Page (lógica & wiring)

**Per-screen deliverables:**

- [ ] Screen Video Watch Page (`/watch/[publicId]`) is routable
- [ ] Screen Video Watch Page (`/watch/[publicId]`) renders loading, success, and error states
- [ ] Screen Video Watch Page (`/watch/[publicId]`) passes component tests (per testing-guide-next-frontend layers)

**Full test suites:**

- [ ] Backend tests pass (`cd nestjs-project && npm test -- --runInBand`)
- [ ] Backend E2E tests pass (`cd nestjs-project && npm run test:e2e`)
- [ ] Backend type-check passes (`cd nestjs-project && npx tsc --noEmit`)
- [ ] Backend lint passes (`cd nestjs-project && npm run lint`)
- [ ] Frontend tests pass (`cd next-frontend && npm test`)
- [ ] Frontend E2E tests pass (`cd next-frontend && npx playwright test`)
- [ ] Frontend type-check passes (`cd next-frontend && npx tsc --noEmit`)
- [ ] Frontend lint passes (`cd next-frontend && npm run lint`)
- [ ] Frontend builds successfully (`cd next-frontend && npm run build`)
