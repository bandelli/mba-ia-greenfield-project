---
subproject: frontend
runner: playwright
scope: phase-07-home-search-launch
si: SI-07.4b
target_file: next-frontend/tests/home.e2e-spec.ts
---

# Home (Catalog Show) Test Plan

## Application Overview

`/` é a página inicial pública da plataforma: uma grade global de vídeos (thumbnail, título, canal, visualizações, tempo de publicação), com filtro por categoria e busca por título/canal, ambos refiltrando a mesma grade via querystring (`?category=`, `?q=`). A primeira página renderiza via Server Component (`searchParams`-driven); a rolagem contínua é client-side via `IntersectionObserver` (`home-search-launch/TD-03`). Acesso é anônimo por padrão — o Account Menu (identidade do canal + Sign Out) só aparece para sessões autenticadas, via o header/sidebar compartilhado introduzido nesta fase (`home-search-launch/TD-04`).

## Test Scenarios

### 1. Grade inicial e filtro por categoria

**Setup:** `next-frontend/tests/fixtures.ts` (MSW network fixture auto-aplicado).

#### 1.1. renderizar-grade-inicial-anonima

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-17T00:01:36Z

**Steps:**
  1. Usuário sem sessão navega para `/`, fixture de `GET /api/videos/public` retorna uma primeira página de vídeos públicos
    - expect: `VideoGrid` renderiza um `VideoGridCard` por item da fixture, mais recentes primeiro
    - expect: cada `VideoGridCard` exibe thumbnail, título, nome do canal, visualizações e tempo de publicação
    - expect: nenhum redirecionamento para `/login` ocorre (acesso anônimo)

#### 1.2. filtrar-por-categoria-atualiza-url-e-grade

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-09-17T00:01:36Z

**Steps:**
  1. Usuário navega para `/`, clica no `CategoryChip` "Music", fixture de `GET /api/videos/public?category=music` retorna um conjunto diferente de vídeos
    - expect: URL atualiza para `/?category=music`
    - expect: `CategoryFilterBar` marca o chip "Music" como ativo
    - expect: `VideoGrid` renderiza os vídeos da fixture filtrada, sem full page reload

### 2. Busca

**Setup:** `next-frontend/tests/fixtures.ts` (MSW network fixture auto-aplicado).

#### 2.1. buscar-por-titulo-atualiza-url-e-grade

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-17T00:01:36Z

**Steps:**
  1. Usuário navega para `/`, digita um termo em `SearchBar` e submete, fixture de `GET /api/videos/public?q=<termo>` retorna vídeos correspondentes
    - expect: URL atualiza para `/?q=<termo>`
    - expect: `VideoGrid` renderiza apenas os vídeos da fixture filtrada por busca

#### 2.2. busca-sem-resultados-exibe-estado-vazio

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-17T00:01:36Z

**Steps:**
  1. Usuário submete uma busca em `SearchBar`, fixture de `GET /api/videos/public?q=<termo>` retorna `items: []`
    - expect: `VideoGrid` renderiza o estado vazio (mensagem de nenhum resultado), sem quebrar o layout

### 3. Scroll infinito

**Setup:** `next-frontend/tests/fixtures.ts` (MSW network fixture auto-aplicado); fixture de `GET /api/videos/public` retorna `total` maior que `limit` (múltiplas páginas).

#### 3.1. rolar-ate-o-fim-carrega-proxima-pagina

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-09-17T00:01:36Z

**Steps:**
  1. Usuário navega para `/` (primeira página carregada) e rola até o `InfiniteScrollLoader` sentinel entrar em viewport, fixture de `GET /api/videos/public?page=2` retorna a próxima página
    - expect: os novos `VideoGridCard`s da página 2 são anexados ao final da grade existente
    - expect: nenhum item da página 1 é duplicado ou removido

### 4. Account Menu (autenticado)

**Setup:** `next-frontend/tests/fixtures.ts` (MSW network fixture auto-aplicado); sessão autenticada.

#### 4.1. abrir-account-menu-exibe-identidade-e-permite-sign-out

**Covers AC:** #5
**Source:** auto
**Last sync:** 2026-09-17T00:01:36Z

**Steps:**
  1. Usuário autenticado navega para `/`, clica em `AvatarButton`, fixture de `GET /channels/me` retorna o canal do usuário
    - expect: `AccountUserMenuSheet` abre exibindo avatar, nome do canal e `@nickname` via `AccountMenuIdentityBlock`
  2. Usuário clica em "Sign Out" dentro do menu
    - expect: `POST /api/auth/logout` é chamado
    - expect: sessão é encerrada — `AvatarButton` volta a exibir a affordance de login
