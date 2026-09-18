---
subproject: frontend
runner: playwright
scope: phase-06-social-interactions
si: SI-06.16b
target_file: next-frontend/tests/subscriptions.e2e-spec.ts
---

# Followed Channels Page Test Plan

## Application Overview

`/subscriptions` exibe a lista paginada de canais que o usuário autenticado segue, cada um com link para sua página pública (`/channel/[nickname]`). Rota totalmente autenticada — não existe estado anônimo além do redirecionamento para `/login`. Server Component + `searchParams`, sem cache client-side, seguindo a convenção já estabelecida em `phase-04-video-channel-management/TD-06`.

## Test Scenarios

### 1. Acesso e autenticação

**Setup:** `next-frontend/tests/fixtures.ts` (MSW network fixture auto-aplicado).

#### 1.1. renderizar-lista-de-canais-seguidos

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. Usuário autenticado (sessão válida) navega para `/subscriptions`, fixture de `GET /api/subscriptions` retorna 2 canais
    - expect: `SubscribedChannelsList` renderiza uma `SubscribedChannelRow` por canal, com avatar e nome reais da fixture
    - expect: cada `SubscribedChannelRow` linka para `/channel/:nickname` do respectivo canal

#### 1.2. acesso-anonimo-redireciona-para-login

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. Usuário sem sessão navega para `/subscriptions`
    - expect: redirecionado para `/login`

#### 1.3. exibir-estado-vazio-sem-inscricoes

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. Usuário autenticado navega para `/subscriptions`, fixture de `GET /api/subscriptions` retorna lista vazia
    - expect: `EmptySubscriptionsState` renderizado com a mensagem "You haven't subscribed to any channel yet."

### 2. Paginação e carregamento

**Setup:** `next-frontend/tests/fixtures.ts` (MSW network fixture auto-aplicado); usuário autenticado; fixture de `GET /api/subscriptions` retorna `total` maior que `limit` (múltiplas páginas).

#### 2.1. navegar-para-segunda-pagina

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. Usuário autenticado navega para `/subscriptions` e clica no controle "next" de `PaginationControls`
    - expect: URL atualiza para `/subscriptions?page=2`
    - expect: a lista renderizada reflete os canais da fixture correspondentes à segunda página

#### 2.2. exibir-skeleton-durante-carregamento

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. Usuário autenticado navega para `/subscriptions`, fixture de `GET /api/subscriptions` responde com atraso simulado
    - expect: `app/subscriptions/loading.tsx`'s skeleton é exibido antes do conteúdo real aparecer
