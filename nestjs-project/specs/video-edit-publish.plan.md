---
subproject: backend
runner: jest+supertest
scope: phase-04-video-channel-management
si: SI-04.2
target_file: nestjs-project/test/video-edit-publish.e2e-spec.ts
---

# Video edit & publish Test Plan

## Application Overview

`PATCH /videos/:id` permite ao dono de um vídeo editar título, descrição, categoria e visibilidade. `POST /videos/:id/publish` aplica os mesmos campos e, adicionalmente, marca o vídeo como publicado (`published_at`), desde que o vídeo esteja com `status: "ready"`.

## Test Scenarios

### 1. Video field editing

**Setup:** truncate test DB; bootstrap `AppModule` via `Test.createTestingModule`; criar usuário autenticado + canal + vídeo `status: "ready"`.

#### 1.1. editar-campos-do-video-com-sucesso

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. `PATCH /videos/:id` com `{ title: "Novo título", category: "music" }`, autenticado como o dono
    - expect: `200`
    - expect: body contém `category: "music"`

#### 1.2. rejeitar-edicao-de-video-de-outro-usuario

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. `PATCH /videos/:id` autenticado como um usuário diferente do dono do vídeo
    - expect: `404`
    - expect: body contém `error: "VIDEO_NOT_FOUND"`

#### 1.3. rejeitar-categoria-invalida

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. `PATCH /videos/:id` com `{ category: "not-a-real-category" }`, autenticado como o dono
    - expect: `400`
    - expect: body contém `error: "VALIDATION_ERROR"`

### 2. Video publish

**Setup:** truncate test DB; bootstrap `AppModule`; criar usuário autenticado + canal + vídeo.

#### 2.1. publicar-video-pronto

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. Criar vídeo com `status: "ready"`
  2. `POST /videos/:id/publish` autenticado como o dono
    - expect: `200`
    - expect: body contém `published_at` não-nulo

#### 2.2. rejeitar-publicacao-de-video-nao-pronto

**Covers AC:** #5
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. Criar vídeo com `status: "processing"`
  2. `POST /videos/:id/publish` autenticado como o dono
    - expect: `400`
    - expect: body contém `error: "VIDEO_NOT_READY"`
