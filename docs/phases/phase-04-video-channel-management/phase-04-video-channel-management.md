---
kind: phase
name: phase-04-video-channel-management
test_specs_aware: true
sources_mtime:
  docs/phases/phase-04-video-channel-management/context.md: "2026-09-11T23:42:18-03:00"
  docs/decisions/technical-decisions-phase-04-video-channel-management.md: "2026-09-10T22:36:41-03:00"
  docs/decisions/technical-decisions-next-frontend-openapi-typing.md: "2026-09-07T21:58:17-03:00"
  docs/phases/phase-01-configuracao-base/context.md: "2026-09-10T22:11:45-03:00"
  docs/phases/phase-02-auth/context.md: "2026-09-10T22:11:45-03:00"
  docs/phases/phase-02-auth-frontend/context.md: "2026-09-10T22:11:45-03:00"
  docs/phases/phase-03-videos/context.md: "2026-09-10T22:11:45-03:00"
  .claude/skills/testing-guide-nestjs-project/SKILL.md: "2026-09-07T21:58:17-03:00"
  .claude/skills/testing-guide-next-frontend/SKILL.md: "2026-09-07T21:58:17-03:00"
  docs/inventories/screen-inventory-phase-04-video-channel-management.md: "2026-09-11T23:40:17-03:00"
---

# Phase 04 — Video and Channel Management

## Objective

Deliver complete video information editing (title, description, category, custom thumbnail), a draft → publish flow with public/unlisted visibility, a channel video management dashboard with per-video editing, channel information editing (nickname, name, description), and a public channel page listing the channel's published videos.

---

## Step Implementations

### SI-04.1 — Video entity: category, published_at, visibility columns

**Description:** Adiciona as colunas `category`, `published_at` e `visibility` à entidade `Video` e gera a migration correspondente — base para todo o fluxo de edição/publicação desta fase.

**Technical actions:**

1. Adicionar colunas `category` (enum `videos_category_enum`, not null, default `other`), `published_at` (timestamptz, nullable) e `visibility` (enum `videos_visibility_enum`, not null, default `public`) a `Video` (per `phase-04-video-channel-management/TD-01`, `TD-02`)
2. Gerar migration via TypeORM CLI para as 3 colunas novas
3. Criar `VideoPublicationService` (arquivo novo, vazio nesta SI) — ownership dos métodos de publish/edit fica fora de `VideoStatusService` (per `phase-04-video-channel-management/TD-02` — Single Responsibility)

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `Video` (colunas novas) | Integration: defaults (`category: "other"`, `visibility: "public"`, `published_at: null`) | `video.entity.integration-spec.ts` |

**Dependencies:** none

**Acceptance criteria:**

- Uma `Video` criada sem `category`/`visibility` explícitos persiste com `category: "other"` e `visibility: "public"`
- Uma `Video` criada sem `published_at` explícito persiste com `published_at: null`
- A migration aplica e reverte sem erros (`up`/`down`)

---

### SI-04.2 — Video edit & publish endpoints

**Route:** PATCH /videos/:id, POST /videos/:id/publish
**Test Specs:** see `nestjs-project/specs/video-edit-publish.plan.md`

**Description:** Implementa a edição de campos do vídeo (título, descrição, categoria, visibilidade) e a ação de publicar, via `VideoPublicationService`, mantendo essa lógica fora do `VideoStatusService` de processamento (per `phase-04-video-channel-management/TD-02`).

**Technical actions:**

1. Implementar `VideoPublicationService.updateFields(videoId, userId, dto)` — valida ownership (padrão owner-only per `phase-03-videos/TD-10`), atualiza `title`/`description`/`category`/`visibility`
2. Implementar `VideoPublicationService.publish(videoId, userId, dto)` — aplica `updateFields` e então define `published_at = now()`, rejeitando quando `status !== "ready"` (status lifecycle per `phase-03-videos/TD-10`)
3. Criar `UpdateVideoDto` (class-validator, per `phase-02-auth/TD-06` inherited convention) — `title`, `description`, `category`, `visibility`, todos opcionais
4. Adicionar `PATCH /videos/:id` e `POST /videos/:id/publish` a `VideosController` (per `### API Contracts` → backend tier)
5. Mapear `VIDEO_NOT_READY`, `VIDEO_NOT_FOUND` no exception filter (per `phase-02-auth/TD-07` inherited domain-exception convention); `category`/`visibility` inválidos são rejeitados pelo `@IsEnum` do `UpdateVideoDto` via o `ValidationExceptionFilter` genérico existente (`400 VALIDATION_ERROR`) — sem exceptions de domínio dedicadas

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `VideoPublicationService` | Unit: branch logic (ownership, status gate, field validation) — mock repo | `video-publication.service.spec.ts` |

E2E para `PATCH /videos/:id` e `POST /videos/:id/publish` é autorado externamente por `/plan-test-specs` no spec referenciado por `**Test Specs:**` acima.

**Dependencies:** SI-04.1 (colunas `category`/`visibility`/`published_at` devem existir)

**Acceptance criteria:**

- `PATCH /videos/:id` com `{ title, category: "music" }` válido e o vídeo pertencendo ao chamador retorna `200` com `category: "music"`
- `PATCH /videos/:id` de um vídeo de outro usuário retorna `404 VIDEO_NOT_FOUND`
- `PATCH /videos/:id` com `category` fora do enum retorna `400 VALIDATION_ERROR`
- `POST /videos/:id/publish` com `status: "ready"` retorna `200` com `published_at` preenchido
- `POST /videos/:id/publish` com `status: "processing"` retorna `400 VIDEO_NOT_READY`

---

### SI-04.3 — Custom thumbnail upload endpoint

**Route:** PATCH /videos/:id/thumbnail
**Test Specs:** see `nestjs-project/specs/video-thumbnail.plan.md`

**Description:** Permite substituir o thumbnail auto-gerado (per `phase-03-videos/TD-04`) por um upload customizado, via `FileInterceptor` + `ParseFilePipe` (per `phase-04-video-channel-management/TD-03`).

**Technical actions:**

1. Adicionar `PATCH /videos/:id/thumbnail` a `VideosController`, com `FileInterceptor('thumbnail')` (memory storage)
2. Validar o arquivo via `ParseFilePipe` + `FileTypeValidator` (jpeg/png/webp) + `MaxFileSizeValidator` (5MB) (per `phase-04-video-channel-management/TD-03`)
3. Implementar `VideoPublicationService.replaceThumbnail(videoId, userId, buffer, contentType)` — valida ownership, chama `StorageService.putObject` no mesmo `thumbnail_key` já existente (overwrite, sem cleanup de objeto órfão)
4. Mapear `THUMBNAIL_INVALID_FILE` no exception filter

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `VideoPublicationService.replaceThumbnail` | Integration: overwrite do objeto no storage (MinIO local) | `video-publication.service.integration-spec.ts` |

E2E para `PATCH /videos/:id/thumbnail` é autorado externamente por `/plan-test-specs` no spec referenciado por `**Test Specs:**` acima.

**Dependencies:** none

**Acceptance criteria:**

- `PATCH /videos/:id/thumbnail` com um jpeg de 2MB retorna `200` com `thumbnail_key` inalterado (mesma key, conteúdo sobrescrito)
- `PATCH /videos/:id/thumbnail` com um arquivo `.txt` retorna `400 THUMBNAIL_INVALID_FILE`
- `PATCH /videos/:id/thumbnail` com um arquivo de 10MB retorna `400 THUMBNAIL_INVALID_FILE`
- `PATCH /videos/:id/thumbnail` de um vídeo de outro usuário retorna `404 VIDEO_NOT_FOUND`

---

### SI-04.4 — Channel controller: own-channel read & edit

**Route:** GET /channels/me, PATCH /channels/me
**Test Specs:** see `nestjs-project/specs/channel-me.plan.md`

**Description:** Cria o `ChannelsController` (ainda inexistente) com os endpoints de leitura e edição do próprio canal, incluindo o tratamento de colisão de nickname como 409 (per `phase-04-video-channel-management/TD-04`).

**Technical actions:**

1. Criar `ChannelsController` (arquivo novo), registrado em `ChannelsModule`
2. Adicionar `GET /channels/me` — delega a `ChannelsService.findByUserId` (já existente)
3. Adicionar `PATCH /channels/me` — implementa `ChannelsService.updateOwnChannel(userId, dto)`, reaproveitando a lógica de unicidade de `createChannel` mas rejeitando com `CHANNEL_NICKNAME_TAKEN` (409) em vez de auto-sufixo (per `phase-04-video-channel-management/TD-04`)
4. Criar `UpdateChannelDto` — `nickname` (`[a-z0-9_]`, per `phase-02-auth/TD-10` inherited allowlist), `name` (max 50), `description` (max 5000), todos opcionais
5. Mapear `CHANNEL_NICKNAME_TAKEN` no exception filter

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `ChannelsService.updateOwnChannel` | Unit: branch de colisão de nickname (mock repo) | `channels.service.spec.ts` |
| `ChannelsModule` | Unit: compilation test | `channels.module.spec.ts` |

