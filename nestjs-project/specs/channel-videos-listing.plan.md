---
subproject: backend
runner: jest+supertest
scope: phase-04-video-channel-management
si: SI-04.5
target_file: nestjs-project/test/channel-videos-listing.e2e-spec.ts
---

# Channel & dashboard video listings Test Plan

## Application Overview

`GET /channels/me/videos` retorna, paginado, todos os vídeos do canal do usuário autenticado, em qualquer status/visibilidade. `GET /channels/:nickname/videos` retorna, paginado, apenas os vídeos publicados e públicos de um canal. `GET /channels/:nickname` retorna as informações públicas de um canal.

## Test Scenarios

### 1. Channel & video listings

**Setup:** truncate test DB; bootstrap `AppModule` via `Test.createTestingModule`; criar usuário autenticado + canal com vídeos em status/visibilidades variados (draft, ready+unlisted, ready+public+publicado).

#### 1.1. listar-todos-os-videos-do-proprio-canal

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. `GET /channels/me/videos` autenticado como o dono
    - expect: `200`
    - expect: `items` inclui vídeos de todos os status e visibilidades do canal

#### 1.2. listar-apenas-videos-publicados-e-publicos-do-canal

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. `GET /channels/:nickname/videos` (rota pública, sem autenticação)
    - expect: `200`
    - expect: `items` contém apenas vídeos com `status: "ready"`, `visibility: "public"` e `published_at` preenchido

#### 1.3. rejeitar-listagem-de-canal-inexistente

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. `GET /channels/nickname-que-nao-existe/videos`
    - expect: `404`
    - expect: body contém `error: "CHANNEL_NOT_FOUND"`

#### 1.4. exibir-informacoes-publicas-do-canal-sem-dados-privados

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. `GET /channels/:nickname` (rota pública)
    - expect: `200`
    - expect: body contém `name`, `nickname`, `description`, `created_at`
    - expect: body NÃO contém `user_id`
