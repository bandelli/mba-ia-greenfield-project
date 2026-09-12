---
subproject: backend
runner: jest+supertest
scope: phase-04-video-channel-management
si: SI-04.3
target_file: nestjs-project/test/video-thumbnail.e2e-spec.ts
---

# Custom thumbnail upload Test Plan

## Application Overview

`PATCH /videos/:id/thumbnail` permite ao dono de um vídeo substituir o thumbnail auto-gerado por um upload customizado (multipart), validado por tipo (jpeg/png/webp) e tamanho (max 5MB).

## Test Scenarios

### 1. Thumbnail upload

**Setup:** truncate test DB; bootstrap `AppModule` via `Test.createTestingModule`; criar usuário autenticado + canal + vídeo.

#### 1.1. substituir-thumbnail-com-arquivo-valido

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. `PATCH /videos/:id/thumbnail` com um arquivo jpeg de 2MB, autenticado como o dono
    - expect: `200`
    - expect: body contém `thumbnail_key` igual ao valor anterior (mesma key, conteúdo sobrescrito)

#### 1.2. rejeitar-arquivo-de-tipo-invalido

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. `PATCH /videos/:id/thumbnail` com um arquivo `.txt`, autenticado como o dono
    - expect: `400`
    - expect: body contém `error: "THUMBNAIL_INVALID_FILE"`

#### 1.3. rejeitar-arquivo-maior-que-o-limite

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. `PATCH /videos/:id/thumbnail` com um arquivo jpeg de 10MB, autenticado como o dono
    - expect: `400`
    - expect: body contém `error: "THUMBNAIL_INVALID_FILE"`

#### 1.4. rejeitar-upload-em-video-de-outro-usuario

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. `PATCH /videos/:id/thumbnail` autenticado como um usuário diferente do dono do vídeo
    - expect: `404`
    - expect: body contém `error: "VIDEO_NOT_FOUND"`
