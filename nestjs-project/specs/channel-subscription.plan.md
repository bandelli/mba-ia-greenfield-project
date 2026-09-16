---
subproject: backend
runner: jest+supertest
scope: phase-06-social-interactions
si: SI-06.7
target_file: nestjs-project/test/subscription.e2e-spec.ts
---

# Channel Subscription Test Plan

## Application Overview

`PUT /channels/:nickname/subscription` implementa o toggle idempotente de inscrição em canal, com proteção contra auto-inscrição do dono no próprio canal.

## Test Scenarios

### 1. Toggle idempotente de inscrição

**Setup:** truncate test DB; bootstrap `AppModule` via `Test.createTestingModule`; criar dois usuários autenticados, cada um com seu canal.

#### 1.1. rejeitar-sem-token

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. `PUT /channels/:nickname/subscription` com `{ subscribed: true }`, sem header `Authorization`
    - expect: `401`

#### 1.2. inscrever-se-incrementa-contador

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. Usuário A autenticado: `PUT /channels/:nickname-do-canal-B/subscription` com `{ subscribed: true }`
    - expect: `200` com `subscribed: true`, `subscribersCount: 1`

#### 1.3. repetir-inscricao-nao-duplica-contador

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. Usuário A autenticado: `PUT /channels/:nickname-do-canal-B/subscription` com `{ subscribed: true }`
  2. Repetir a mesma requisição
    - expect: ambas retornam `200` com `subscribersCount: 1`

#### 1.4. rejeitar-auto-inscricao

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. Usuário A autenticado: `PUT /channels/:nickname-do-proprio-canal-A/subscription` com `{ subscribed: true }`
    - expect: `409` com `error: "CANNOT_SUBSCRIBE_OWN_CHANNEL"`

#### 1.5. rejeitar-canal-inexistente

**Covers AC:** #5
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. `PUT /channels/:nickname-inexistente/subscription` com `{ subscribed: true }`, autenticado
    - expect: `404` com `error: "CHANNEL_NOT_FOUND"`
