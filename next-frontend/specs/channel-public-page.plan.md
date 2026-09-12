---
subproject: frontend
runner: playwright
scope: phase-04-video-channel-management
si: SI-04.11b
target_file: next-frontend/tests/channel-public-page.e2e-spec.ts
---

# Página pública do canal Test Plan

## Application Overview

`/channel/[nickname]` exibe as informações públicas de um canal e a lista de seus vídeos publicados e públicos, com reordenação. Acessível anonimamente.

## Test Scenarios

### 1. Página pública do canal

**Setup:** `next-frontend/tests/fixtures.ts` (MSW network fixture auto-aplicado); sem sessão (acesso anônimo).

#### 1.1. exibir-informacoes-e-videos-do-canal

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. Usuário anônimo navega para `/channel/:nickname`
    - expect: banner/avatar/nome/@nickname/contagens do canal renderizados
    - expect: grid de vídeos corresponde à fixture de `GET /api/channels/:nickname/videos`

#### 1.2. exibir-estado-vazio-sem-videos-publicos

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. Fixture retorna `items: []` para `GET /api/channels/:nickname/videos`
    - expect: mensagem "This channel has no public videos yet"

#### 1.3. renderizar-not-found-para-nickname-inexistente

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. Usuário navega para `/channel/:nickname-inexistente`, fixture retorna `404 CHANNEL_NOT_FOUND`
    - expect: página `not-found` do Next.js renderizada

#### 1.4. reordenar-videos-publicados

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. Usuário seleciona "Popular" no controle de ordenação
    - expect: nova requisição a `GET /api/channels/:nickname/videos` com `sort=popular`