E2E para `GET /channels/me` e `PATCH /channels/me` é autorado externamente por `/plan-test-specs` no spec referenciado por `**Test Specs:**` acima.

**Dependencies:** none

**Acceptance criteria:**

- `GET /channels/me` autenticado retorna `200` com `nickname`, `name`, `description` do próprio canal
- `PATCH /channels/me` com `{ nickname: "novo_nick" }` livre retorna `200` com o nickname atualizado
- `PATCH /channels/me` com um `nickname` já em uso por outro canal retorna `409 CHANNEL_NICKNAME_TAKEN`
- `GET /channels/me` sem token retorna `401`

---

### SI-04.5 — Channel & dashboard video listings

**Route:** GET /channels/me/videos, GET /channels/:nickname, GET /channels/:nickname/videos
**Test Specs:** see `nestjs-project/specs/channel-videos-listing.plan.md`

**Description:** Implementa as listagens paginadas (offset/limit, per `phase-04-video-channel-management/TD-05`) que alimentam o dashboard do dono do canal e a página pública do canal, além do endpoint de informações públicas do canal.

**Technical actions:**

1. Adicionar `GET /channels/:nickname` a `ChannelsController` — retorna campos públicos do canal (sem `user_id`)
2. Implementar `ChannelsService.findVideosForOwner(userId, { page, limit, visibility, sort, search })` — retorna todos os status/visibilidades do próprio canal, com `views`/`likes`/`comments` fixos em `0` (per `phase-04-video-channel-management/TD-05` — subsistemas ainda não existem)
3. Implementar `ChannelsService.findPublicVideos(nickname, { page, limit, sort })` — filtra `status: "ready"`, `visibility: "public"`, `published_at IS NOT NULL` (per `phase-04-video-channel-management/TD-02`, `TD-05`)
4. Adicionar `GET /channels/me/videos` e `GET /channels/:nickname/videos` a `ChannelsController`
5. Mapear `CHANNEL_NOT_FOUND` no exception filter

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `ChannelsService.findVideosForOwner` | Integration: filtros de visibilidade/status/paginação, DB real | `channels.service.integration-spec.ts` |
| `ChannelsService.findPublicVideos` | Integration: exclui draft/unlisted/não-publicado, DB real | `channels.service.integration-spec.ts` |

E2E para as 3 rotas é autorado externamente por `/plan-test-specs` no spec referenciado por `**Test Specs:**` acima.

**Dependencies:** SI-04.1 (colunas `category`/`visibility`/`published_at`), SI-04.4 (mesmo controller)

**Acceptance criteria:**

- `GET /channels/me/videos` autenticado retorna vídeos do próprio canal em qualquer status/visibilidade, paginados
- `GET /channels/:nickname/videos` retorna apenas vídeos com `status: "ready"`, `visibility: "public"` e `published_at` preenchido
- `GET /channels/:nickname/videos` de um nickname inexistente retorna `404 CHANNEL_NOT_FOUND`
- `GET /channels/:nickname` retorna `name`, `nickname`, `description`, `created_at` sem `user_id`

---

### SI-04.6 — BFF route handlers: video endpoints

**Route:** PATCH /api/videos/:id, POST /api/videos/:id/publish, PATCH /api/videos/:id/thumbnail

**Description:** Route Handlers same-origin que proxyam os 3 endpoints de vídeo desta fase para o NestJS API, per o modelo strict-BFF (`next-frontend/CLAUDE.md`).

**Technical actions:**

1. Criar `app/api/videos/[id]/route.ts` — exporta `PATCH`, lê `env.API_URL`, forward `Authorization` a partir da sessão iron-session (per `phase-02-auth-frontend/TD-02`), body pass-through
2. Criar `app/api/videos/[id]/publish/route.ts` — exporta `POST`, mesmo padrão de forward
3. Criar `app/api/videos/[id]/thumbnail/route.ts` — exporta `PATCH`, forward do `multipart/form-data` sem re-parsear (per `### API Contracts` → BFF tier)

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `app/api/videos/[id]/route.ts` | Integration (Vitest + MSW): forward correto de método/body/headers, pass-through de erros | `route.integration.test.ts` |
| `app/api/videos/[id]/publish/route.ts` | Integration (Vitest + MSW): idem | `route.integration.test.ts` |
| `app/api/videos/[id]/thumbnail/route.ts` | Integration (Vitest + MSW): forward de multipart | `route.integration.test.ts` |

**Dependencies:** SI-04.2, SI-04.3 (endpoints upstream devem existir)

**Acceptance criteria:**

- `PATCH /api/videos/:id` forward para `PATCH {API_URL}/videos/:id` com o mesmo body e retorna o mesmo status/body do upstream
- `POST /api/videos/:id/publish` forward para `POST {API_URL}/videos/:id/publish`
- `PATCH /api/videos/:id/thumbnail` forward o `multipart/form-data` sem alterar o conteúdo
- Erros do upstream (404, 400, 409) passam through sem reshape

---

### SI-04.7 — BFF route handlers: channel endpoints

**Route:** GET /api/channels/me, PATCH /api/channels/me, GET /api/channels/:nickname, GET /api/channels/me/videos, GET /api/channels/:nickname/videos

**Description:** Route Handlers same-origin que proxyam os 5 endpoints de canal desta fase para o NestJS API, per o modelo strict-BFF.

**Technical actions:**

1. Criar `app/api/channels/me/route.ts` — exporta `GET` e `PATCH`, forward `Authorization` a partir da sessão
2. Criar `app/api/channels/[nickname]/route.ts` — exporta `GET`, sem auth (rota pública)
3. Criar `app/api/channels/me/videos/route.ts` — exporta `GET`, forward de `page`/`limit`/`visibility`/`sort`/`search` + `Authorization`
4. Criar `app/api/channels/[nickname]/videos/route.ts` — exporta `GET`, forward de `page`/`limit`/`sort`, sem auth

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `app/api/channels/me/route.ts` | Integration (Vitest + MSW): GET/PATCH forward, pass-through de `CHANNEL_NICKNAME_TAKEN` | `route.integration.test.ts` |
| `app/api/channels/[nickname]/route.ts` | Integration (Vitest + MSW): forward, `CHANNEL_NOT_FOUND` pass-through | `route.integration.test.ts` |
| `app/api/channels/me/videos/route.ts` | Integration (Vitest + MSW): forward de query params | `route.integration.test.ts` |
| `app/api/channels/[nickname]/videos/route.ts` | Integration (Vitest + MSW): forward de query params | `route.integration.test.ts` |

**Dependencies:** SI-04.4, SI-04.5 (endpoints upstream devem existir)

**Acceptance criteria:**

- `GET /api/channels/me` e `PATCH /api/channels/me` forward para os respectivos endpoints upstream com `Authorization` da sessão
- `GET /api/channels/:nickname` e `GET /api/channels/:nickname/videos` funcionam sem sessão (rotas públicas)
- `GET /api/channels/me/videos` e `GET /api/channels/:nickname/videos` forward todos os query params recebidos
- `409 CHANNEL_NICKNAME_TAKEN` e `404 CHANNEL_NOT_FOUND` passam through sem reshape

---

### SI-04.8.0 — Drift audit: Tela de edição de vídeo

**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-29
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Tela de edição de vídeo (Edit/Publish Video)`

**Technical actions:**

1. **Drift audit** — invoke `figma:figma-implement-design` (narrow handoff) com:
   - Figma URL: https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-29
   - Reused DS components: [] _(nenhum — todo componente é novo per o inventário)_
   - Server-connected component names (sem endpoints/auth/erros): [Title input, Description textarea, Category select, VisibilityRadioGroup, "Change Thumbnail" button, "Save as draft" button, "Publish" button]
   - Target paths (contexto read-only para o audit): `app/dashboard/videos/[id]/edit/page.tsx` + `components/video/video-edit-form.tsx`

   Como não há componentes Reused DS, a tabela de diff fica vazia por construção; a seção ainda é escrita em `frontend-drift-report.md` para manter o contrato uniforme entre telas.

**Dependencies:** none

**Tests:** _(empty — audit-only; the report is the deliverable)_

**Acceptance criteria:**

- `frontend-drift-report.md` existe na pasta do plano; seção `## Screen: tela-de-edicao-de-video` existe com a data da execução atual no heading
- A tabela da seção está vazia (zero componentes Reused DS) mas a seção existe
- `git diff --name-only HEAD -- next-frontend` após esta SI está vazio

