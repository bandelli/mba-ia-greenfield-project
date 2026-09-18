# StreamTube — Plataforma de Compartilhamento de Vídeos

Projeto da disciplina **Desenvolvimento de Aplicações de IA** do MBA de Engenharia de Software com IA da [Full Cycle](https://fullcycle.com.br).

Este é um projeto greenfield desenvolvido para demonstrar como construir uma aplicação do zero utilizando IA de forma adequada no processo de desenvolvimento.

## Professor

<a href="https://github.com/argentinaluiz">
    <img src="https://avatars.githubusercontent.com/u/4926329?v=4?s=100" width="100px;" alt=""/>
    <br />
    <sub>
        <b>Luiz Carlos</b>
    </sub>
</a>

---

## Quadro Branco

- [Quadro Branco](./whiteboard.png)

---

## 🎨 Design System (Figma)

- [FC Tube.fig](./FC%20Tube.fig) — arquivo-fonte do **design system** do projeto no Figma.
- [FC Tube sem padrão.fig](./FC%20Tube%20sem%20padrao.fig) — arquivo-fonte puro, sem tokens, cores, tipografia e espaçamento.

Contém os fundamentos visuais do StreamTube — tokens (cores, tipografia, espaçamento, raios), componentes e as telas da plataforma. É a referência de design para a implementação do frontend: os componentes em `next-frontend/components/ui` (shadcn) e os tokens em `next-frontend/app/globals.css` derivam deste arquivo. Abra-o no Figma (`Arquivo → Importar`) para consultar especificações e estados visuais.

---

## 📋 Pré-requisitos

- Docker e Docker Compose
- Node.js v25+ (para rodar os testes E2E do Playwright no host)
- npm

## 🏗️ Arquitetura

O projeto é um monorepo baseado em containers Docker. Cada subprojeto sobe sua própria stack via `docker compose`.

- **Frontend** (Next.js 16, App Router + React Server Components) — interface da plataforma. Segue o **modelo BFF**: o navegador nunca chama a API NestJS diretamente; todo tráfego passa por Route Handlers same-origin em `app/api/**`, que fazem proxy server-side para a API.
- **API** (NestJS 11) — regras de negócio, autenticação (JWT + refresh token rotation), envio de e-mails e acesso ao banco.
- **Database** (PostgreSQL 17) — usuários, canais, vídeos e tokens de autenticação.
- **Email Service** (Mailpit) — captura os e-mails transacionais (confirmação de conta e recuperação de senha) em uma UI local.
- **Video Worker** (FFmpeg) — processo dedicado que consome a fila de processamento, extrai metadados/duração (`ffprobe`) e gera o thumbnail (`ffmpeg`) de cada vídeo enviado.
- **Object Storage** (MinIO, compatível com S3) — arquivos de vídeo e thumbnails.
- **Message Queue** (`pg-boss`, sobre o próprio PostgreSQL) — fila do job `video.uploaded` consumido pelo Video Worker.

O diagrama de arquitetura completo (C4) está em `docs/diagrams/software-arch.mermaid`.

## 🚀 Como rodar

Os dois subprojetos têm stacks Docker **separadas**. Suba primeiro o backend, rode as migrations e depois o frontend.

### 1. Backend (NestJS + PostgreSQL + Mailpit)

```bash
cd nestjs-project

# Sobe API, banco e Mailpit
docker compose up -d

# Instala dependências (apenas na primeira vez)
docker compose exec nestjs-api npm install

# Cria o schema do banco (obrigatório — synchronize está desabilitado)
docker compose exec nestjs-api npm run migration:run

# Sobe o servidor de desenvolvimento em watch mode
docker compose exec -d nestjs-api npm run start:dev
```

Serviços disponíveis:

| Serviço | URL / Porta |
|---------|-------------|
| API NestJS | http://localhost:3000 |
| PostgreSQL | `localhost:5433` (db/user/senha: `streamtube`) |
| Mailpit (UI de e-mails) | http://localhost:8025 |
| MinIO (API / Console) | `localhost:9000` / http://localhost:9001 |
| Swagger (opcional) | http://localhost:3000/api/docs — habilite com `SWAGGER_ENABLED=true` |

O **Video Worker** sobe como serviço separado (`video-worker`) na mesma stack Docker do backend — não precisa de um comando adicional.

### 2. Frontend (Next.js)

```bash
cd next-frontend

# Garanta que o .env.local existe (veja .env.example)
# API_URL aponta para o backend; SESSION_PASSWORD protege a sessão (iron-session)

docker compose up -d
docker compose exec next-frontend npm install        # apenas na primeira vez
docker compose exec -d next-frontend npm run dev
```

A aplicação ficará disponível em **http://localhost:3001**.

> As stacks são separadas, então o frontend acessa o backend via `host.docker.internal:3000` (configurado em `next-frontend/.env.local` e no `extra_hosts` do compose).

## 🧪 Testes

### Backend (Jest)

```bash
cd nestjs-project
docker compose exec nestjs-api npm test               # unitários + integração
docker compose exec nestjs-api npm run test:e2e       # end-to-end (HTTP via supertest)
docker compose exec nestjs-api npm run test:cov       # cobertura
```

Sufixos: `*.spec.ts` (unitário), `*.integration-spec.ts` (integração com banco real), `*.e2e-spec.ts` (end-to-end). Testes de integração/e2e rodam com `--runInBand`.

### Frontend (Vitest + Playwright)

```bash
cd next-frontend
docker compose exec next-frontend npm test            # unitários + integração (Vitest + MSW)
npx playwright test                                   # end-to-end (no host, com dev server em MSW_ENABLED=true)
```

Sufixos: `*.test.ts(x)` (unitário), `*.integration.test.ts(x)` (Route Handlers com MSW), `*.e2e-spec.ts` (Playwright). MSW intercepta as chamadas à API NestJS — os testes nunca batem no backend real.

## ✅ Funcionalidades implementadas

**Fase 01 — Configuração base**, **Fase 02 — Autenticação**, **Fase 03 — Upload e Processamento de Vídeos**, **Fase 04 — Gerenciamento de Vídeos e Canal**, **Fase 05 — Página de Visualização do Vídeo**, **Fase 06 — Interações Sociais** e **Fase 07 — Página Inicial, Busca e Lançamento** estão concluídas (backend + frontend). O projeto de 7 fases do `docs/project-plan.md` está completo.

### Autenticação (Fase 02)

Fluxo completo de **cadastro → confirmação por e-mail → login → recuperação de senha**, com canal criado automaticamente para cada usuário (a partir do prefixo do e-mail).

Endpoints da API (`nestjs-project`):

| Método & Rota | Descrição |
|---------------|-----------|
| `POST /auth/register` | Cadastro de usuário (cria usuário + canal) |
| `GET /auth/confirm-email?token=` | Confirmação de conta via link do e-mail |
| `POST /auth/resend-confirmation` | Reenvio do e-mail de confirmação |
| `POST /auth/login` | Login (retorna access + refresh token) |
| `POST /auth/refresh` | Rotação de refresh token (com family + grace period) |
| `POST /auth/logout` | Revoga os refresh tokens da sessão |
| `POST /auth/forgot-password` | Solicita e-mail de recuperação de senha |
| `POST /auth/reset-password` | Redefine a senha via token |
| `GET /auth/me` | Dados do usuário autenticado (protegido por JWT) |

Telas e Route Handlers BFF (`next-frontend`):

- `/(auth)/signup`, `/(auth)/login`, `/(auth)/forgot-password` — formulários com React Hook Form + Zod e validação inline.
- `app/api/auth/{signup,login,logout,forgot-password}` — proxy same-origin para a API.

Segurança: senhas com **Argon2**, **JWT** com `JwtAuthGuard` global (opt-out via `@Public()`), **rotação de refresh token** com detecção de reuso, **rate limiting** (`ThrottlerGuard`) nos endpoints de auth, e sessão no navegador via **iron-session** (cookies HTTP-only).

### Upload e Processamento de Vídeos (Fase 03)

Upload resumível de arquivos grandes (protocolo **tus**), processamento assíncrono em background e entrega via URL assinada.

Endpoints da API (`nestjs-project`):

| Método & Rota | Descrição |
|---------------|-----------|
| `POST/PATCH/HEAD /videos/uploads` | Sessão de upload resumível (protocolo tus) — cria o vídeo como rascunho antes do primeiro byte |
| `GET /videos/:id/stream-url` | URL assinada (curta duração) para streaming do vídeo pronto |
| `GET /videos/:id/download-url` | URL assinada para download do vídeo pronto |

Pipeline assíncrono: o upload finalizado publica um job `video.uploaded` na fila (`pg-boss`); o **Video Worker**, processo independente, consome o job, extrai metadados/duração via `ffprobe` e gera o thumbnail via `ffmpeg`, atualizando o vídeo para `ready` (ou `error`).

Segurança: cada etapa (criação da sessão, upload dos bytes) exige o dono autenticado; URLs de streaming/download são assinadas e expiram.

### Gerenciamento de Vídeos e Canal (Fase 04)

Edição de informações do vídeo, fluxo de rascunho → publicação, thumbnail customizado, dashboard do canal e página pública. Backend, BFF e as 4 telas do frontend completos.

Telas (`next-frontend`):

- `/dashboard/videos/[id]/edit` — edição de vídeo (título, descrição, categoria, visibilidade, thumbnail).
- `/dashboard/videos` — dashboard do canal: listagem paginada, filtro por visibilidade, busca e ordenação.
- `/dashboard/channel` — edição das informações do canal (nickname, nome, descrição).
- `/channel/[nickname]` — página pública do canal (anônima): informações do canal + grid de vídeos publicados, com ordenação.

Endpoints da API (`nestjs-project`):

| Método & Rota | Descrição |
|---------------|-----------|
| `GET /videos/:id` | Dados do próprio vídeo para edição (dono apenas) |
| `PATCH /videos/:id` | Edita título, descrição, categoria e visibilidade |
| `POST /videos/:id/publish` | Publica o vídeo (exige `status: ready` e título preenchido) |
| `PATCH /videos/:id/thumbnail` | Substitui o thumbnail por um upload customizado |
| `GET /channels/me` / `PATCH /channels/me` | Consulta/edição do próprio canal (nickname, nome, descrição) |
| `GET /channels/me/videos` | Listagem paginada dos vídeos do próprio canal (todos os status/visibilidades) |
| `GET /channels/:nickname` | Informações públicas de um canal |
| `GET /channels/:nickname/videos` | Listagem pública e paginada dos vídeos publicados de um canal |

Route Handlers BFF (`next-frontend`): `app/api/videos/[id]/{,/publish,/thumbnail}` e `app/api/channels/{me,me/videos,[nickname],[nickname]/videos}` — proxy same-origin para os endpoints acima.

### Página de Visualização do Vídeo (Fase 05)

Página pública de assistir vídeo, com player custom, contagem real de visualizações e vídeos sugeridos.

Tela (`next-frontend`):

- `/watch/[publicId]` — player de vídeo (play/pause, seek, volume), descrição expansível, botão de download e lista de vídeos sugeridos.

Endpoints da API (`nestjs-project`):

| Método & Rota | Descrição |
|---------------|-----------|
| `GET /videos/public/:publicId` | Metadados públicos do vídeo (incrementa `views` de forma atômica) |
| `GET /videos/public/:publicId/stream-url` | URL assinada para streaming |
| `GET /videos/public/:publicId/download-url` | URL assinada para download |
| `GET /videos/public/:publicId/suggested` | Lista de vídeos sugeridos |

Route Handlers BFF (`next-frontend`): `app/api/videos/public/[publicId]/{,/stream-url,/download-url,/suggested}` — proxy same-origin para os endpoints acima.

### Interações Sociais (Fase 06)

Curtidas/descurtidas em vídeos e comentários, comentários com respostas (profundidade 1), inscrição em canais e a nova página de canais seguidos — todas as ações sociais com atualização otimista (`useOptimistic`, React 19).

Telas (`next-frontend`):

- `/watch/[publicId]` — seção real de comentários (listar, criar, responder) e curtir/descurtir o vídeo, além de inscrição real no canal do autor.
- `/channel/[nickname]` — inscrição real no canal (botão Subscribe com contagem real de inscritos).
- `/subscriptions` **(nova)** — lista paginada dos canais seguidos pelo usuário autenticado, com estado vazio e skeleton de carregamento.

Endpoints da API (`nestjs-project`):

| Método & Rota | Descrição |
|---------------|-----------|
| `PUT /videos/:publicId/reaction` | Define a reação do usuário ao vídeo (`like`/`dislike`/`null`) |
| `GET /videos/:publicId/comments` | Lista paginada de comentários do vídeo (com respostas embutidas) |
| `POST /videos/:publicId/comments` | Cria um novo comentário no vídeo |
| `POST /videos/:publicId/comments/:commentId/replies` | Responde a um comentário (profundidade máxima 1) |
| `PUT /comments/:commentId/reaction` | Define a reação do usuário a um comentário |
| `PUT /channels/:nickname/subscription` | Inscreve/cancela inscrição no canal |
| `GET /users/me/subscriptions` | Lista paginada dos canais seguidos pelo usuário autenticado |

Route Handlers BFF (`next-frontend`): `app/api/videos/public/[publicId]/{reaction,comments,comments/[commentId]/replies}`, `app/api/comments/[commentId]/reaction`, `app/api/channels/[nickname]/subscription` e `app/api/subscriptions` — proxy same-origin para os endpoints acima.

### Página Inicial, Busca e Lançamento (Fase 07)

Home page com grade global de vídeos (todos os canais), filtro por categoria, busca por título/canal (índices trigram `pg_trgm`) e infinite scroll — mais o primeiro shell compartilhado de header/sidebar/menu de conta (colapsável em mobile), e a preparação para produção (Dockerfiles, CI).

Tela (`next-frontend`):

- `/` (`app/(main)/`) — grade de vídeos com `CategoryFilterBar`, `SearchBar` e infinite scroll; `AppShell` compõe `Header`/`Sidebar`/menu de conta em todas as rotas do grupo.

Endpoint da API (`nestjs-project`):

| Método & Rota | Descrição |
|---------------|-----------|
| `GET /videos/public` | Listagem paginada e filtrável (`category`, `q`) de vídeos públicos de todos os canais |

Route Handler BFF (`next-frontend`): `app/api/videos/public` — proxy same-origin (sem reshape) para o endpoint acima.

CI (`.github/workflows/`): `ci.yml` (lint + `tsc` + testes unit/integração em todo PR contra `dev`/`main`), `full-stack-e2e.yml` (jornadas principais via Playwright contra o stack real) e `openapi-freshness.yml` (bloqueia merge se `openapi.json`/`types.gen.ts` do frontend ficarem desatualizados em relação ao contrato do backend). Topologia de deploy de produção documentada em `docs/deployment.md`.

## 🛠️ Estrutura do Projeto

```
green-field-ia-project/
├── .github/workflows/                   # CI: ci.yml, full-stack-e2e.yml, openapi-freshness.yml
├── docs/
│   ├── project-plan.md                  # Planejamento geral do projeto
│   ├── deployment.md                    # Topologia de deploy de produção (Fase 07)
│   ├── phases/                          # Planos e implementação por fase
│   │   ├── phase-01-configuracao-base/
│   │   ├── phase-02-auth/               # Auth (backend)
│   │   ├── phase-02-auth-frontend/      # Auth (frontend)
│   │   ├── phase-03-videos/             # Upload e processamento de vídeos
│   │   ├── phase-04-video-channel-management/  # Gerenciamento de vídeos e canal
│   │   ├── phase-05-video-watch-page/   # Página de visualização do vídeo
│   │   ├── phase-06-social-interactions/  # Curtidas, comentários e inscrições
│   │   └── phase-07-home-search-launch/   # Home, busca e lançamento
│   └── diagrams/
│       └── software-arch.mermaid        # Diagrama de arquitetura (C4)
├── nestjs-project/                      # Backend API (NestJS 11)
│   ├── src/
│   │   ├── auth/                        # Cadastro, login, JWT, refresh, reset de senha
│   │   ├── users/                       # Entidade/serviço de usuários; listagem de canais seguidos
│   │   ├── channels/                    # Canal 1:1 por usuário; listagens, edição e inscrições
│   │   ├── videos/                      # Upload (tus), edição, publish, thumbnail, watch, listagem pública/busca, reactions, comments
│   │   ├── processing/                  # Extração de metadados/thumbnail (ffmpeg/ffprobe)
│   │   ├── queue/                       # Fila de jobs (pg-boss)
│   │   ├── storage/                     # Cliente S3/MinIO
│   │   ├── worker/                      # Entry point do Video Worker (processo dedicado)
│   │   ├── mail/                        # Envio de e-mails (templates Handlebars)
│   │   ├── common/                      # Filtros, pipes e exceptions de domínio
│   │   ├── config/                      # Configs namespaced (Joi)
│   │   └── database/                    # data-source, migrations e seeds
│   ├── test/                            # Testes e2e
│   ├── compose.yaml                     # Docker Compose (API + PostgreSQL + Mailpit + MinIO)
│   ├── Dockerfile.dev
│   └── Dockerfile                       # Build de produção multi-stage (Fase 07)
├── next-frontend/                       # Frontend (Next.js 16, App Router)
│   ├── app/                             # Rotas, layouts, páginas e Route Handlers BFF
│   │   ├── (main)/                      # Home (grade global, filtro, busca) + shell compartilhado (Fase 07)
│   │   ├── api/videos/, api/channels/   # BFF de vídeo, canal, reações, comentários e inscrições
│   │   ├── api/comments/, api/subscriptions/  # BFF de reação em comentário e canais seguidos (Fase 06)
│   │   ├── dashboard/videos/            # Dashboard do canal + edição de vídeo (Fase 04)
│   │   ├── dashboard/channel/           # Edição de informações do canal (Fase 04)
│   │   ├── channel/[nickname]/          # Página pública do canal (Fase 04, inscrição real na Fase 06)
│   │   ├── watch/[publicId]/            # Página de assistir vídeo (Fase 05, comentários/curtidas na Fase 06)
│   │   └── subscriptions/               # Canais seguidos (Fase 06)
│   ├── components/                      # Componentes de auth, video, layout (header/sidebar/menu), UI (shadcn) e ícones
│   ├── lib/                             # env, api (openapi-fetch), auth/session
│   ├── mocks/                           # MSW (handlers + server)
│   ├── tests/                           # E2E (Playwright, incl. tests/full-stack/ contra o backend real)
│   ├── compose.yaml                     # Docker Compose (dev server)
│   ├── Dockerfile.dev
│   └── Dockerfile                       # Build de produção multi-stage (Fase 07)
├── scripts/sync-openapi.sh              # Sincroniza openapi.json do backend para o frontend
├── CLAUDE.md                            # Instruções para IA
├── FC Tube.fig                          # Design system do projeto (Figma)
├── whiteboard.png                       # Quadro branco do projeto
└── README.md
```

## 📚 Fases do Projeto

| Fase | Descrição | Status |
|------|-----------|--------|
| **01** | Configuração Base do Projeto | ✅ Concluída |
| **02** | Cadastro, Login e Gerenciamento de Conta | ✅ Concluída |
| **03** | Upload e Processamento de Vídeos | ✅ Concluída |
| **04** | Gerenciamento de Vídeos e Canal | ✅ Concluída |
| **05** | Página de Visualização do Vídeo | ✅ Concluída |
| **06** | Interações Sociais (Likes, Comentários, Inscrições) | ✅ Concluída |
| **07** | Página Inicial, Busca e Finalização | ✅ Concluída |

Detalhes completos em `docs/project-plan.md`.

## 📖 Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, React Hook Form + Zod, iron-session, openapi-fetch |
| Backend | NestJS 11, TypeScript, TypeORM, JWT, Argon2, Mailer (Handlebars) |
| Banco de Dados | PostgreSQL 17 |
| E-mail (dev) | Mailpit |
| Containerização | Docker, Docker Compose |
| Testes | Jest, Supertest (backend); Vitest, MSW, Playwright (frontend) |
| Qualidade | ESLint, Prettier |
</content>
