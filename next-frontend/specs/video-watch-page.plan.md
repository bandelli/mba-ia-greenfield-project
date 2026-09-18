---
subproject: frontend
runner: playwright
scope: phase-05-video-watch-page, phase-06-social-interactions
si: SI-05.6b, SI-06.14b
target_file: next-frontend/tests/video-watch-page.e2e-spec.ts
---

# Video Watch Page Test Plan

## Application Overview

`/watch/[publicId]` exibe a página de assistir vídeo — player funcional com play/pause, volume e barra de progresso, título, informações do canal, descrição expansível, contagem de views, botão de download, e vídeos sugeridos da mesma categoria. Totalmente acessível anonimamente, inclusive vídeos `unlisted` alcançados por link direto.

## Test Scenarios

### 1. Video Watch Page — acesso anônimo

**Setup:** `next-frontend/tests/fixtures.ts` (MSW network fixture auto-aplicado); sem sessão (acesso anônimo).

#### 1.1. renderizar-pagina-com-video-publico

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-13T23:13:04Z

**Steps:**
  1. Usuário anônimo navega para `/watch/:publicId` de um vídeo `ready`+`public`
    - expect: player de vídeo renderizado com `src` apontando para a stream-url pré-assinada
    - expect: título, informações do canal e descrição renderizados a partir da fixture de `GET /api/videos/public/[publicId]`
    - expect: lista de vídeos sugeridos renderizada a partir da fixture de `GET /api/videos/public/[publicId]/suggested`

#### 1.2. renderizar-pagina-com-video-nao-listado

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-09-13T23:13:04Z

**Steps:**
  1. Usuário anônimo navega diretamente para `/watch/:publicId` de um vídeo `ready`+`unlisted` (link direto)
    - expect: página renderiza com sucesso, mesmo conteúdo de um vídeo `public`

#### 1.3. renderizar-not-found-para-public-id-inexistente

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-13T23:13:04Z

**Steps:**
  1. Usuário navega para `/watch/:public-id-inexistente`, fixture retorna `404 VIDEO_NOT_FOUND` para `GET /api/videos/public/[publicId]`
    - expect: página `not-found` do Next.js renderizada

### 2. Controles do Video Player

**Setup:** `next-frontend/tests/fixtures.ts` (MSW network fixture auto-aplicado); sem sessão (acesso anônimo); fixture retorna vídeo `ready`+`public`.

#### 2.1. play-pause-do-video

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-09-13T23:13:04Z

**Steps:**
  1. Usuário clica no controle de play do `VideoPlayer`
    - expect: reprodução do vídeo é iniciada (elemento `<video>` não pausado)
  2. Usuário clica novamente no mesmo controle
    - expect: reprodução do vídeo é pausada (elemento `<video>` pausado)

#### 2.2. seek-via-barra-de-progresso

**Covers AC:** #5
**Source:** auto
**Last sync:** 2026-09-13T23:13:04Z

**Steps:**
  1. Usuário clica em um ponto da barra de progresso do `VideoPlayer`
    - expect: `currentTime` do elemento `<video>` avança para o timestamp correspondente ao ponto clicado

#### 2.3. ajustar-volume

**Covers AC:** #6
**Source:** auto
**Last sync:** 2026-09-13T23:13:04Z

**Steps:**
  1. Usuário ajusta o controle de volume do `VideoPlayer`
    - expect: propriedade `volume` do elemento `<video>` reflete o novo valor selecionado

### 3. Descrição e download

**Setup:** `next-frontend/tests/fixtures.ts` (MSW network fixture auto-aplicado); sem sessão (acesso anônimo); fixture retorna vídeo `ready`+`public` com descrição longa o suficiente para ser clampada.

#### 3.1. expandir-descricao-com-show-more

**Covers AC:** #7
**Source:** auto
**Last sync:** 2026-09-13T23:13:04Z

**Steps:**
  1. Usuário clica em "Show more" no `DescriptionExpandToggle`
    - expect: texto completo da descrição é exibido (clamp removido), sem nova requisição de rede

#### 3.2. botao-download-aponta-para-url-presigned

**Covers AC:** #8
**Source:** auto
**Last sync:** 2026-09-13T23:13:04Z

**Steps:**
  1. Usuário anônimo visualiza o `DownloadButton` na página
    - expect: `href` do botão corresponde à URL pré-assinada retornada pela fixture de `GET /api/videos/public/[publicId]/download-url`

### 4. Comentários (per phase-06-social-interactions/SI-06.14b)

**Setup:** `next-frontend/tests/fixtures.ts` (MSW network fixture auto-aplicado); usuário autenticado (sessão válida) para os cenários de escrita; fixture de `GET /api/videos/public/[publicId]/comments` retorna uma lista com ao menos 1 comentário de nível superior.

#### 4.1. renderizar-lista-real-de-comentarios

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. Usuário (anônimo ou autenticado) navega para `/watch/:publicId`
    - expect: `CommentsSection` renderiza a contagem real de comentários e a lista real vinda da fixture de `GET /api/videos/public/[publicId]/comments` (não o exemplo hardcoded do stub removido)

#### 4.2. publicar-novo-comentario

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. Usuário autenticado digita um texto no `CommentForm` e envia
    - expect: `POST /api/videos/public/[publicId]/comments` é chamado com o `body` digitado
    - expect: o novo comentário aparece no topo da lista, sem reload completo da página

#### 4.3. responder-a-comentario-aparece-aninhada

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-15T03:57:19Z

**Steps:**
  1. Usuário autenticado clica em "Reply" em um comentário de nível superior, digita um texto e envia
    - expect: `POST /api/videos/public/[publicId]/comments/:commentId/replies` é chamado
    - expect: a resposta aparece indentada sob o comentário pai, sem seu próprio botão "Reply" (cap de profundidade única)