---

### SI-04.8a — Tela de edição de vídeo (visual shell)

**Route:** /dashboard/videos/[id]/edit
**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-29
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Tela de edição de vídeo (Edit/Publish Video)`
**Drift Report:** see `frontend-drift-report.md` → `## Screen: tela-de-edicao-de-video`

**Technical actions:**

1. **Apply drift decisions** — ler a seção do Drift Report para esta tela; tabela vazia (sem Reused DS), nenhuma ação a aplicar
2. **Visual shell generation** — invoke `figma:figma-implement-design` com:
   - Figma URL: https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-29
   - Reused DS components: []
   - Server-connected component names: [Title input, Description textarea, Category select, VisibilityRadioGroup, "Change Thumbnail" button, "Save as draft" button, "Publish" button]
   - Target paths: `app/dashboard/videos/[id]/edit/page.tsx` + `components/video/video-edit-form.tsx`

**Dependencies:** SI-04.8.0

**Tests:** _(empty — shell smoke-gated by build AC; Unit tests live in SI-04.8b; E2E in /plan-test-specs spec)_

**Acceptance criteria:**

- `app/dashboard/videos/[id]/edit/page.tsx` e `components/video/video-edit-form.tsx` existem, exportam os componentes esperados e compilam (`npx tsc --noEmit`)
- Renderização confere com o node do Figma dentro da tolerância do design system
- Nenhum import além dos componentes DS/novos listados

---

### SI-04.8b — Tela de edição de vídeo (lógica & wiring)

**Test Specs:** see `next-frontend/specs/video-edit.plan.md`
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Tela de edição de vídeo (Edit/Publish Video)`

**Technical actions:**

1. **Route guard application** — Authenticated+Owner: redireciona não-autenticado a `/login`; verifica ownership do vídeo server-side, `404` caso não seja o dono (mesma semântica owner-only de `phase-03-videos/TD-10`)
2. **Rendering strategy application** — Server Component busca os dados iniciais do vídeo; `components/video/video-edit-form.tsx` é Client Component (`"use client"`) com estado local do formulário (per `phase-02-auth-frontend/TD-04`)
3. **Endpoint wiring** — `react-hook-form` + Zod (per `phase-02-auth-frontend/TD-04`) submete a `PATCH /api/videos/:id` ("Save as draft") ou `POST /api/videos/:id/publish` ("Publish"); upload de thumbnail via `FormData` a `PATCH /api/videos/:id/thumbnail`
4. **Error mapping** — implementa o `Error Catalog → UX mapping` da UI Contract (inline para `VALIDATION_ERROR`/`THUMBNAIL_INVALID_FILE`; toast para `VIDEO_NOT_READY`/`VIDEO_NOT_FOUND`)
5. **Client-side validation mirror** — aplica `title` (max 200), `description` (max 5000), `category` (enum obrigatório), `visibility` (enum obrigatório), `thumbnail` (tipo/tamanho) espelhando `### API Contracts` → Validation Rules

**Dependencies:** SI-04.8a, SI-04.6 (endpoints BFF de vídeo)

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `components/video/video-edit-form.tsx` | Unit per testing-guide-next-frontend § "Client Components" — submit happy path, cada linha do Error Catalog UX mapping, validação client-side pre-submit | `video-edit-form.test.tsx` |

**Acceptance criteria:**

- Submissão do formulário chama o endpoint mapeado com payload tipado; a resposta mapeia para o UX treatment do Error Catalog
- O route guard redireciona corretamente para não-autenticados e não-donos
- A validação client-side confere 1:1 com as Validation Rules do backend

---

### SI-04.9.0 — Drift audit: Dashboard de gerenciamento de vídeos do canal

**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-652
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Dashboard de gerenciamento de vídeos do canal (My videos list)`

**Technical actions:**

1. **Drift audit** — invoke `figma:figma-implement-design` com:
   - Figma URL: https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-652
   - Reused DS components: [`components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/icon-button.tsx`, `components/auth/brand-logo.tsx`]
   - Server-connected component names: [VisibilityFilterChip, DateFilterChip, SearchVideosInput, VideoCountLabel, SortByDropdown, VideoRow, VideoThumbnail, VideoTitle, VideoStats, VideoPublishedAt, VideoStatusBadge, PaginationControls, VideoRowMenuButton]
   - Target paths: `app/dashboard/videos/page.tsx` + `components/video/video-dashboard-list.tsx`

   Para cada componente Reused DS, executar o diff de valor e classificar (`alinhado` / `drift menor` / `drift relevante` / `componente ausente`); escrever a seção em `frontend-drift-report.md`.

**Dependencies:** none

**Tests:** _(empty — audit-only; the report is the deliverable)_

**Acceptance criteria:**

- `frontend-drift-report.md` tem a seção `## Screen: dashboard-de-gerenciamento-de-videos-do-canal` com a data da execução
- Cada componente Reused DS listado tem exatamente uma linha com Decision preenchida
- `git diff --name-only HEAD -- next-frontend` após esta SI está vazio

---

### SI-04.9a — Dashboard de gerenciamento de vídeos do canal (visual shell)

**Route:** /dashboard/videos
**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-652
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Dashboard de gerenciamento de vídeos do canal (My videos list)`
**Drift Report:** see `frontend-drift-report.md` → `## Screen: dashboard-de-gerenciamento-de-videos-do-canal`

**Technical actions:**

1. **Apply drift decisions** — ler a seção do Drift Report; aplicar cada Decision por linha (`skip` / `auto-Edit` / `exception` / `create`) mecanicamente
2. **Visual shell generation** — invoke `figma:figma-implement-design` com os mesmos parâmetros da SI-04.9.0, target paths: `app/dashboard/videos/page.tsx` + `components/video/video-dashboard-list.tsx`

**Dependencies:** SI-04.9.0

**Tests:** _(empty — shell smoke-gated by build AC; Unit tests live in SI-04.9b; E2E in /plan-test-specs spec)_

**Acceptance criteria:**

- `app/dashboard/videos/page.tsx` e `components/video/video-dashboard-list.tsx` existem, exportam os componentes esperados e compilam
- Renderização confere com o node do Figma dentro da tolerância do design system
- Nenhum import além dos componentes DS/novos listados

---

### SI-04.9b — Dashboard de gerenciamento de vídeos do canal (lógica & wiring)

**Test Specs:** see `next-frontend/specs/video-dashboard.plan.md`
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Dashboard de gerenciamento de vídeos do canal (My videos list)`

**Technical actions:**

1. **Route guard application** — Authenticated+Owner: redireciona não-autenticado a `/login`
2. **Rendering strategy application** — Server Component lê `searchParams` (`page`, `visibility`, `sort`, `search`) e busca a página atual server-side; sem cache client-side (per `phase-04-video-channel-management/TD-06`)
3. **Endpoint wiring** — busca inicial via `GET /api/channels/me/videos` com os `searchParams` como query params; navegação de página via `<Link href="?page=n+1">`; `VideoRowMenuButton` navega para `/dashboard/videos/[id]/edit` (sem chamada de API própria)
4. **Error mapping** — `UNAUTHORIZED` → redirect para `/login`
5. **Client-side validation mirror** — não aplicável (sem campos de formulário)

**Dependencies:** SI-04.9a, SI-04.7 (endpoint BFF `GET /api/channels/me/videos`)

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `components/video/video-dashboard-list.tsx` | Unit per testing-guide-next-frontend § "Client Components" — renderização de linhas, filtros locais, paginação | `video-dashboard-list.test.tsx` |

**Acceptance criteria:**

- A página renderiza os vídeos retornados por `GET /api/channels/me/videos` para a página/filtros correntes
- Filtros de visibilidade/data/busca e ordenação disparam nova busca com os query params corretos
- `VideoRowMenuButton` navega para a tela de edição do vídeo correspondente

---

### SI-04.10.0 — Drift audit: Edição de informações do canal

**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-1384
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Edição de informações do canal (Channel Settings)`

**Technical actions:**

1. **Drift audit** — invoke `figma:figma-implement-design` com:
   - Figma URL: https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-1384
   - Reused DS components: [] _(nenhum — todo componente é novo per o inventário)_
   - Server-connected component names: [NicknameField, ChannelNameField, DescriptionField, SaveChangesButton]
   - Target paths: `app/dashboard/channel/page.tsx` + `components/channel/channel-settings-form.tsx`

**Dependencies:** none

