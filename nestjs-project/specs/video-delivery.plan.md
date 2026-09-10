---
subproject: backend
runner: jest+supertest
scope: phase-03-videos
si: SI-03.7
target_file: test/video-delivery.e2e-spec.ts
---

# Endpoints de streaming e download (URLs pré-assinadas) — Test Plan

## Application Overview

`GET /videos/:id/stream-url` e `GET /videos/:id/download-url` emitem URLs pré-assinadas de curta duração apontando diretamente para o object storage, para que o browser reproduza via streaming ou baixe o vídeo sem que os bytes passem pela API. Ambos os endpoints exigem que o caller seja o dono (`owner`) do vídeo — a visibilidade pública/unlisted para outros usuários é decidida em uma fase futura (Fase 04) e não é coberta aqui. Um `id` que não corresponde a nenhum `Video` retorna `404`.

## Test Scenarios

### 1. Emissão de URL de streaming

**Setup:** `Test.createTestingModule({ imports: [AppModule] }).compile()` + `cleanAllTables(dataSource)` em `beforeEach` (per `.claude/rules/nestjs-testing.md`); global `ValidationPipe` e `DomainExceptionFilter`/`ValidationExceptionFilter` aplicados manualmente em `beforeAll`; fixture de um `Video` pré-existente pertencente ao caller autenticado do teste.

#### 1.1. stream-url-video-proprio-200

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-09T00:36:27Z

**Steps:**
  1. Caller autenticado, dono do vídeo, chama `GET /videos/:id/stream-url` com um `id` existente
    - expect: resposta `200`
    - expect: o corpo contém `url`, uma URL pré-assinada de object storage válida por tempo limitado

### 2. Emissão de URL de download

**Setup:** mesmo bootstrap do Grupo 1.

#### 2.1. download-url-video-proprio-200

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-09-09T00:36:27Z

**Steps:**
  1. Caller autenticado, dono do vídeo, chama `GET /videos/:id/download-url` com um `id` existente
    - expect: resposta `200`
    - expect: o corpo contém `url`, uma URL pré-assinada de object storage válida por tempo limitado

### 3. Vídeo inexistente

**Setup:** mesmo bootstrap do Grupo 1, sem fixture de `Video` para o `id` usado.

#### 3.1. stream-url-video-inexistente-404

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-09T00:36:27Z

**Steps:**
  1. Caller autenticado chama `GET /videos/:id/stream-url` com um `id` que não corresponde a nenhum `Video`
    - expect: resposta `404`

### 4. Vídeo ainda não pronto (status != ready)

**Setup:** mesmo bootstrap do Grupo 1, com fixture de `Video` pertencente ao caller cujo `status` é `draft`, `processing` ou `error` (per `phase-03-videos/TD-10`).

#### 4.1. stream-url-video-nao-pronto-404

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-09-09T22:23:59Z

**Steps:**
  1. Caller autenticado, dono do vídeo, chama `GET /videos/:id/stream-url` para um vídeo cujo `status` é `draft`, `processing` ou `error`
    - expect: resposta `404`
