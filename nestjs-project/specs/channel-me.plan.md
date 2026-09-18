---
subproject: backend
runner: jest+supertest
scope: phase-04-video-channel-management
si: SI-04.4
target_file: nestjs-project/test/channel-me.e2e-spec.ts
---

# Own-channel read & edit Test Plan

## Application Overview

`GET /channels/me` retorna as informações do canal do usuário autenticado. `PATCH /channels/me` permite editar `nickname`, `name` e `description`, rejeitando com `409` quando o `nickname` desejado já está em uso por outro canal.

## Test Scenarios

### 1. Own-channel read & edit

**Setup:** truncate test DB; bootstrap `AppModule` via `Test.createTestingModule`; criar dois usuários autenticados, cada um com seu canal.

#### 1.1. ler-proprio-canal-autenticado

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. `GET /channels/me` autenticado
    - expect: `200`
    - expect: body contém `nickname`, `name`, `description` do canal do chamador

#### 1.2. editar-nickname-livre-com-sucesso

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. `PATCH /channels/me` com `{ nickname: "novo_nick_livre" }`, autenticado
    - expect: `200`
    - expect: body contém `nickname: "novo_nick_livre"`

#### 1.3. rejeitar-nickname-ja-em-uso

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. `PATCH /channels/me` com `{ nickname: <nickname do canal do outro usuário> }`, autenticado
    - expect: `409`
    - expect: body contém `error: "CHANNEL_NICKNAME_TAKEN"`

#### 1.4. rejeitar-leitura-sem-token

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. `GET /channels/me` sem header `Authorization`
    - expect: `401`
