---
subproject: backend
runner: jest+supertest
scope: phase-06-social-interactions
si: SI-06.6
target_file: nestjs-project/test/comment-replies.e2e-spec.ts
---

# Comment Replies Test Plan

## Application Overview

`POST /videos/:publicId/comments/:commentId/replies` cria uma resposta a um comentário de nível superior, autenticado, com cap de profundidade única (uma reply não pode ela mesma ser respondida).

## Test Scenarios

### 1. Criação de reply com cap de profundidade

**Setup:** truncate test DB; bootstrap `AppModule`; criar usuário autenticado + vídeo `ready`+`public` + 1 comentário de nível superior.

#### 1.1. rejeitar-sem-token

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. `POST /videos/:publicId/comments/:commentId/replies` com `{ body: 'oi' }`, sem header `Authorization`
    - expect: `401`

#### 1.2. responder-comentario-nivel-superior

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. `POST /videos/:publicId/comments/:commentId/replies` com `{ body: 'Concordo!' }`, autenticado
    - expect: `201` com a reply criada
  2. `GET /videos/:publicId/comments`
    - expect: o comentário pai tem a reply embutida em `replies`

#### 1.3. rejeitar-resposta-a-reply

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. Criar uma reply via `POST .../comments/:commentId/replies`
  2. `POST /videos/:publicId/comments/:replyId/replies` com `{ body: 'segunda camada' }`, mesmo `publicId`, autenticado
    - expect: `400` com `error: "REPLY_DEPTH_EXCEEDED"`

#### 1.4. rejeitar-comentario-pai-inexistente

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. `POST /videos/:publicId/comments/:comment-id-inexistente/replies` com `{ body: 'oi' }`, autenticado
    - expect: `404`