**Tests:** _(empty — audit-only; the report is the deliverable)_

**Acceptance criteria:**

- `frontend-drift-report.md` tem a seção `## Screen: edicao-de-informacoes-do-canal` com a data da execução
- A tabela da seção está vazia (zero componentes Reused DS) mas a seção existe
- `git diff --name-only HEAD -- next-frontend` após esta SI está vazio

---

### SI-04.10a — Edição de informações do canal (visual shell)

**Route:** /dashboard/channel
**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-1384
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Edição de informações do canal (Channel Settings)`
**Drift Report:** see `frontend-drift-report.md` → `## Screen: edicao-de-informacoes-do-canal`

**Technical actions:**

1. **Apply drift decisions** — tabela vazia (sem Reused DS), nenhuma ação a aplicar
2. **Visual shell generation** — invoke `figma:figma-implement-design` com os mesmos parâmetros da SI-04.10.0, target paths: `app/dashboard/channel/page.tsx` + `components/channel/channel-settings-form.tsx`

**Dependencies:** SI-04.10.0

**Tests:** _(empty — shell smoke-gated by build AC; Unit tests live in SI-04.10b; E2E in /plan-test-specs spec)_

**Acceptance criteria:**

- `app/dashboard/channel/page.tsx` e `components/channel/channel-settings-form.tsx` existem, exportam os componentes esperados e compilam
- Renderização confere com o node do Figma dentro da tolerância do design system
- Nenhum import além dos componentes DS/novos listados

---

### SI-04.10b — Edição de informações do canal (lógica & wiring)

**Test Specs:** see `next-frontend/specs/channel-settings.plan.md`
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Edição de informações do canal (Channel Settings)`

**Technical actions:**

1. **Route guard application** — Authenticated+Owner: redireciona não-autenticado a `/login`
2. **Rendering strategy application** — Server Component busca os dados atuais do canal (`GET /api/channels/me`); `components/channel/channel-settings-form.tsx` é Client Component com estado local (per `phase-02-auth-frontend/TD-04`)
3. **Endpoint wiring** — `react-hook-form` + Zod submete a `PATCH /api/channels/me`
4. **Error mapping** — `CHANNEL_NICKNAME_TAKEN` → erro inline no campo nickname; `VALIDATION_ERROR` → erro inline no campo correspondente
5. **Client-side validation mirror** — `nickname` (`[a-z0-9_]`), `name` (max 50), `description` (max 5000)

**Dependencies:** SI-04.10a, SI-04.7 (endpoint BFF `PATCH /api/channels/me`)

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `components/channel/channel-settings-form.tsx` | Unit per testing-guide-next-frontend § "Client Components" — submit happy path, erro de nickname duplicado, validação client-side | `channel-settings-form.test.tsx` |

**Acceptance criteria:**

- Submissão do formulário chama `PATCH /api/channels/me` com payload tipado; a resposta mapeia para o UX treatment do Error Catalog
- O route guard redireciona corretamente para não-autenticados
- A validação client-side confere 1:1 com as Validation Rules do backend

---

### SI-04.11.0 — Drift audit: Página pública do canal

**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-30
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Página pública do canal (Channel show)`

**Technical actions:**

1. **Drift audit** — invoke `figma:figma-implement-design` com:
   - Figma URL: https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-30
   - Reused DS components: [] _(nenhum — todo componente é novo per o inventário)_
   - Server-connected component names: [ChannelProfileHeader, VideoCard, VideoSortControl]
   - Target paths: `app/channel/[nickname]/page.tsx` + `components/channel/channel-public-page.tsx`

**Dependencies:** none

**Tests:** _(empty — audit-only; the report is the deliverable)_

**Acceptance criteria:**

- `frontend-drift-report.md` tem a seção `## Screen: pagina-publica-do-canal` com a data da execução
- A tabela da seção está vazia (zero componentes Reused DS) mas a seção existe
- `git diff --name-only HEAD -- next-frontend` após esta SI está vazio

---

### SI-04.11a — Página pública do canal (visual shell)

**Route:** /channel/[nickname]
**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-30
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Página pública do canal (Channel show)`
**Drift Report:** see `frontend-drift-report.md` → `## Screen: pagina-publica-do-canal`

**Technical actions:**

1. **Apply drift decisions** — tabela vazia (sem Reused DS), nenhuma ação a aplicar
2. **Visual shell generation** — invoke `figma:figma-implement-design` com os mesmos parâmetros da SI-04.11.0, target paths: `app/channel/[nickname]/page.tsx` + `components/channel/channel-public-page.tsx`

**Dependencies:** SI-04.11.0

**Tests:** _(empty — shell smoke-gated by build AC; Unit tests live in SI-04.11b; E2E in /plan-test-specs spec)_

**Acceptance criteria:**

- `app/channel/[nickname]/page.tsx` e `components/channel/channel-public-page.tsx` existem, exportam os componentes esperados e compilam
- Renderização confere com o node do Figma dentro da tolerância do design system
- Nenhum import além dos componentes DS/novos listados

---

### SI-04.11b — Página pública do canal (lógica & wiring)

