---
subproject: frontend
runner: playwright
scope: phase-04-video-channel-management
si: SI-04.9b
target_file: next-frontend/tests/video-dashboard.e2e-spec.ts
---

# Dashboard de gerenciamento de vídeos do canal Test Plan

## Application Overview

`/dashboard/videos` lista, paginada, todos os vídeos do canal do usuário autenticado (qualquer status/visibilidade), com filtros por visibilidade/data, busca por palavra-chave, ordenação e um menu de ações por vídeo que leva à tela de edição.

## Test Scenarios

### 1. Listagem e navegação do dashboard

**Setup:** `next-frontend/tests/fixtures.ts` (MSW network fixture auto-aplicado); sessão autenticada; canal com vídeos variados via fixture.

#### 1.1. exibir-lista-paginada-de-videos-do-canal

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. Usuário navega para `/dashboard/videos`
    - expect: linhas da tabela correspondem aos vídeos retornados pela fixture de `GET /api/channels/me/videos`

#### 1.2. filtrar-por-visibilidade-publica

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. Usuário clica no chip de filtro "Public"
    - expect: nova requisição a `GET /api/channels/me/videos` com `visibility=public`

#### 1.3. buscar-por-palavra-chave

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. Usuário digita um termo na busca e envia
    - expect: nova requisição a `GET /api/channels/me/videos` com `search=<termo>`

#### 1.4. reordenar-lista

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. Usuário seleciona "Oldest" no dropdown de ordenação
    - expect: nova requisição a `GET /api/channels/me/videos` com `sort=oldest`

#### 1.5. navegar-para-edicao-via-menu-de-acoes

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. Usuário abre o menu de ações de um vídeo e seleciona editar
    - expect: navegação para `/dashboard/videos/:id/edit`

#### 1.6. redirecionar-usuario-nao-autenticado

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. Usuário sem sessão navega para `/dashboard/videos`
    - expect: redirecionamento para `/login`

#### 1.7. exibir-estado-vazio-sem-videos

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. Fixture retorna `items: []` para `GET /api/channels/me/videos`
    - expect: mensagem "You haven't uploaded any videos yet" com CTA de upload
