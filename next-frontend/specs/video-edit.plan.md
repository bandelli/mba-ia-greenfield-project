---
subproject: frontend
runner: playwright
scope: phase-04-video-channel-management
si: SI-04.8b
target_file: next-frontend/tests/video-edit.e2e-spec.ts
---

# Tela de edição de vídeo Test Plan

## Application Overview

`/dashboard/videos/[id]/edit` permite ao dono do vídeo editar título, descrição, categoria, visibilidade e thumbnail customizado, e salvar como rascunho ou publicar. A tela é restrita a usuários autenticados donos do vídeo.

## Test Scenarios

### 1. Edição e publicação de vídeo

**Setup:** `next-frontend/tests/fixtures.ts` (MSW network fixture auto-aplicado); sessão autenticada como dono do vídeo.

#### 1.1. editar-campos-e-salvar-como-rascunho

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. Usuário navega para `/dashboard/videos/:id/edit`, edita o título e clica em "Save as draft"
    - expect: toast de confirmação "Saved" visível
    - expect: `published_at` do vídeo permanece nulo (via fixture)

#### 1.2. publicar-video-pronto

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. Usuário clica em "Publish" em um vídeo com `status: "ready"`
    - expect: redirecionamento para o dashboard
    - expect: fixture confirma `POST /api/videos/:id/publish` chamado

#### 1.3. exibir-erro-inline-de-categoria-invalida

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. Fixture força `PATCH /api/videos/:id` a retornar `400 VALIDATION_ERROR` para o campo `category`; usuário submete o formulário
    - expect: erro inline abaixo do campo de categoria

#### 1.4. exibir-toast-ao-tentar-publicar-video-nao-pronto

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. Fixture força `POST /api/videos/:id/publish` a retornar `400 VIDEO_NOT_READY`; usuário clica em "Publish"
    - expect: toast bloqueando a ação, explicando que o vídeo ainda está processando

#### 1.5. redirecionar-usuario-nao-autenticado

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. Usuário sem sessão navega para `/dashboard/videos/:id/edit`
    - expect: redirecionamento para `/login`

#### 1.6. bloquear-submit-com-titulo-acima-do-limite

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. Usuário digita um título com mais de 200 caracteres
    - expect: erro de validação client-side inline
    - expect: botão de submit desabilitado