**Test Specs:** see `next-frontend/specs/channel-public-page.plan.md`
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Página pública do canal (Channel show)`

**Technical actions:**

1. **Route guard application** — Anonymous: nenhum guard de autenticação
2. **Rendering strategy application** — Server Component lê `searchParams` (`page`, `sort`) e busca dados server-side; sem cache client-side (per `phase-04-video-channel-management/TD-06`)
3. **Endpoint wiring** — busca `GET /api/channels/:nickname` (header do canal) e `GET /api/channels/:nickname/videos` (grid de vídeos) em paralelo
4. **Error mapping** — `CHANNEL_NOT_FOUND` → renderiza a página `not-found` do Next.js
5. **Client-side validation mirror** — não aplicável (sem campos de formulário)

**Dependencies:** SI-04.11a, SI-04.7 (endpoints BFF `GET /api/channels/:nickname` e `GET /api/channels/:nickname/videos`)

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `components/channel/channel-public-page.tsx` | Unit per testing-guide-next-frontend § "Client Components" — renderização do header e do grid, estado vazio, reordenação | `channel-public-page.test.tsx` |

**Acceptance criteria:**

- A página renderiza as informações do canal e a lista de vídeos públicos retornados pelos dois endpoints
- Um nickname inexistente renderiza a página `not-found`
- A reordenação (`VideoSortControl`) dispara nova busca com o `sort` correto

---

## Technical Specifications

### Data Model

#### Video (modified — new columns)

| Field | Type | Constraints |
|-------|------|-------------|
| title | varchar(200) | nullable — never set at upload time (per `phase-03-videos/TD-06`), filled in via the edit form _(gap discovered during SI-04.2 implementation; Video info editing capability requires it — added alongside `description`)_ |
| description | text | nullable — same rationale as `title` |
| category | enum (`videos_category_enum`) | not null, default `other` — values: `education`, `entertainment`, `gaming`, `music`, `news`, `sports`, `technology`, `other` *(per phase-04-video-channel-management/TD-01)* |
| published_at | timestamptz | nullable — `null` while draft; set once on publish, never cleared *(per phase-04-video-channel-management/TD-02)* |
| visibility | enum (`videos_visibility_enum`) | not null, default `public` — values: `public`, `unlisted` *(per phase-04-video-channel-management/TD-02)* |

**Relations:** unchanged — `Video` still belongs to `User` and `Channel` (per `phase-03-videos/TD-05` and the inherited entity structure).
**Indexes:** none added — `category` and `visibility` are low-cardinality filters consumed inside the existing `channel_id`-scoped queries (per phase-04-video-channel-management/TD-05's pagination model). Add an index only if a post-implementation query plan shows it necessary.

### API Contracts

#### Backend tier

#### PATCH /videos/:id (SI-04.2)

**Request headers:**
- Authorization: Bearer {access_token}
- Content-Type: application/json

**Request body:** `UpdateVideoDto`
- title: string, optional — max 200 characters
- description: string, optional — max 5000 characters
- category: string, optional — one of `videos_category_enum` (per phase-04-video-channel-management/TD-01)
- visibility: string, optional — `public` | `unlisted` (per phase-04-video-channel-management/TD-02)

**Response 200:**
- id, public_id, title, description, category, visibility, thumbnail_key, status, published_at, updated_at

**Error responses:**
- 404 VIDEO_NOT_FOUND: video does not exist or is not owned by the caller
- 400 VALIDATION_ERROR: request body fails schema validation (includes `category`/`visibility` outside their enums, via `@IsEnum`)

---

#### POST /videos/:id/publish (SI-04.2)

**Request headers:**
- Authorization: Bearer {access_token}
- Content-Type: application/json

**Request body:** `UpdateVideoDto` — same shape as `PATCH /videos/:id`; fields are persisted and `published_at` is set in the same call (per phase-04-video-channel-management/TD-02)

**Response 200:**
- id, public_id, title, description, category, visibility, thumbnail_key, status, published_at, updated_at

**Error responses:**
- 404 VIDEO_NOT_FOUND: video does not exist or is not owned by the caller
- 400 VALIDATION_ERROR: request body fails schema validation
- 400 VIDEO_NOT_READY: video `status` is not `ready` (status lifecycle per `phase-03-videos/TD-10`) — cannot publish a video still `draft`, `processing`, or `error`

---

#### PATCH /videos/:id/thumbnail (SI-04.3)

**Request headers:**
- Authorization: Bearer {access_token}
- Content-Type: multipart/form-data

**Request body:**
- thumbnail: file, required — image (jpeg/png/webp), max 5MB — validated via `ParseFilePipe` + `FileTypeValidator` + `MaxFileSizeValidator` (per phase-04-video-channel-management/TD-03)

**Response 200:**
- id, thumbnail_key

**Error responses:**
- 404 VIDEO_NOT_FOUND: video does not exist or is not owned by the caller
- 400 THUMBNAIL_INVALID_FILE: file is missing, not an accepted image type, or exceeds the size limit

---

#### GET /channels/me (SI-04.4)

**Request headers:**
- Authorization: Bearer {access_token}

**Response 200:**
- id, name, nickname, description, created_at, updated_at

**Error responses:**
- 401 UNAUTHORIZED: missing or invalid access token

---

#### PATCH /channels/me (SI-04.4)

**Request headers:**
- Authorization: Bearer {access_token}
- Content-Type: application/json

**Request body:** `UpdateChannelDto`
- nickname: string, optional — `[a-z0-9_]` allowlist (inherited handle convention, per `phase-02-auth/TD-10`)
- name: string, optional — max 50 characters (existing `Channel.name` column constraint)
- description: string, optional — max 5000 characters

**Response 200:**
- id, name, nickname, description, updated_at

**Error responses:**
- 409 CHANNEL_NICKNAME_TAKEN: the requested nickname is already in use (per phase-04-video-channel-management/TD-04)
- 400 VALIDATION_ERROR: request body fails schema validation

---

#### GET /channels/:nickname (SI-04.5)

**Response 200:**
- id, name, nickname, description, created_at — channel-public fields only, no `user_id`/email

**Error responses:**
- 404 CHANNEL_NOT_FOUND: no channel with this nickname

---

#### GET /channels/me/videos (SI-04.5)

**Request headers:**
- Authorization: Bearer {access_token}

**Request query parameters:**
- page: number, optional — default 1 (offset/limit pagination per phase-04-video-channel-management/TD-05)
- limit: number, optional — default 20
- visibility: string, optional — filter by `public` | `unlisted`
- sort: string, optional — `latest` | `oldest`, default `latest`
- search: string, optional — filters by title substring

**Response 200:**
- items: array of `{ id, public_id, title, thumbnail_key, category, visibility, status, published_at, views, likes, comments }`
- page, limit, total

**Error responses:**
- 401 UNAUTHORIZED: missing or invalid access token

_`views`, `likes`, `comments` are returned as `0` — the subsystems that populate them (view tracking, likes, comments) are not built until Phase 05/Phase 06 (per phase-04-video-channel-management/TD-05)._

---

#### GET /channels/:nickname/videos (SI-04.5)

**Request query parameters:**
- page: number, optional — default 1 (offset/limit pagination per phase-04-video-channel-management/TD-05)
- limit: number, optional — default 20
- sort: string, optional — `latest` | `popular` | `oldest`, default `latest`

**Response 200:**
- items: array of `{ id, public_id, title, thumbnail_key, duration_seconds, published_at, views }`
- page, limit, total

Only videos with `status: ready`, `visibility: public`, and `published_at` set are included (per phase-04-video-channel-management/TD-02, TD-05).

**Error responses:**
- 404 CHANNEL_NOT_FOUND: no channel with this nickname

---

#### Validation Rules — Video & Channel editing

- `title` (PATCH /videos/:id): optional, max 200 characters
- `description` (PATCH /videos/:id): optional, max 5000 characters
- `category` (PATCH /videos/:id): optional, one of `videos_category_enum`
- `visibility` (PATCH /videos/:id): optional, `public` | `unlisted`
- `nickname` (PATCH /channels/me): optional, `[a-z0-9_]` allowlist
- `name` (PATCH /channels/me): optional, max 50 characters
- `description` (PATCH /channels/me): optional, max 5000 characters
- `thumbnail` (PATCH /videos/:id/thumbnail): required, image (jpeg/png/webp), max 5MB

#### BFF tier (frontend-exposed contract)

> _BFF tier — frontend-exposed contract. The browser calls the FE-facing route; the route proxies the upstream per the project's strict-BFF architecture (`next-frontend/CLAUDE.md` § "Talking to the NestJS API")._

#### PATCH /api/videos/:id (SI-04.6)

**forwards-to:** `PATCH /videos/:id` *(derived: project contract source — backend tier above)*

**Request headers:**
- Content-Type: application/json *(derived: project contract source — backend tier above)*

**Request body:** `UpdateVideoDto` *(derived: project contract source — backend tier above; fields per the backend tier's `PATCH /videos/:id`; not re-spelled here)*

**Response 200 (FE-facing):** pass-through *(derived: project contract source — backend tier above; reshape: none)*

**Error responses (FE-facing):**
- 404 VIDEO_NOT_FOUND: pass-through *(derived: project contract source — backend tier above)*
- 400 VALIDATION_ERROR: pass-through *(derived: project contract source — backend tier above)*

---

#### POST /api/videos/:id/publish (SI-04.6)

**forwards-to:** `POST /videos/:id/publish` *(derived: project contract source — backend tier above)*

**Request headers:**
- Content-Type: application/json *(derived: project contract source — backend tier above)*

**Request body:** `UpdateVideoDto` *(derived: project contract source — backend tier above; same shape as the backend tier's publish endpoint; not re-spelled here)*

**Response 200 (FE-facing):** pass-through *(derived: project contract source — backend tier above; reshape: none)*

**Error responses (FE-facing):**
- 404 VIDEO_NOT_FOUND: pass-through *(derived: project contract source — backend tier above)*
- 400 VALIDATION_ERROR / 400 VIDEO_NOT_READY: pass-through *(derived: project contract source — backend tier above)*

---

#### PATCH /api/videos/:id/thumbnail (SI-04.6)

**forwards-to:** `PATCH /videos/:id/thumbnail` *(derived: project contract source — backend tier above)*

**Request headers:**
- Content-Type: multipart/form-data *(derived: project contract source — backend tier above)*

**Request body:** forwarded `multipart/form-data` stream (the `thumbnail` file field) — no JSON DTO to alias; the BFF forwards the incoming request body unread *(per phase-04-video-channel-management/TD-03)*

**Response 200 (FE-facing):** pass-through *(derived: project contract source — backend tier above; reshape: none)*

**Error responses (FE-facing):**
- 404 VIDEO_NOT_FOUND / 400 THUMBNAIL_INVALID_FILE: pass-through *(derived: project contract source — backend tier above)*

---

#### GET /api/channels/me (SI-04.6)

**forwards-to:** `GET /channels/me` *(derived: project contract source — backend tier above)*

**Response 200 (FE-facing):** pass-through *(derived: project contract source — backend tier above; reshape: none)*

**Error responses (FE-facing):**
- 401 UNAUTHORIZED: pass-through *(derived: project contract source — backend tier above)*

---

#### PATCH /api/channels/me (SI-04.6)

**forwards-to:** `PATCH /channels/me` *(derived: project contract source — backend tier above)*

**Request headers:**
- Content-Type: application/json *(derived: project contract source — backend tier above)*

**Request body:** `UpdateChannelDto` *(derived: project contract source — backend tier above; fields per the backend tier's `PATCH /channels/me`; not re-spelled here)*

**Response 200 (FE-facing):** pass-through *(derived: project contract source — backend tier above; reshape: none)*

**Error responses (FE-facing):**
- 409 CHANNEL_NICKNAME_TAKEN: pass-through *(derived: project contract source — backend tier above)*
- 400 VALIDATION_ERROR: pass-through *(derived: project contract source — backend tier above)*

---

#### GET /api/channels/:nickname (SI-04.6)

**forwards-to:** `GET /channels/:nickname` *(derived: project contract source — backend tier above)*

**Response 200 (FE-facing):** pass-through *(derived: project contract source — backend tier above; reshape: none)*

**Error responses (FE-facing):**
- 404 CHANNEL_NOT_FOUND: pass-through *(derived: project contract source — backend tier above)*

---

#### GET /api/channels/me/videos (SI-04.6)

**forwards-to:** `GET /channels/me/videos` *(derived: project contract source — backend tier above)*

**Request query parameters:** `page`, `limit`, `visibility`, `sort`, `search` — forwarded verbatim *(derived: project contract source — backend tier above)*

**Response 200 (FE-facing):** pass-through *(derived: project contract source — backend tier above; reshape: none)*

**Error responses (FE-facing):**
- 401 UNAUTHORIZED: pass-through *(derived: project contract source — backend tier above)*

---

#### GET /api/channels/:nickname/videos (SI-04.6)

**forwards-to:** `GET /channels/:nickname/videos` *(derived: project contract source — backend tier above)*

**Request query parameters:** `page`, `limit`, `sort` — forwarded verbatim *(derived: project contract source — backend tier above)*

**Response 200 (FE-facing):** pass-through *(derived: project contract source — backend tier above; reshape: none)*

**Error responses (FE-facing):**
- 404 CHANNEL_NOT_FOUND: pass-through *(derived: project contract source — backend tier above)*

---

### Authorization Matrix

| Endpoint | Anonymous | Authenticated | Owner |
|----------|-----------|---------------|-------|
| PATCH /videos/:id | ✗ | ✗ | ✓ |
| POST /videos/:id/publish | ✗ | ✗ | ✓ |
| PATCH /videos/:id/thumbnail | ✗ | ✗ | ✓ |
| GET /channels/me | ✗ | ✗ | ✓ |
| PATCH /channels/me | ✗ | ✗ | ✓ |
| GET /channels/me/videos | ✗ | ✗ | ✓ |
| GET /channels/:nickname | ✓ | ✓ | ✓ |
| GET /channels/:nickname/videos | ✓ | ✓ | ✓ |

### Error Catalog

| errorCode | HTTP | Trigger |
|-----------|------|---------|
| VIDEO_NOT_FOUND | 404 | Vídeo não existe ou não pertence ao usuário autenticado |
| VIDEO_NOT_READY | 400 | Tentativa de publicar um vídeo cujo status não é `ready` |
| THUMBNAIL_INVALID_FILE | 400 | Arquivo de thumbnail ausente, tipo não aceito, ou excede o tamanho máximo |
| CHANNEL_NOT_FOUND | 404 | Nenhum canal encontrado com o nickname informado |
| CHANNEL_NICKNAME_TAKEN | 409 | Nickname já em uso por outro canal |
| VALIDATION_ERROR | 400 | Corpo da requisição falha na validação de schema (class-validator) — inclui `category`/`visibility` fora do enum via `@IsEnum` |

### UI Contracts

#### Screen: Tela de edição de vídeo (Edit/Publish Video)

**Route:** `/dashboard/videos/[id]/edit`
**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-29 (node `40c57EfcNjN6u5St7n5SlG:39:29`)
**Purpose:** "Video information editing: title, description, category, and custom thumbnail"

**Auth requirement:** Authenticated+Owner _(source: §Authorization Matrix — PATCH /videos/:id, POST /videos/:id/publish, PATCH /videos/:id/thumbnail are all Owner-only)_

**Rendering strategy:** Server Component page shell + Client Component form _(source: phase-02-auth-frontend/TD-04 — react-hook-form + Zod pattern, the only established form-rendering convention in this project)_

**Reused DS components:**
_None — every component in this screen is new per the inventory (no Code Connect map / filesystem match was found for this frame)._

**Server-connected components:**
- `Title input` — verbs: Editar título do vídeo | endpoint: `PATCH /api/videos/:id` (§API Contracts → BFF tier) | reuse: new
- `Description textarea` — verbs: Editar descrição do vídeo | endpoint: `PATCH /api/videos/:id` (§API Contracts → BFF tier) | reuse: new
- `Category select` — verbs: Exibir categorias disponíveis para seleção, Selecionar categoria do vídeo | endpoint: `PATCH /api/videos/:id` (§API Contracts → BFF tier) | reuse: new
- `VisibilityRadioGroup` — verbs: Selecionar visibilidade do vídeo | endpoint: `PATCH /api/videos/:id` (§API Contracts → BFF tier) | reuse: new
- `"Change Thumbnail" button` — verbs: Disparar upload de novo thumbnail customizado | endpoint: `PATCH /api/videos/:id/thumbnail` (§API Contracts → BFF tier) | reuse: new
- `"Save as draft" button` — verbs: Salvar vídeo como rascunho | endpoint: `PATCH /api/videos/:id` (§API Contracts → BFF tier) | reuse: new
- `"Publish" button` — verbs: Publicar vídeo | endpoint: `POST /api/videos/:id/publish` (§API Contracts → BFF tier) | reuse: new

**Behaviors:**

*Rendered states:*
- Loading: skeleton form while the Server Component fetches the current video's fields
- Empty: not applicable — the video always exists by the time this screen is reached
- Success: inline "Saved" confirmation on draft save; redirect to the dashboard on publish
- Error: inline per-field errors (validation, category, visibility); toast for `VIDEO_NOT_FOUND` / `VIDEO_NOT_READY`

**Error Catalog → UX mapping:**

| errorCode (from §Error Catalog) | UX treatment |
|---------------------------------|--------------|
| VALIDATION_ERROR | Inline form field error beneath the offending field (title/description/category/visibility) |
| THUMBNAIL_INVALID_FILE | Inline error beneath the thumbnail control |
| VIDEO_NOT_READY | Toast blocking the publish action, explaining the video is still processing |
| VIDEO_NOT_FOUND | Toast + redirect to the dashboard |

**Client-side validation mirror:** _(source: §API Contracts → Validation Rules)_

- `title`: optional, max 200 characters
- `description`: optional, max 5000 characters
- `category`: optional, one of `videos_category_enum`
- `visibility`: optional, `public` | `unlisted`
- `thumbnail`: required on upload, image (jpeg/png/webp), max 5MB

**Accessibility notes:**
- Follow DS defaults — no accessibility-specific bullets in the inventory's Observations for this screen.

---

#### Screen: Dashboard de gerenciamento de vídeos do canal (My videos list)

**Route:** `/dashboard/videos`
**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-652 (node `40c57EfcNjN6u5St7n5SlG:39:652`)
**Purpose:** "Channel video management dashboard (thumbnail, title, views, likes, comments, publish time, and status)"

**Auth requirement:** Authenticated+Owner _(source: §Authorization Matrix — GET /channels/me/videos is Owner-only)_

**Rendering strategy:** Server Component reading `searchParams`, no client-side cache _(source: phase-04-video-channel-management/TD-06)_

**Reused DS components:**
- `components/ui/button.tsx` — `VisibilityFilterChip "Public"`, `DateFilterChip`, `FilterButton`, `UploadVideoButton` (per inventory)
- `components/ui/input.tsx` — `SearchVideosInput` (per inventory)
- `components/ui/icon-button.tsx` — `SidebarToggleButton`, `CreateVideoIconButton`, `VideoRowMenuButton` (per inventory)
- `components/auth/brand-logo.tsx` — `BrandLogo` (per inventory)

**Server-connected components:**
- `VisibilityFilterChip "Public"` — verbs: Filtrar vídeos do canal por status de visibilidade | endpoint: `GET /api/channels/me/videos` (§API Contracts → BFF tier, `visibility` query param) | reuse: `components/ui/button.tsx`
- `DateFilterChip` — verbs: Filtrar/ordenar vídeos do canal por data de publicação | endpoint: `GET /api/channels/me/videos` (§API Contracts → BFF tier, `sort` query param) | reuse: `components/ui/button.tsx`
- `SearchVideosInput` — verbs: Buscar vídeos do canal por palavra-chave | endpoint: `GET /api/channels/me/videos` (§API Contracts → BFF tier, `search` query param) | reuse: `components/ui/input.tsx`
- `VideoCountLabel` — verbs: Exibir contagem total de vídeos do canal | endpoint: `GET /api/channels/me/videos` (§API Contracts → BFF tier, `total` field) | reuse: new
- `SortByDropdown` — verbs: Reordenar lista de vídeos do canal | endpoint: `GET /api/channels/me/videos` (§API Contracts → BFF tier, `sort` query param) | reuse: new
- `VideoRow` / `VideoThumbnail` / `VideoTitle` / `VideoStats` / `VideoPublishedAt` / `VideoStatusBadge` — verbs: Exibir vídeo/thumbnail/título/contagens/tempo de publicação/status na lista | endpoint: `GET /api/channels/me/videos` (§API Contracts → BFF tier, `items[]` fields) | reuse: new
- `PaginationControls` — verbs: Navegar entre páginas da lista de vídeos do canal | endpoint: `GET /api/channels/me/videos` (§API Contracts → BFF tier, `page`/`limit` query params) | reuse: new
- `VideoRowMenuButton` — verbs: Abrir menu de ações do vídeo (entry point para edição) | navigates to the "Tela de edição de vídeo" screen, which calls `PATCH /api/videos/:id` (§API Contracts → BFF tier) — this trigger itself makes no direct API call | reuse: `components/ui/icon-button.tsx`

**Behaviors:**

*Rendered states:*
- Loading: skeleton rows while the Server Component fetches the current page
- Empty: "You haven't uploaded any videos yet" with a CTA to the upload flow (per Phase 03)
- Success: paginated video rows rendered
- Error: toast with retry

**Error Catalog → UX mapping:**

| errorCode (from §Error Catalog) | UX treatment |
|---------------------------------|--------------|
| UNAUTHORIZED | Redirect to `/login` |

**Client-side validation mirror:** _Not applicable — this screen has no form fields; all inputs are query-string filters, not validated request bodies._

**Accessibility notes:**
- Follow DS defaults — no accessibility-specific bullets in the inventory's Observations for this screen.

---

#### Screen: Edição de informações do canal (Channel Settings)

**Route:** `/dashboard/channel`
**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-1384 (node `40c57EfcNjN6u5St7n5SlG:39:1384`)
**Purpose:** "Channel information editing: nickname, name, and description"

**Auth requirement:** Authenticated+Owner _(source: §Authorization Matrix — GET /channels/me, PATCH /channels/me are Owner-only)_

**Rendering strategy:** Server Component page shell + Client Component form _(source: phase-02-auth-frontend/TD-04 — react-hook-form + Zod pattern, the only established form-rendering convention in this project)_

**Reused DS components:**
_None — every component in this screen is new per the inventory (no Code Connect map / filesystem match was found for this frame)._

**Server-connected components:**
- `NicknameField` — verbs: Editar apelido (nickname) do canal | endpoint: `PATCH /api/channels/me` (§API Contracts → BFF tier) | reuse: new
- `ChannelNameField` — verbs: Editar nome do canal | endpoint: `PATCH /api/channels/me` (§API Contracts → BFF tier) | reuse: new
- `DescriptionField` — verbs: Editar descrição do canal | endpoint: `PATCH /api/channels/me` (§API Contracts → BFF tier) | reuse: new
- `SaveChangesButton` — verbs: Salvar alterações das informações do canal | endpoint: `PATCH /api/channels/me` (§API Contracts → BFF tier) | reuse: new

**Behaviors:**

*Rendered states:*
- Loading: skeleton form while the Server Component fetches the current channel's fields (`GET /api/channels/me`)
- Empty: not applicable — the channel always exists (auto-created at registration, per `phase-02-auth/TD-10`)
- Success: inline "Channel updated" confirmation
- Error: inline per-field errors, notably nickname conflict

**Error Catalog → UX mapping:**

| errorCode (from §Error Catalog) | UX treatment |
|---------------------------------|--------------|
| CHANNEL_NICKNAME_TAKEN | Inline nickname field error: "This nickname is already taken" |
| VALIDATION_ERROR | Inline form field error beneath the offending field |

**Client-side validation mirror:** _(source: §API Contracts → Validation Rules)_

- `nickname`: optional, `[a-z0-9_]` allowlist
- `name`: optional, max 50 characters
- `description`: optional, max 5000 characters

**Accessibility notes:**
- Follow DS defaults — no accessibility-specific bullets in the inventory's Observations for this screen.

---

#### Screen: Página pública do canal (Channel show)

**Route:** `/channel/[nickname]`
**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-30 (node `40c57EfcNjN6u5St7n5SlG:39:30`)
**Purpose:** "Public channel page with information and video listing"

**Auth requirement:** Anonymous _(source: §Authorization Matrix — GET /channels/:nickname and GET /channels/:nickname/videos are both public)_

**Rendering strategy:** Server Component reading `searchParams`, no client-side cache _(source: phase-04-video-channel-management/TD-06)_

**Reused DS components:**
_None — every component in this screen is new per the inventory (no Code Connect map / filesystem match was found for this frame)._

**Server-connected components:**
- `ChannelProfileHeader` — verbs: Exibir informações públicas do canal | endpoint: `GET /api/channels/:nickname` (§API Contracts → BFF tier) | reuse: new
- `VideoCard` — verbs: Exibir lista de vídeos publicados (visibilidade pública) do canal | endpoint: `GET /api/channels/:nickname/videos` (§API Contracts → BFF tier) | reuse: new
- `VideoSortControl` — verbs: Reordenar lista de vídeos publicados do canal | endpoint: `GET /api/channels/:nickname/videos` (§API Contracts → BFF tier, `sort` query param) | reuse: new

**Behaviors:**

*Rendered states:*
- Loading: skeleton banner + video grid while the Server Component fetches
- Empty: "This channel has no public videos yet"
- Success: channel header + paginated public video grid
- Error: Next.js not-found page on unknown nickname

**Error Catalog → UX mapping:**

| errorCode (from §Error Catalog) | UX treatment |
|---------------------------------|--------------|
| CHANNEL_NOT_FOUND | Render Next.js `not-found` page |

**Client-side validation mirror:** _Not applicable — this screen has no form fields._

**Accessibility notes:**
- Follow DS defaults — no accessibility-specific bullets in the inventory's Observations for this screen.

### UI ↔ API Traceability Matrix

| Verb | Component | Screen | Endpoint (from API Contracts) | TD ref |
|------|-----------|--------|-------------------------------|--------|
| Editar título do vídeo | Title input | /dashboard/videos/[id]/edit | PATCH /api/videos/:id → forwards-to PATCH /videos/:id | phase-04-video-channel-management/TD-01 |
| Editar descrição do vídeo | Description textarea | /dashboard/videos/[id]/edit | PATCH /api/videos/:id → forwards-to PATCH /videos/:id | phase-04-video-channel-management/TD-01 |
| Disparar upload de novo thumbnail customizado | "Change Thumbnail" button | /dashboard/videos/[id]/edit | PATCH /api/videos/:id/thumbnail → forwards-to PATCH /videos/:id/thumbnail | phase-04-video-channel-management/TD-03 |
| Exibir categorias disponíveis para seleção | Category select | /dashboard/videos/[id]/edit | PATCH /api/videos/:id → forwards-to PATCH /videos/:id | phase-04-video-channel-management/TD-01 |
| Selecionar categoria do vídeo | Category select | /dashboard/videos/[id]/edit | PATCH /api/videos/:id → forwards-to PATCH /videos/:id | phase-04-video-channel-management/TD-01 |
| Selecionar visibilidade do vídeo (público ou não listado) | VisibilityRadioGroup | /dashboard/videos/[id]/edit | PATCH /api/videos/:id → forwards-to PATCH /videos/:id | phase-04-video-channel-management/TD-02 |
| Salvar vídeo como rascunho | "Save as draft" button | /dashboard/videos/[id]/edit | PATCH /api/videos/:id → forwards-to PATCH /videos/:id | phase-04-video-channel-management/TD-02 |
| Publicar vídeo | "Publish" button | /dashboard/videos/[id]/edit | POST /api/videos/:id/publish → forwards-to POST /videos/:id/publish | phase-04-video-channel-management/TD-02 |
| Filtrar vídeos do canal por status de visibilidade (Public) | VisibilityFilterChip "Public" | /dashboard/videos | GET /api/channels/me/videos → forwards-to GET /channels/me/videos | phase-04-video-channel-management/TD-05 |
| Filtrar/ordenar vídeos do canal por data de publicação | DateFilterChip | /dashboard/videos | GET /api/channels/me/videos → forwards-to GET /channels/me/videos | phase-04-video-channel-management/TD-05 |
| Buscar vídeos do canal por palavra-chave | SearchVideosInput | /dashboard/videos | GET /api/channels/me/videos → forwards-to GET /channels/me/videos | phase-04-video-channel-management/TD-05 |
| Exibir contagem total de vídeos do canal | VideoCountLabel | /dashboard/videos | GET /api/channels/me/videos → forwards-to GET /channels/me/videos | phase-04-video-channel-management/TD-05 |
| Reordenar lista de vídeos do canal | SortByDropdown | /dashboard/videos | GET /api/channels/me/videos → forwards-to GET /channels/me/videos | phase-04-video-channel-management/TD-05 |
| Exibir vídeo individual do canal na lista do dashboard | VideoRow | /dashboard/videos | GET /api/channels/me/videos → forwards-to GET /channels/me/videos | phase-04-video-channel-management/TD-05 |
| Exibir thumbnail do vídeo na lista do dashboard | VideoThumbnail | /dashboard/videos | GET /api/channels/me/videos → forwards-to GET /channels/me/videos | phase-04-video-channel-management/TD-05 |
| Exibir título do vídeo na lista do dashboard | VideoTitle | /dashboard/videos | GET /api/channels/me/videos → forwards-to GET /channels/me/videos | phase-04-video-channel-management/TD-05 |
| Exibir contagem de visualizações do vídeo | VideoStats | /dashboard/videos | GET /api/channels/me/videos → forwards-to GET /channels/me/videos | phase-04-video-channel-management/TD-05 |
| Exibir contagem de curtidas do vídeo | VideoStats | /dashboard/videos | GET /api/channels/me/videos → forwards-to GET /channels/me/videos | phase-04-video-channel-management/TD-05 |
| Exibir contagem de comentários do vídeo | VideoStats | /dashboard/videos | GET /api/channels/me/videos → forwards-to GET /channels/me/videos | phase-04-video-channel-management/TD-05 |
| Exibir tempo de publicação do vídeo | VideoPublishedAt | /dashboard/videos | GET /api/channels/me/videos → forwards-to GET /channels/me/videos | phase-04-video-channel-management/TD-05 |
| Exibir status de visibilidade do vídeo (Public/Unlisted) | VideoStatusBadge | /dashboard/videos | GET /api/channels/me/videos → forwards-to GET /channels/me/videos | phase-04-video-channel-management/TD-02 |
| Navegar entre páginas da lista de vídeos do canal | PaginationControls | /dashboard/videos | GET /api/channels/me/videos → forwards-to GET /channels/me/videos | phase-04-video-channel-management/TD-05 |
| Abrir menu de ações do vídeo (entry point para edição) | VideoRowMenuButton | /dashboard/videos | _(navigation only — leads to PATCH /api/videos/:id on the edit screen)_ | phase-04-video-channel-management/TD-03 |
| Editar apelido (nickname) do canal | NicknameField | /dashboard/channel | PATCH /api/channels/me → forwards-to PATCH /channels/me | phase-04-video-channel-management/TD-04 |
| Editar nome do canal | ChannelNameField | /dashboard/channel | PATCH /api/channels/me → forwards-to PATCH /channels/me | phase-04-video-channel-management/TD-04 |
| Editar descrição do canal | DescriptionField | /dashboard/channel | PATCH /api/channels/me → forwards-to PATCH /channels/me | phase-04-video-channel-management/TD-04 |
| Salvar alterações das informações do canal | SaveChangesButton | /dashboard/channel | PATCH /api/channels/me → forwards-to PATCH /channels/me | phase-04-video-channel-management/TD-04 |
| Exibir informações públicas do canal | ChannelProfileHeader | /channel/[nickname] | GET /api/channels/:nickname → forwards-to GET /channels/:nickname | phase-04-video-channel-management/TD-05 |
| Exibir lista de vídeos publicados (visibilidade pública) do canal | VideoCard | /channel/[nickname] | GET /api/channels/:nickname/videos → forwards-to GET /channels/:nickname/videos | phase-04-video-channel-management/TD-05 |
| Reordenar lista de vídeos publicados do canal (mais recentes / populares / mais antigos) | VideoSortControl | /channel/[nickname] | GET /api/channels/:nickname/videos → forwards-to GET /channels/:nickname/videos | phase-04-video-channel-management/TD-05 |

_Capabilities marked in `## Non-UI / Deferred Capabilities` are excluded from this matrix (none in this phase)._

