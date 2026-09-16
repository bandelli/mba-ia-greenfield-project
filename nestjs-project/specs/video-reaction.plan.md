---
subproject: backend
runner: jest+supertest
scope: phase-06-social-interactions
si: SI-06.2
target_file: nestjs-project/test/video-reaction.e2e-spec.ts
---

# Video Like/Dislike Test Plan

## Application Overview

`PUT /videos/:publicId/reaction` implementa o toggle idempotente de like/dislike em vídeos: o cliente sempre envia o estado final desejado (`{ type: 'like' | 'dislike' | null }`); o servidor faz upsert/delete da linha de `VideoReaction` e atualiza `videos.likes_count`/`dislikes_count` atomicamente.

## Test Scenarios

### 1. Toggle idempotente de reaction em vídeo

**Setup:** truncate test DB; bootstrap `AppModule` via `Test.createTestingModule`; criar usuário autenticado + vídeo `ready`+`public`.

#### 1.1. rejeitar-sem-token

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. `PUT /videos/:publicId/reaction` com `{ type: 'like' }`, sem header `Authorization`
    - expect: `401`

#### 1.2. curtir-video-incrementa-contador

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. `PUT /videos/:publicId/reaction` com `{ type: 'like' }`, autenticado
    - expect: `200`
    - expect: body contém `type: 'like'`, `likesCount: 1`, `dislikesCount: 0`

#### 1.3. repetir-like-nao-duplica-contador

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. `PUT /videos/:publicId/reaction` com `{ type: 'like' }`, autenticado (mesmo usuário)
  2. Repetir a mesma requisição
    - expect: ambas retornam `200` com `likesCount: 1` (sem duplicação)

#### 1.4. trocar-de-like-para-dislike

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. `PUT /videos/:publicId/reaction` com `{ type: 'like' }`, autenticado
  2. `PUT /videos/:publicId/reaction` com `{ type: 'dislike' }`, mesmo usuário
    - expect: `200` com `type: 'dislike'`, `likesCount: 0`, `dislikesCount: 1`

#### 1.5. rejeitar-video-inexistente

**Covers AC:** #5
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. `PUT /videos/:public-id-inexistente/reaction` com `{ type: 'like' }`, autenticado
    - expect: `404`
    - expect: body contém `error: "VIDEO_NOT_FOUND"`
