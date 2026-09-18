---
kind: phase
name: phase-07-home-search-launch
test_specs_aware: true
sources_mtime:
  docs/phases/phase-07-home-search-launch/context.md: "2026-09-16T23:50:04Z"
  docs/decisions/technical-decisions-home-search-launch.md: "2026-09-16T23:40:02Z"
  docs/decisions/technical-decisions-next-frontend-msw-foundation.md: "2026-09-16T22:49:40Z"
  docs/decisions/technical-decisions-next-frontend-openapi-typing.md: "2026-09-08T00:58:17Z"
  docs/decisions/technical-decisions-next-frontend-config-base.md: "2026-09-08T00:58:17Z"
  docs/decisions/technical-decisions-openapi-docs-nestjs.md: "2026-09-16T22:49:40Z"
---

# Phase 07 — Home Page, Search, and Wrap-up

## Objective

Deliver the platform's home page — a global video grid with category filter, search (title + channel), and infinite scroll, backed by a new cross-channel listing endpoint — plus the app's first shared header/navbar/sidebar shell (mobile-collapsible, with an account menu that finally closes the Phase 02 logout deferral), and production readiness (deployment topology, hosting, object storage, and a CI pipeline that runs the platform's main-flow tests).

---

## Step Implementations

### SI-07.0.1 — Infra: install batch shadcn primitives

**Description:** Instalar os primitives shadcn que a Home e o Account Menu precisam via CLI registry; commitar os arquivos gerados em `components/ui/`.

**Technical actions:**

1. Rodar `npx shadcn@latest add avatar badge sheet` (alfabético) — gera `components/ui/avatar.tsx`, `components/ui/badge.tsx`, `components/ui/sheet.tsx`.
2. Commitar os três arquivos gerados.

**Tests:** _(empty — Infra)_

**Dependencies:** none

**Acceptance criteria:**

- `components/ui/avatar.tsx`, `components/ui/badge.tsx` e `components/ui/sheet.tsx` existem.
- Os três arquivos compilam via `docker compose exec next-frontend npx tsc --noEmit`.

---

### SI-07.0.2 — Tests shadcn batch (avatar, badge, sheet)

**Description:** Unit tests para os 3 primitives shadcn instalados em SI-07.0.1 — variants, a11y, data-slot, event handlers.

**Technical actions:**

1. Author `components/ui/__tests__/avatar.test.tsx`, `components/ui/__tests__/badge.test.tsx`, `components/ui/__tests__/sheet.test.tsx`.

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `avatar.tsx` | Unit per testing-guide-next-frontend § "UI Primitives" — image + initials-fallback variants, `data-slot` anchors | `components/ui/__tests__/avatar.test.tsx` |
| `badge.tsx` | Unit per testing-guide-next-frontend § "UI Primitives" — variants, `data-slot` anchors | `components/ui/__tests__/badge.test.tsx` |
| `sheet.tsx` | Unit per testing-guide-next-frontend § "UI Primitives" — open/close via trigger + `onOpenChange`, `aria-*` (Radix Dialog), Escape-to-close | `components/ui/__tests__/sheet.test.tsx` |

**Dependencies:** SI-07.0.1

**Acceptance criteria:**

- Each of the three primitives has a Unit test file covering every CVA variant, `data-slot` anchors, and open/close event handling (Sheet).
- Tests pass via `docker compose exec next-frontend npm test -- components/ui/__tests__/avatar.test.tsx components/ui/__tests__/badge.test.tsx components/ui/__tests__/sheet.test.tsx`.

---

### SI-07.0.3 — Custom-ui: spinner.tsx

**Description:** Author `components/ui/spinner.tsx` — primitive de loading indicator sob `components/ui/` não disponível no registry shadcn, usado pelo `InfiniteScrollLoader` no rodapé da grade.

**Technical actions:**

1. Author `components/ui/spinner.tsx` per UI Contract — visual matching `infinite-scroll-loading-spinner.svg` (já baixado em `docs/phases/phase-07-home-search-launch/figma-assets/icons/`).

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `spinner.tsx` | Unit per testing-guide-next-frontend § "UI Primitives" — renders with `role="status"` and accessible label | `components/ui/__tests__/spinner.test.tsx` |

**Dependencies:** none

**Acceptance criteria:**

- `components/ui/spinner.tsx` existe e casa com o glyph de `infinite-scroll-loading-spinner.svg`.
- Unit test cobre a renderização com `role="status"`.

---

### SI-07.0.4 — Custom-business simple group A: video-grid-card, category-chip, header, sidebar, sidebar-nav-item

**Description:** Author 5 componentes de negócio sem state/lógica própria — presentacionais ou de composição simples.

**Technical actions:**

1. Author `components/video/video-grid-card.tsx` — card vertical 266×245.625px (thumbnail, avatar 36px, título, canal, views·idade), props-driven.
2. Author `components/layout/category-chip.tsx` — pill `rounded-[8px]`, props `label` + `active` + `onClick`.
3. Author `components/layout/header.tsx` — shell de composição (logo, search, create/avatar), sem lógica própria.
4. Author `components/layout/sidebar.tsx` — container `<aside>` de composição dos nav items + lista de inscritos.
5. Author `components/layout/sidebar-nav-item.tsx` — link de navegação (ícone + label + estado ativo via rota atual); renderiza Home, Subscriptions e Your videos — **"Liked videos" não é renderizado nesta fase** (capability marcada `non-ui`/deferred em `## Non-UI / Deferred Capabilities`, sem página comissionada).

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `video-grid-card.tsx` | Unit per testing-guide-next-frontend § "Client Components" — renderiza campos, formata duração/views/idade | `components/video/__tests__/video-grid-card.test.tsx` |
| `category-chip.tsx` | Unit per testing-guide-next-frontend § "Client Components" — estado active, `onClick` | `components/layout/__tests__/category-chip.test.tsx` |
| `header.tsx` | Unit per testing-guide-next-frontend § "Client Components" — composição renderiza os filhos | `components/layout/__tests__/header.test.tsx` |
| `sidebar.tsx` | Unit per testing-guide-next-frontend § "Client Components" — composição renderiza os filhos | `components/layout/__tests__/sidebar.test.tsx` |
| `sidebar-nav-item.tsx` | Unit per testing-guide-next-frontend § "Client Components" — estado ativo por rota; "Liked videos" nunca é renderizado | `components/layout/__tests__/sidebar-nav-item.test.tsx` |

**Dependencies:** none

**Acceptance criteria:**

- Os 5 componentes existem nos paths declarados e batem com o UI Contract.
- Unit tests exercitam renderização + props de cada um.
- `sidebar-nav-item.tsx` nunca renderiza um item "Liked videos".

---

### SI-07.0.5 — Custom-business simple group B: create-button, account-menu-close-icon, account-menu-item

**Description:** Author os 3 componentes de negócio restantes sem state — links de navegação e ícone.

**Technical actions:**

1. Author `components/layout/create-button.tsx` — link de navegação pro fluxo de upload existente (ícone câmera), sem capability nova nesta fase.
2. Author `components/icons/account-menu-close-icon.tsx` — wrapper do svg já baixado (`account-menu-close-icon.svg`), seguindo o padrão dos demais ícones em `components/icons/`.
3. Author `components/layout/account-menu-item.tsx` — linha parametrizada do menu de conta (ícone + label + `href` ou `onClick`), reusada para "Edit Channel" (link) e "Sign Out" (ação).

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `create-button.tsx` | Unit per testing-guide-next-frontend § "Client Components" — renderiza link com `href` correto | `components/layout/__tests__/create-button.test.tsx` |
| `account-menu-item.tsx` | Unit per testing-guide-next-frontend § "Client Components" — variante link vs. variante `onClick` | `components/layout/__tests__/account-menu-item.test.tsx` |

**Tests:** Ícones (`components/icons/*`) não recebem teste dedicado (per testing-guide-next-frontend § "Icons" — SVG estático é mirror test).

**Dependencies:** none

**Acceptance criteria:**

- Os 3 componentes existem nos paths declarados.
- `account-menu-item.tsx` renderiza corretamente tanto como link quanto como botão de ação.

---

### SI-07.0.6 — Custom-business complex: video-grid.tsx

**Description:** Author `components/video/video-grid.tsx` — componente server-connected que possui fetch inicial (RSC) + continuação client-side via `IntersectionObserver` (state de itens carregados, per `home-search-launch/TD-03`).

**Technical actions:**

1. Author `components/video/video-grid.tsx` — Client Component boundary que recebe a primeira página como prop (RSC pai) e usa `IntersectionObserver` para buscar `GET /api/videos/public?page={next}` e concatenar ao state local quando o `InfiniteScrollLoader` sentinel entra em viewport.

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `video-grid.tsx` | Unit per testing-guide-next-frontend § "Client Components" baseline — renderiza itens iniciais | `components/video/__tests__/video-grid.test.tsx` |
| `video-grid.tsx` | Unit: mock de `IntersectionObserver` dispara fetch da próxima página e concatena itens; estado de erro em falha de fetch | (same file) |

**Dependencies:** none

**Acceptance criteria:**

- `video-grid.tsx` existe e renderiza a página inicial recebida via props.
- Ao simular o sentinel entrando em viewport, uma nova página é buscada e os itens são anexados ao final da lista (sem duplicar nem substituir os existentes).

---

### SI-07.0.7 — Custom-business complex: category-filter-bar.tsx

**Description:** Author `components/layout/category-filter-bar.tsx` — barra server-connected que mantém a categoria ativa e refiltra a grade.

**Technical actions:**

1. Author `components/layout/category-filter-bar.tsx` — Client Component que lê `?category=` via `useSearchParams`, renderiza os `CategoryChip`s (incluindo "All") e navega via `router.push` ao clicar em um chip.

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `category-filter-bar.tsx` | Unit per testing-guide-next-frontend § "Client Components" — renderiza chips, marca o ativo conforme `?category=`; clique navega com `?category=` atualizado (mock `next/navigation`) | `components/layout/__tests__/category-filter-bar.test.tsx` |

**Dependencies:** none

**Acceptance criteria:**

- `category-filter-bar.tsx` existe e marca corretamente o chip ativo a partir da URL.
- Clique em um chip atualiza `?category=` via navegação client-side.

---

### SI-07.0.8 — Custom-business complex: sidebar-toggle-button.tsx

**Description:** Author `components/layout/sidebar-toggle-button.tsx` — hamburger que colapsa/expande a sidebar em mobile (state local, per `home-search-launch/TD-04`).

**Technical actions:**

1. Author `components/layout/sidebar-toggle-button.tsx` — Client Component com `useState` local (`open` boolean) compartilhado com o `AppShell` via prop/callback (per `home-search-launch/TD-04` — sem dependência de state management global).

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `sidebar-toggle-button.tsx` | Unit per testing-guide-next-frontend § "Client Components" — clique alterna o estado `open` e chama o callback | `components/layout/__tests__/sidebar-toggle-button.test.tsx` |

**Dependencies:** none

**Acceptance criteria:**

- `sidebar-toggle-button.tsx` existe e alterna o estado ao ser clicado.

---

### SI-07.0.9 — Custom-business complex: search-bar.tsx

**Description:** Author `components/layout/search-bar.tsx` — input de busca server-connected, debounced, que sincroniza `?q=` na URL (per `home-search-launch/TD-01`, `TD-04`).

**Technical actions:**

1. Author `components/layout/search-bar.tsx` — Client Component com input controlado + debounce, que faz `router.push` para `?q={value}` ao parar de digitar / submeter.

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `search-bar.tsx` | Unit per testing-guide-next-frontend § "Client Components" — digitação debounced navega para `?q=`; submit imediato também navega (mock `next/navigation`) | `components/layout/__tests__/search-bar.test.tsx` |

**Dependencies:** none

**Acceptance criteria:**

- `search-bar.tsx` existe; digitar e aguardar o debounce (ou submeter) atualiza `?q=` via navegação client-side.

---

### SI-07.0.10 — Custom-business complex: avatar-button.tsx

**Description:** Author `components/layout/avatar-button.tsx` — botão do header cujo conteúdo depende da sessão (avatar autenticado vs. botão de login), e abre o `AccountUserMenuSheet` (per `home-search-launch/TD-04`, fecha o deferral de "Logout" da fase 02).

**Technical actions:**

1. Author `components/layout/avatar-button.tsx` — lê a sessão existente (via `SessionProvider`/cookie, per `phase-02-auth-frontend/TD-02`, sem endpoint novo); renderiza `components/ui/avatar.tsx` (iniciais) quando autenticado ou um link `/login` quando anônimo; ao clicar quando autenticado, abre o `AccountUserMenuSheet` (`components/ui/sheet.tsx`) contendo `AccountMenuIdentityBlock` + `account-menu-item` ("Edit Channel", "Sign Out").

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `avatar-button.tsx` | Unit per testing-guide-next-frontend § "Client Components" — renderiza avatar quando autenticado / link de login quando anônimo; clique abre o Sheet | `components/layout/__tests__/avatar-button.test.tsx` |

**Dependencies:** SI-07.0.1 (shadcn `avatar` + `sheet`)

**Acceptance criteria:**

- Sessão anônima → renderiza affordance de login, sem abrir o Sheet.
- Sessão autenticada → renderiza avatar; clique abre `AccountUserMenuSheet`.

---

### SI-07.0.11 — Custom-business complex: account-menu-identity.tsx

**Description:** Author `components/layout/account-menu-identity.tsx` — bloco server-connected que busca e exibe a identidade do canal do usuário autenticado (avatar 64px, nome, @handle) dentro do Account Menu.

**Technical actions:**

1. Author `components/layout/account-menu-identity.tsx` — chama `GET /channels/me` (existente, `phase-04-video-channel-management`) ao abrir o menu; renderiza `components/ui/avatar.tsx` (iniciais, 64px) + nome + `@nickname`.

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `account-menu-identity.tsx` | Unit per testing-guide-next-frontend § "Client Components" — renderiza avatar/nome/@handle a partir dos dados recebidos; estado de loading | `components/layout/__tests__/account-menu-identity.test.tsx` |

**Dependencies:** SI-07.0.1 (shadcn `avatar`)

**Acceptance criteria:**

- `account-menu-identity.tsx` existe e renderiza avatar (iniciais), nome do canal e `@nickname` a partir da resposta de `GET /channels/me`.

### SI-07.1 — Infra: pg_trgm extension + trigram indexes

**Description:** Migration que habilita `pg_trgm` e cria os índices GIN trigram em `videos.title`, `channels.name` e `channels.nickname`, base para a busca `ILIKE` do feed global (per `home-search-launch/TD-01`).

**Technical actions:**

1. Criar `src/database/migrations/{timestamp}-AddSearchTrigramIndexes.ts` — `CREATE EXTENSION IF NOT EXISTS pg_trgm;` + `CREATE INDEX ... USING gin (title gin_trgm_ops)` em `videos`, + índices equivalentes em `channels.name` e `channels.nickname` (per `home-search-launch/TD-01`).

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| Migration | Integration: migration roda sem erro, extensão e índices existem no schema pós-`up`, `down` reverte limpo | `src/database/migrations.integration-spec.ts` (append case) |

**Dependencies:** none

**Acceptance criteria:**

- Rodar a migration cria a extensão `pg_trgm` e os 3 índices GIN trigram sem erro.
- Reverter a migration (`down`) remove os 3 índices sem remover a extensão (outras migrations podem depender dela).

---

### SI-07.2 — Endpoint GET /videos/public

**Route:** GET /videos/public
**Authorization:** Anonymous
**Technical actions:**

1. Criar `FindPublicVideosQueryDto` em `src/videos/dto/find-public-videos-query.dto.ts` — `category` (enum, opcional), `q` (string, opcional, max 200), `page` (int, opcional, min 1, default 1), `limit` (int, opcional, min 1, max 48, default 24), validados via `class-validator` (per inherited convention, `phase-02-auth/TD-06`).
2. Adicionar `findPublicVideos` em `VideosService` — `createQueryBuilder` com `WHERE published_at IS NOT NULL AND visibility = 'public' AND status = 'ready'`, `AND category = :category` quando presente, `AND (title ILIKE :q OR channel.name ILIKE :q OR channel.nickname ILIKE :q)` quando `q` presente (per `home-search-launch/TD-01`), `ORDER BY published_at DESC`, `skip`/`take` per `page`/`limit` (per `home-search-launch/TD-02`), retornando `{ items, total, page, limit }`.
3. Adicionar `GET /videos/public` em `VideosController` com `@Public()` (mesmo padrão de `GET /videos/public/:publicId/suggested`, per `phase-05-video-watch-page/TD-01`), documentado com `@ApiQuery` para os 4 query params (per `openapi-docs-nestjs/TD-01`'s enrichment convention).

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `VideosService.findPublicVideos` | Unit: branch logic (categoria presente/ausente, `q` presente/ausente, paginação) mockando o repositório | `src/videos/videos.service.spec.ts` (append case) |
| `VideosService.findPublicVideos` | Integration: query real contra o DB — filtra por visibilidade/status, categoria, busca por título/canal, ordenação e paginação | `src/videos/videos.service.integration-spec.ts` (append case) |
| `GET /videos/public` | E2E: contrato HTTP completo (status, shape, filtros, paginação) | `test/video-public-listing.e2e-spec.ts` |

**Dependencies:** SI-07.1 (índices trigram precisam existir para a query de busca)

**Acceptance criteria:**

- `GET /videos/public` sem query params retorna `200` com até `limit` (default 24) vídeos públicos prontos, mais recentes primeiro.
- `GET /videos/public?category=music` retorna `200` só com vídeos da categoria `music`.
- `GET /videos/public?q={termo}` retorna `200` só com vídeos cujo título ou nome/nickname do canal contém o termo (case-insensitive).
- `GET /videos/public?page=2&limit=10` retorna `200` com o segundo bloco de 10 itens, offset corretamente.
- `GET /videos/public?category=invalido` retorna `400` com `errorCode: "VALIDATION_ERROR"`.
- Vídeos em draft, unlisted ou não publicados nunca aparecem na resposta.

---

### SI-07.3 — BFF: GET /api/videos/public

**Route:** GET /api/videos/public
**Authorization:** Anonymous

**Technical actions:**

1. Criar `app/api/videos/public/route.ts` — `GET` handler que repassa `category`/`q`/`page`/`limit` para `GET {env.API_URL}/videos/public` (per `next-frontend/CLAUDE.md`'s strict-BFF model) e retorna a resposta sem reshape (§API Contracts → BFF tier).
2. Adicionar o handler `GET /videos/public` em `mocks/handlers/videos.ts` (barrel per `next-frontend-msw-foundation/TD-01`) para os testes de integração deste route handler.

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `app/api/videos/public/route.ts` | Integration (Vitest + MSW): repassa query params corretamente, retorna `200` com o corpo pass-through, propaga `400` de validação | `app/api/videos/public/__tests__/route.integration.test.ts` |

**Dependencies:** SI-07.2 (endpoint upstream precisa existir)

**Acceptance criteria:**

- `GET /api/videos/public?category=&q=&page=&limit=` repassa os 4 query params para o upstream e retorna `200` com o corpo pass-through.
- Erro `400` do upstream é repassado como `400` para o cliente, sem reshape.

### SI-07.4.0 — Drift audit: Home (Catalog Show)

**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-379
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Home (Catalog Show)`

**Technical actions:**

1. **Drift audit** — invoke `figma:figma-implement-design` (narrow handoff) com:
   - Figma URL: https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-379
   - Reused DS components: [`brand-logo.tsx`, `search-icon.tsx`, `camera-icon.tsx`, `chevron-down-icon.tsx`, `subscribed-channel-row.tsx`, `pagination-controls.tsx`, `avatar.tsx`, `badge.tsx`, `sheet.tsx`, `spinner.tsx`, `video-grid.tsx`, `video-grid-card.tsx`, `category-filter-bar.tsx`, `category-chip.tsx`, `header.tsx`, `sidebar-toggle-button.tsx`, `search-bar.tsx`, `create-button.tsx`, `avatar-button.tsx`, `sidebar.tsx`, `sidebar-nav-item.tsx`, `account-menu-close-icon.tsx`, `account-menu-identity.tsx`, `account-menu-item.tsx`]
   - Server-connected component names: [`VideoGrid`, `VideoGridCard`, `CategoryFilterBar`, `CategoryChip`, `SearchBar`, `AvatarButton`, `AccountMenuIdentityBlock`]
   - Target paths (read-only context for audit; no writes here): `app/(main)/page.tsx` + `components/{video,layout}/*.tsx`

   Para cada componente da lista Reused DS já criado pelas SIs de bootstrap (SI-07.0.1–SI-07.0.11), fazer o diff de valor contra o arquivo em disco e classificar per o enum de 4 valores. Escrever a seção `## Screen: home-catalog-show — audited at SI-07.4.0 ({YYYY-MM-DD})` em `frontend-drift-report.md`. **Nenhuma edição de código nesta SI.**

**Dependencies:** SI-07.0.1, SI-07.0.2, SI-07.0.3, SI-07.0.4, SI-07.0.5, SI-07.0.6, SI-07.0.7, SI-07.0.8, SI-07.0.9, SI-07.0.10, SI-07.0.11 (todo componente auditado precisa existir em disco)

**Tests:** _(empty — audit-only; the report is the deliverable)_

**Acceptance criteria:**

- `frontend-drift-report.md` existe na pasta do plano; a seção `## Screen: home-catalog-show` existe com a data da execução.
- Cada componente da lista Reused DS tem exatamente uma linha na tabela, com Decision preenchido.
- `git diff --name-only HEAD -- next-frontend` ao final da SI está vazio.

---

### SI-07.4a — Tela de Home (visual shell)

**Route:** /
**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-379
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Home (Catalog Show)`
**Drift Report:** see `frontend-drift-report.md` → `## Screen: home-catalog-show`

**Technical actions:**

1. **Apply drift decisions** — ler a seção do Drift Report para esta tela e aplicar cada linha per o verbo (`auto-Edit`, `create`, `exception`/`skip`) mecanicamente, sem novo julgamento.
2. **Visual shell generation** — invoke `figma:figma-implement-design` (narrow handoff) com a mesma lista de componentes da SI-07.4.0 (refletindo os ajustes da ação 1), gerando `app/(main)/layout.tsx` (route group per `home-search-launch/TD-04`), `app/(main)/page.tsx`, e os arquivos `components/layout/*.tsx` / `components/video/video-grid*.tsx` ainda pendentes de shell visual.

**Dependencies:** SI-07.4.0

**Tests:** _(empty — shell smoke-gated by build AC; Unit tests live in SI-07.4b; E2E in /plan-test-specs spec)_

**Acceptance criteria:**

- `app/(main)/layout.tsx` e `app/(main)/page.tsx` existem, exportam os componentes esperados e compilam via `docker compose exec next-frontend npx tsc --noEmit`.
- A rota `/` renderiza a grade, a barra de categorias, a busca e o header/sidebar com fidelidade visual ao node Figma, dentro da tolerância do conjunto de DS components.
- As 4 telas de auth (`app/(auth)/**`) continuam sem o shell (layout inalterado — regressão zero per `home-search-launch/TD-04`).

---

### SI-07.4b — Tela de Home (lógica & wiring)

**Test Specs:** see `next-frontend/specs/home.plan.md`
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Home (Catalog Show)`

**Technical actions:**

1. **Route guard application** — per UI Contract `**Auth requirement:**` (Mixed): a rota `/` em si não tem guard (Anonymous); apenas o conteúdo do Account Menu (`AccountMenuIdentityBlock`, "Sign Out") é condicionado à sessão existente — sem redirect de página inteira.
2. **Rendering strategy application** — per UI Contract `**Rendering strategy:**`: `app/(main)/page.tsx` como Server Component lendo `searchParams` (`category`, `q`, `page`) para a primeira página; `VideoGrid` recebe essa primeira página como prop e assume a continuação client-side via `IntersectionObserver` (per `home-search-launch/TD-03`).
3. **Endpoint wiring** — conectar `VideoGrid`/`VideoGridCard`/`CategoryFilterBar`/`SearchBar` a `GET /api/videos/public` (§API Contracts → BFF tier), tipando request/response via a cadeia OpenAPI já estabelecida (`next-frontend-openapi-typing/TD-01`); conectar `AccountMenuIdentityBlock` a `GET /channels/me` (existente) e o item "Sign Out" a `POST /api/auth/logout` (existente).
4. **Error mapping** — per UI Contract `**Error Catalog → UX mapping:**`: falha de fetch do BFF exibe toast (`components/ui/sonner.tsx`), sem tratamento de erro específico adicional (nenhum `errorCode` de domínio novo nesta fase).
5. **Client-side validation mirror** — `q` limitado a 200 caracteres no input; `category` restrito aos chips renderizados (sem input livre).

**Dependencies:** SI-07.4a, SI-07.3 (endpoint BFF), SI-07.2 (endpoint backend), SI-07.0.6 a SI-07.0.11 (componentes server-connected)

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `app/(main)/page.tsx` | E2E only per testing-guide-next-frontend § "Pages" (async RSC — Vitest não renderiza) | _(coberto pelo spec de `/plan-test-specs`)_ |

E2E para a tela (grade, filtro, busca, scroll infinito, account menu, fluxos completos) é autorado externamente por `/plan-test-specs` no spec referenciado por `**Test Specs:**` acima.

**Acceptance criteria:**

- Carregar `/` sem query params retorna a primeira página de vídeos públicos, mais recentes primeiro.
- Selecionar uma categoria atualiza a URL e a grade, sem recarregar a página inteira.
- Submeter uma busca atualiza a URL e a grade com os resultados filtrados.
- Rolar até o fim da grade carrega a próxima página e a anexa, sem duplicar itens.
- Com sessão autenticada, abrir o Account Menu exibe a identidade do canal e permite Sign Out, que efetivamente encerra a sessão.

### SI-07.5 — Infra: topologia de deploy de produção

**Description:** Configura o alvo de produção per `home-search-launch/TD-05` — plataforma de containers gerenciada rodando os Dockerfiles já existentes (frontend, api, worker) + Postgres gerenciado + Cloudflare R2 como storage S3-compatível.

**Technical actions:**

1. Documentar e configurar os serviços de produção (`next-frontend`, `nestjs-api`, `video-worker`) na plataforma escolhida (per `home-search-launch/TD-05`), reusando os `Dockerfile`s já existentes de cada subprojeto sem alterá-los.
2. Provisionar/configurar o Postgres gerenciado da plataforma e o bucket Cloudflare R2 (S3-compatible, per `phase-03-videos/TD-01`'s `endpoint`/`forcePathStyle` design — nenhuma mudança de código no storage client).
3. Documentar o conjunto de variáveis de ambiente de produção (`API_URL`, credenciais de storage, `DATABASE_URL`, etc.) em `docs/` — sem commitar segredos.

**Tests:** _(empty — Infra/config; verificado por deploy manual, não por suíte automatizada)_

**Dependencies:** none

**Acceptance criteria:**

- Os 3 serviços (`next-frontend`, `nestjs-api`, `video-worker`) têm configuração de deploy documentada e aplicável na plataforma escolhida, a partir dos Dockerfiles existentes sem modificação.
- O Postgres gerenciado e o bucket R2 estão provisionados (ou documentados como provisionáveis) e alcançáveis pelas variáveis de ambiente documentadas.
- Nenhum segredo de produção é commitado no repositório.

---

### SI-07.6 — CI: gates rápidos (lint, tsc, unit, integration)

**Description:** Pipeline de CI via GitHub Actions rodando lint/`tsc --noEmit`/testes unitários e de integração por subprojeto em todo PR (per `home-search-launch/TD-06`, opção B — parte 1 dos gates rápidos).

**Technical actions:**

1. Criar `.github/workflows/ci.yml` com um job por subprojeto (`nestjs-project`, `next-frontend`), cada um rodando lint + `tsc --noEmit` + testes unitários/integração contra um serviço Postgres do próprio job (per convenção de testes já estabelecida).
2. Configurar o job para rodar em todo PR aberto contra `dev` e `main` (per convenção Git Flow do `CLAUDE.md` raiz).

**Tests:** _(empty — Infra/CI config; verificado pela própria execução do workflow)_

**Dependencies:** none

**Acceptance criteria:**

- Um PR contra `dev` dispara os 2 jobs (backend, frontend), cada um rodando lint + `tsc --noEmit` + testes.
- Um PR com lint ou `tsc` falhando é bloqueado de merge pelo check de CI.
- Um PR com todos os gates passando permite merge.

---

### SI-07.7 — CI: job full-stack de fluxos principais + specs Playwright

**Description:** Job de CI que sobe o stack completo via `docker compose` e roda os specs Playwright de fluxo principal (jornadas centrais per resolução de `AMB-2`: cadastro→confirmação→login; upload→publicação→assistir; comentário/like/inscrição; busca→assistir), per `home-search-launch/TD-06`, opção B — parte 2.

**Technical actions:**

1. Adicionar ao `.github/workflows/ci.yml` (ou workflow dedicado) um job que sobe Postgres + object storage + `nestjs-api` + `video-worker` + `next-frontend` via `docker compose`, então roda a suíte Playwright existente (`next-frontend/tests/*.e2e-spec.ts`) mais os novos specs de jornada cross-fase.
2. Author os specs Playwright das 4 jornadas centrais ainda não cobertas por specs existentes por fase, reaproveitando os specs já autorados (`video-watch-page.e2e-spec.ts`, `subscriptions.e2e-spec.ts`, etc.) como base.
3. Configurar o job para rodar em PRs contra `dev`/`main` (não em todo push, per a recomendação de `home-search-launch/TD-06` sobre cadência).

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| Jornada: cadastro→confirmação→login | E2E (Playwright) | `next-frontend/tests/signup-to-login.e2e-spec.ts` |
| Jornada: upload→publicação→assistir | E2E (Playwright) | `next-frontend/tests/upload-to-watch.e2e-spec.ts` |
| Jornada: comentário/like/inscrição | E2E (Playwright) | `next-frontend/tests/social-interactions.e2e-spec.ts` |
| Jornada: busca→assistir | E2E (Playwright) | `next-frontend/tests/search-to-watch.e2e-spec.ts` |

**Dependencies:** SI-07.6, SI-07.4b (a Home precisa existir para a jornada de busca)

**Acceptance criteria:**

- O job full-stack sobe o `docker compose` completo e roda a suíte Playwright (existente + as 4 jornadas novas) com sucesso contra um PR limpo.
- Cada uma das 4 jornadas centrais tem um spec Playwright próprio, passando de ponta a ponta contra o stack real.
- O job roda em PRs contra `dev`/`main`, não em todo push.

---

## Technical Specifications

### Data Model

#### Video (modified)

No new fields.

**Indexes:** GIN trigram index on `title` via the `pg_trgm` extension, added by SI-07.1 — enables `ILIKE '%term%'` substring search to stay performant as the catalog grows (per `home-search-launch/TD-01`).

#### Channel (modified)

No new fields.

**Indexes:** GIN trigram indexes on `name` and `nickname` via `pg_trgm`, added by SI-07.1 — backs the "search by ... channel" half of the home feed's search (per `home-search-launch/TD-01`).

**Migration:** SI-07.1 adds `CREATE EXTENSION IF NOT EXISTS pg_trgm;` plus the three GIN indexes above, following the project's established TypeORM migration convention (`src/database/migrations/`).

### API Contracts

#### GET /videos/public (SI-07.2)

**Request query parameters:**
- category: string, optional — one of the existing `VideoCategory` enum values (per `phase-04-video-channel-management/TD-01`)
- q: string, optional — max 200 characters; matched against `title` OR the owning channel's `name`/`nickname` via `ILIKE '%q%'` (per `home-search-launch/TD-01`)
- page: integer, optional — default 1, min 1 (per `home-search-launch/TD-02`)
- limit: integer, optional — default 24, min 1, max 48 (per `home-search-launch/TD-02`)

**Response 200:**
- items: array of:
  - public_id: string
  - title: string | null
  - thumbnail_key: string | null
  - duration_seconds: number | null
  - views: number
  - published_at: string (ISO) | null
  - category: string
  - channel: { nickname: string, name: string } — same shape as `GET /videos/public/:publicId/suggested`'s `channel` field (per `phase-05-video-watch-page/TD-03`), reused verbatim for consistency
- total: number
- page: number
- limit: number

Only videos where `published_at IS NOT NULL AND visibility = 'public' AND status = 'ready'` are returned (per inherited convention from `phase-05-video-watch-page`). Ordered by `published_at DESC`.

**Error responses:**
- 400 validation error: when `category` is not a valid `VideoCategory` value, `page`/`limit` are out of range, or `q` exceeds 200 characters

---

#### Validation Rules — Home feed listing

- `category`: optional, must be a valid `VideoCategory` enum value
- `q`: optional, string, max 200 characters
- `page`: optional, integer, min 1, default 1
- `limit`: optional, integer, min 1, max 48, default 24

---

> _BFF tier — frontend-exposed contract. The browser calls the FE-facing route; the route proxies the upstream per `next-frontend/CLAUDE.md`'s strict-BFF architecture (same-origin Route Handlers under `app/api/**`, reading `env.API_URL` server-side)._

#### GET /api/videos/public (SI-07.3)

**forwards-to:** `GET /videos/public` *(derived: project contract source — first appearance, this phase; defined in SI-07.2 above)*

**Request headers:** none beyond the default *(derived: project contract source)*

**Request query parameters:** `category`, `q`, `page`, `limit` — pass-through, same names and constraints as the upstream endpoint *(derived: project contract source)*

**Response 200 (FE-facing):** pass-through of `{ items, total, page, limit }` — no reshape; every field is already public-safe *(derived: project contract source; reshape: none)*

**Error responses (FE-facing):**
- 400 validation error: pass-through *(derived: project contract source)*

---

### Authorization Matrix

| Endpoint | Anonymous | Authenticated |
|----------|-----------|----------------|
| GET /videos/public (+ BFF GET /api/videos/public) | ✓ | ✓ |
| GET /channels/me _(existing, `phase-04-video-channel-management`)_ | ✗ | ✓ |
| POST /auth/logout (+ BFF) _(existing, `phase-02-auth`)_ | ✗ | ✓ |

### UI Contracts

#### Screen: Home (Catalog Show)

**Route:** `/`
**Figma:** https://www.figma.com/design/40c57EfcNjN6u5St7n5SlG/FC-Tube-sem-padrão?node-id=39-379 (node `39:379`)
**Purpose:** "Home page with a video grid (thumbnail, title, channel, views, and publish time)"

**Auth requirement:** Mixed — specify manually per screen Observations hint. The page itself and its primary content (video grid, search, category filter) are Anonymous, per the project's stated "anyone can watch videos without registering" principle; the Account User Menu's `GET /channels/me`-backed identity block and Sign Out action are Authenticated-only, gated inside a UI affordance (`AvatarButton` → Account Menu) that only renders its authenticated form for logged-in sessions.

**Rendering strategy:** Server Component (RSC) for the initial grid render (`searchParams`-driven first page) with a Client Component boundary for the `IntersectionObserver`-driven infinite-scroll continuation _(source: `home-search-launch/TD-03`)_

**Reused DS components:**
- `components/auth/brand-logo.tsx` — StreamTube logo mark
- `components/icons/search-icon.tsx` — search glyph
- `components/icons/camera-icon.tsx` — create/upload glyph (verify against `header-create-camera-icon.svg` before final reuse)
- `components/icons/chevron-down-icon.tsx` — sidebar "Show 12 more" glyph
- `components/subscriptions/subscribed-channel-row.tsx` — sidebar subscribed-channel rows, reused unchanged from Phase 06
- `components/subscriptions/pagination-controls.tsx` — sidebar "Show 12 more" expand control, reused unchanged from Phase 06
- `components/ui/badge.tsx (new)` — shadcn primitive backing `DurationBadge`
- `components/ui/avatar.tsx (new)` — shadcn primitive backing `ChannelAvatar` and the account-menu identity avatar (image + initials-fallback variants)
- `components/ui/sheet.tsx (new)` — shadcn primitive backing the `AccountUserMenuSheet` slide-over
- `components/ui/spinner.tsx (new)` — bottom-of-grid `InfiniteScrollLoader`
- `components/video/video-grid.tsx (new)` — grid container owning fetch + infinite-scroll pagination
- `components/video/video-grid-card.tsx (new)` — 266×245.625px vertical grid card
- `components/layout/category-filter-bar.tsx (new)` — sticky category chip bar
- `components/layout/category-chip.tsx (new)` — individual category pill
- `components/layout/header.tsx (new)` — layout shell composing logo, search, create/avatar buttons
- `components/layout/sidebar-toggle-button.tsx (new)` — mobile hamburger sidebar toggle
- `components/layout/search-bar.tsx (new)` — debounced header search input
- `components/layout/create-button.tsx (new)` — header "create video" nav link
- `components/layout/avatar-button.tsx (new)` — session-aware avatar/login header button
- `components/layout/sidebar.tsx (new)` — sidebar container
- `components/layout/sidebar-nav-item.tsx (new)` — sidebar nav link (Home/Subscriptions/Your videos)
- `components/icons/account-menu-close-icon.tsx (new)` — account menu close "X" icon
- `components/layout/account-menu-identity.tsx (new)` — account menu identity block (avatar, name, @handle)
- `components/layout/account-menu-item.tsx (new)` — parameterized account-menu row (used for both "Edit Channel" and "Sign Out")

**Server-connected components:**
- `VideoGrid` — verbs: exibir grade de vídeos, carregar mais por scroll infinito | endpoint: `GET /api/videos/public` (§API Contracts → BFF tier) | reuse: `components/video/video-grid.tsx (new)`
- `VideoGridCard` — verbs: exibir thumbnail/título/canal/visualizações/tempo de publicação | endpoint: `GET /api/videos/public` (§API Contracts → BFF tier) | reuse: `components/video/video-grid-card.tsx (new)`
- `CategoryFilterBar` / `CategoryChip` — verbs: filtrar por categoria | endpoint: `GET /api/videos/public` (§API Contracts → BFF tier) | reuse: `components/layout/category-filter-bar.tsx (new)`, `components/layout/category-chip.tsx (new)`
- `SearchBar` — verbs: buscar por título/canal | endpoint: `GET /api/videos/public` (§API Contracts → BFF tier) | reuse: `components/layout/search-bar.tsx (new)`
- `AvatarButton` — verbs: exibir login/avatar conforme sessão | endpoint: existing session cookie read, no new endpoint (per `phase-02-auth-frontend/TD-02`) | reuse: `components/layout/avatar-button.tsx (new)`
- `AccountMenuIdentityBlock` — verbs: exibir identidade do usuário autenticado | endpoint: `GET /channels/me` _(existing, `phase-04-video-channel-management`, no BFF change this phase)_ | reuse: `components/layout/account-menu-identity.tsx (new)`
- `"Sign Out" menu item` — endpoint: `POST /api/auth/logout` _(existing, `phase-02-auth-frontend`)_ | reuse: `components/layout/account-menu-item.tsx (new)`

**Behaviors:**

*Rendered states:*
- Loading: initial page — the RSC render blocks on the first `GET /api/videos/public` page (per inherited convention, an `app/loading.tsx` skeleton covers this). Subsequent pages: `InfiniteScrollLoader` spinner at the bottom of the grid.
- Empty: no matching videos for the current category/search combination — grid renders an empty-state message (no dedicated Figma frame for this state; follow the existing empty-state pattern from `components/subscriptions/empty-subscriptions-state.tsx`).
- Success: grid populated with `VideoGridCard` items; `CategoryFilterBar` reflects the active category.
- Error: BFF fetch failure — existing toast pattern (`components/ui/sonner.tsx`).

*Interactions:*
- `CategoryChip` click → updates the active category, refetches the grid from page 1 (resets scroll position).
- `SearchBar` submit → pushes `?q=` onto the route, refetches the grid from page 1.
- Grid scroll reaching the `InfiniteScrollLoader` sentinel → `VideoGrid` fetches the next page via `IntersectionObserver` and appends results (per `home-search-launch/TD-03`).
- `SidebarToggleButton` click → collapses/expands the sidebar on mobile (per `home-search-launch/TD-04`).
- `AvatarButton` click → opens the `AccountUserMenuSheet` slide-over.
- Account menu close "X" click, or backdrop click → closes the `AccountUserMenuSheet`.

**Error Catalog → UX mapping:**

_No new domain-specific error codes this phase — `GET /videos/public` returns only the standard `400 validation error` envelope (per inherited convention, `phase-02-auth/TD-07`), mapped per the existing project-wide toast pattern._

**Client-side validation mirror:** _(source: §API Contracts → Validation Rules)_

- `q`: optional, max 200 characters
- `category`: optional, must match one of the existing `VideoCategory` values — enforced by rendering only known category chips (no free-text input possible)

**Accessibility notes:**
- No accessibility-specific Observations were flagged in the screen inventory beyond the account menu using a proper dialog/sheet pattern — follow DS defaults (shadcn `Sheet` is Radix Dialog-based, so focus trap and Escape-to-close are inherited for free).

### UI ↔ API Traceability Matrix

| Verb | Component | Screen | Endpoint (from API Contracts) | TD ref |
|------|-----------|--------|-------------------------------|--------|
| Exibir grade de vídeos com thumbnail, título, canal, visualizações e tempo de publicação | VideoGrid / VideoGridCard | / | GET /api/videos/public → forwards-to GET /videos/public | home-search-launch/TD-01 |
| Carregar mais vídeos por scroll infinito ao alcançar o fim da grade | VideoGrid | / | GET /api/videos/public → forwards-to GET /videos/public | home-search-launch/TD-02, home-search-launch/TD-03 |
| Filtrar vídeos da home por categoria | CategoryFilterBar / CategoryChip | / | GET /api/videos/public → forwards-to GET /videos/public | home-search-launch/TD-01 |
| Buscar vídeos por título ou nome do canal | SearchBar | / | GET /api/videos/public → forwards-to GET /videos/public | home-search-launch/TD-01 |
| Exibir botão de login ou avatar conforme sessão do usuário autenticado | AvatarButton | / | — _(session cookie read, no endpoint)_ | home-search-launch/TD-04 |
| Exibir identidade do usuário autenticado (avatar, nome do canal, @handle) no menu de conta | AccountMenuIdentityBlock | / | GET /channels/me _(existing, phase-04-video-channel-management)_ | home-search-launch/TD-04 |

_Capabilities marked in `## Non-UI / Deferred Capabilities` are excluded from this matrix._

---

<!-- phase-a-complete -->

## Dependency Map

```
SI-07.0.1 (root — shadcn avatar/badge/sheet)
├── SI-07.0.2 — depends on SI-07.0.1
├── SI-07.0.10 — depends on SI-07.0.1 → feeds SI-07.4b below
└── SI-07.0.11 — depends on SI-07.0.1 → feeds SI-07.4b below

SI-07.0.3 (root, independent) → feeds SI-07.4b below
SI-07.0.4 (root, independent) → feeds SI-07.4.0/SI-07.4a below
SI-07.0.5 (root, independent) → feeds SI-07.4.0/SI-07.4a below
SI-07.0.6 (root, independent) → feeds SI-07.4b below
SI-07.0.7 (root, independent) → feeds SI-07.4b below
SI-07.0.8 (root, independent) → feeds SI-07.4b below
SI-07.0.9 (root, independent) → feeds SI-07.4b below

SI-07.1 (root — pg_trgm + trigram indexes)
└── SI-07.2 — depends on SI-07.1 (GET /videos/public)
    └── SI-07.3 — depends on SI-07.2 (BFF GET /api/videos/public)
        └── SI-07.4b — depends on SI-07.3 (see below)

SI-07.4.0 — depends on SI-07.0.1 through SI-07.0.11 (every bootstrap component must exist before the audit)
└── SI-07.4a — depends on SI-07.4.0
    └── SI-07.4b — depends on SI-07.4a + SI-07.3 + SI-07.2 + SI-07.0.6 through SI-07.0.11
        └── SI-07.7 — depends on SI-07.4b (see below)

SI-07.5 (root, independent — deployment topology)

SI-07.6 (root, independent — CI fast gates)
└── SI-07.7 — depends on SI-07.6 + SI-07.4b (Home must exist for the search→watch journey)
```

---

## Deliverables

- [ ] SI-07.0.1 — Infra: install batch shadcn primitives
- [ ] SI-07.0.2 — Tests shadcn batch (avatar, badge, sheet)
- [ ] SI-07.0.3 — Custom-ui: spinner.tsx
- [ ] SI-07.0.4 — Custom-business simple group A: video-grid-card, category-chip, header, sidebar, sidebar-nav-item
- [ ] SI-07.0.5 — Custom-business simple group B: create-button, account-menu-close-icon, account-menu-item
- [ ] SI-07.0.6 — Custom-business complex: video-grid.tsx
- [ ] SI-07.0.7 — Custom-business complex: category-filter-bar.tsx
- [ ] SI-07.0.8 — Custom-business complex: sidebar-toggle-button.tsx
- [ ] SI-07.0.9 — Custom-business complex: search-bar.tsx
- [ ] SI-07.0.10 — Custom-business complex: avatar-button.tsx
- [ ] SI-07.0.11 — Custom-business complex: account-menu-identity.tsx
- [ ] SI-07.1 — Infra: pg_trgm extension + trigram indexes
- [ ] SI-07.2 — Endpoint GET /videos/public
- [ ] SI-07.3 — BFF: GET /api/videos/public
- [ ] SI-07.4.0 — Drift audit: Home (Catalog Show)
- [ ] SI-07.4a — Tela de Home (visual shell)
- [ ] SI-07.4b — Tela de Home (lógica & wiring)
- [ ] SI-07.5 — Infra: topologia de deploy de produção
- [ ] SI-07.6 — CI: gates rápidos (lint, tsc, unit, integration)
- [ ] SI-07.7 — CI: job full-stack de fluxos principais + specs Playwright

**Per-screen deliverables:**

- [ ] Screen Home (`/`) is routable
- [ ] Screen Home (`/`) renders loading, success, empty, and error states
- [ ] Screen Home (`/`) passes component tests (per testing-guide-next-frontend layers)

**Full test suites:**

- [ ] Backend tests pass (`cd nestjs-project && docker compose exec nestjs-api npm test -- --runInBand`)
- [ ] Backend E2E tests pass (`cd nestjs-project && docker compose exec nestjs-api npm run test:e2e`)
- [ ] Backend type/compilation checks pass (`cd nestjs-project && docker compose exec nestjs-api npx tsc --noEmit`)
- [ ] Backend lint passes (`cd nestjs-project && docker compose exec nestjs-api npm run lint`)
- [ ] Frontend tests pass (`cd next-frontend && docker compose exec next-frontend npm test`)
- [ ] Frontend E2E tests pass (`cd next-frontend && npx playwright test`, dev server running with `MSW_ENABLED=true`)
- [ ] Frontend type/compilation checks pass (`cd next-frontend && docker compose exec next-frontend npx tsc --noEmit`)
- [ ] Frontend lint passes (`cd next-frontend && docker compose exec next-frontend npm run lint`)
- [ ] CI pipeline (SI-07.6 + SI-07.7) is green on a clean PR