<!-- phase-a-complete -->

---

## Dependency Map

```
SI-04.1 (root)
└── SI-04.2 — depends on SI-04.1 (colunas category/visibility/published_at devem existir)
    └── SI-04.6 — depends on SI-04.2 + SI-04.3 (endpoints upstream de vídeo)
        └── SI-04.8b — depends on SI-04.8a + SI-04.6 (wiring precisa do BFF de vídeo)
SI-04.3 (root, independente)
└── SI-04.6 (ver acima — depende também de SI-04.3)
SI-04.4 (root)
├── SI-04.5 — depends on SI-04.1 + SI-04.4 (mesmo controller; colunas de vídeo)
│   └── SI-04.7 — depends on SI-04.4 + SI-04.5 (endpoints upstream de canal)
│       ├── SI-04.9b — depends on SI-04.9a + SI-04.7
│       ├── SI-04.10b — depends on SI-04.10a + SI-04.7
│       └── SI-04.11b — depends on SI-04.11a + SI-04.7
SI-04.8.0 (root)
└── SI-04.8a — depends on SI-04.8.0
    └── SI-04.8b (ver acima)
SI-04.9.0 (root)
└── SI-04.9a — depends on SI-04.9.0
    └── SI-04.9b (ver acima)
SI-04.10.0 (root)
└── SI-04.10a — depends on SI-04.10.0
    └── SI-04.10b (ver acima)
SI-04.11.0 (root)
└── SI-04.11a — depends on SI-04.11.0
    └── SI-04.11b (ver acima)
```

