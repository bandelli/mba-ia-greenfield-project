---
subproject: backend
runner: jest+supertest
scope: phase-06-social-interactions
si: SI-06.4
target_file: nestjs-project/test/comments.e2e-spec.ts
---

# Video Comments (list + create) Test Plan

## Application Overview

`GET /videos/:publicId/comments` lista comentários de nível superior (com `replies` embutidas), paginado via `limit`/`offset`, leitura anônima. `POST /videos/:publicId/comments` cria um comentário de nível superior, autenticado, incrementando `videos.comments_count` atomicamente.

## Test Scenarios

### 1. Listagem paginada e anônima

**Setup:** truncate test DB; bootstrap `AppModule` via `Test.createTestingModule`; criar vídeo `ready`+`public` com 3 comentários de nível superior.

#### 1.1. listar-comentarios-sem-autenticacao

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. `GET /videos/:publicId/comments`, sem header `Authorization`
    - expect: `200`
    - expect: body contém `items` com os 3 comentários e `total: 3`

#### 1.2. paginacao-respeita-limit

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. `GET /videos/:publicId/comments?limit=1`
    - expect: `200`
    - expect: `items` contém exatamente 1 elemento; `total: 3`

### 2. Criação de comentário

**Setup:** truncate test DB; bootstrap `AppModule`; criar usuário autenticado + vídeo `ready`+`public`.

#### 2.1. rejeitar-criacao-sem-token

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. `POST /videos/:publicId/comments` com `{ body: 'oi' }`, sem header `Authorization`
    - expect: `401`

#### 2.2. rejeitar-body-vazio

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. `POST /videos/:publicId/comments` com `{ body: '' }`, autenticado
    - expect: `400`

#### 2.3. criar-comentario-com-sucesso

**Covers AC:** #5
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. `POST /videos/:publicId/comments` com `{ body: 'Ótimo vídeo!' }`, autenticado
    - expect: `201` com o comentário criado
  2. `GET /videos/:publicId/comments`
    - expect: o novo comentário está presente em `items`; `total` incrementado em 1
