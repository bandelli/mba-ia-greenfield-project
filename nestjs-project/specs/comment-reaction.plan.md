---
subproject: backend
runner: jest+supertest
scope: phase-06-social-interactions
si: SI-06.5
target_file: nestjs-project/test/comment-reaction.e2e-spec.ts
---

# Comment Like/Dislike Test Plan

## Application Overview

`PUT /comments/:commentId/reaction` implementa o mesmo padrão idempotente de `PUT /videos/:publicId/reaction`, escopado a um comentário.

## Test Scenarios

### 1. Toggle idempotente de reaction em comentário

**Setup:** truncate test DB; bootstrap `AppModule` via `Test.createTestingModule`; criar usuário autenticado + vídeo `ready`+`public` + 1 comentário de nível superior.

#### 1.1. rejeitar-sem-token

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. `PUT /comments/:commentId/reaction` com `{ type: 'like' }`, sem header `Authorization`
    - expect: `401`

#### 1.2. curtir-comentario-incrementa-contador

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. `PUT /comments/:commentId/reaction` com `{ type: 'like' }`, autenticado
    - expect: `200` com `type: 'like'`, `likesCount: 1`

#### 1.3. repetir-like-nao-duplica-contador

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. `PUT /comments/:commentId/reaction` com `{ type: 'like' }`, autenticado
  2. Repetir a mesma requisição
    - expect: ambas retornam `200` com `likesCount: 1`

#### 1.4. rejeitar-comentario-inexistente

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. `PUT /comments/:comment-id-inexistente/reaction` com `{ type: 'like' }`, autenticado
    - expect: `404` com `error: "COMMENT_NOT_FOUND"`