---

## Deliverables

- [ ] SI-04.1 — Video entity: category, published_at, visibility columns
- [ ] SI-04.2 — Video edit & publish endpoints
- [ ] SI-04.3 — Custom thumbnail upload endpoint
- [ ] SI-04.4 — Channel controller: own-channel read & edit
- [ ] SI-04.5 — Channel & dashboard video listings
- [ ] SI-04.6 — BFF route handlers: video endpoints
- [ ] SI-04.7 — BFF route handlers: channel endpoints
- [ ] SI-04.8.0 — Drift audit: Tela de edição de vídeo
- [ ] SI-04.8a — Tela de edição de vídeo (visual shell)
- [ ] SI-04.8b — Tela de edição de vídeo (lógica & wiring)
- [ ] SI-04.9.0 — Drift audit: Dashboard de gerenciamento de vídeos do canal
- [ ] SI-04.9a — Dashboard de gerenciamento de vídeos do canal (visual shell)
- [ ] SI-04.9b — Dashboard de gerenciamento de vídeos do canal (lógica & wiring)
- [ ] SI-04.10.0 — Drift audit: Edição de informações do canal
- [ ] SI-04.10a — Edição de informações do canal (visual shell)
- [ ] SI-04.10b — Edição de informações do canal (lógica & wiring)
- [ ] SI-04.11.0 — Drift audit: Página pública do canal
- [ ] SI-04.11a — Página pública do canal (visual shell)
- [ ] SI-04.11b — Página pública do canal (lógica & wiring)

