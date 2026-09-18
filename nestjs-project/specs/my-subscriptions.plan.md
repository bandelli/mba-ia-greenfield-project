---
subproject: backend
runner: jest+supertest
scope: phase-06-social-interactions
si: SI-06.8
target_file: nestjs-project/test/my-subscriptions.e2e-spec.ts
---

# Followed Channels List Test Plan

## Application Overview

`GET /users/me/subscriptions` retorna a lista paginada (offset/limit) dos canais que o usuário autenticado segue.

## Test Scenarios

### 1. Listagem paginada dos canais seguidos

**Setup:** truncate test DB; bootstrap `AppModule` via `Test.createTestingModule`; criar usuário autenticado e 2 canais que ele segue.

#### 1.1. rejeitar-sem-token

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. `GET /users/me/subscriptions`, sem header `Authorization`
    - expect: `401`

#### 1.2. listar-canais-seguidos

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. `GET /users/me/subscriptions`, autenticado
    - expect: `200` com `items` contendo os 2 canais seguidos e `total: 2`

#### 1.3. paginacao-respeita-limit

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. `GET /users/me/subscriptions?limit=1`, autenticado
    - expect: `200` com `items` contendo exatamente 1 elemento