**Per-screen deliverables:**

- [ ] Tela de edição de vídeo (`/dashboard/videos/[id]/edit`) é acessível apenas ao dono e renderiza loading, success e error states
- [ ] Tela de edição de vídeo passa os testes de componente (`components/video/video-edit-form.tsx`)
- [ ] Dashboard de gerenciamento de vídeos do canal (`/dashboard/videos`) é acessível apenas ao dono e renderiza loading, empty, success e error states
- [ ] Dashboard de gerenciamento de vídeos do canal passa os testes de componente (`components/video/video-dashboard-list.tsx`)
- [ ] Edição de informações do canal (`/dashboard/channel`) é acessível apenas ao dono e renderiza loading, success e error states
- [ ] Edição de informações do canal passa os testes de componente (`components/channel/channel-settings-form.tsx`)
- [ ] Página pública do canal (`/channel/[nickname]`) é acessível anonimamente e renderiza loading, empty, success e error states
- [ ] Página pública do canal passa os testes de componente (`components/channel/channel-public-page.tsx`)

**Full test suites:**

- [ ] Backend unit + integration tests pass (`docker compose exec nestjs-api npm test -- --runInBand`)
- [ ] Backend E2E tests pass (`docker compose exec nestjs-api npm run test:e2e`)
- [ ] Backend type-check passes (`docker compose exec nestjs-api npx tsc --noEmit`)
- [ ] Backend lint passes (`docker compose exec nestjs-api npm run lint`)
- [ ] Frontend unit + integration tests pass (`docker compose exec next-frontend npm test`)
- [ ] Frontend E2E tests pass (`npx playwright test`, executado no host com o container rodando `MSW_ENABLED=true`)
- [ ] Frontend type-check passes (`docker compose exec next-frontend npx tsc --noEmit`)
- [ ] Frontend lint passes (`docker compose exec next-frontend npm run lint`)
- [ ] Frontend production build succeeds (`docker compose exec next-frontend npm run build`)
