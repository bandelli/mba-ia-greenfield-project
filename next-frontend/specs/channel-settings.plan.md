---
subproject: frontend
runner: playwright
scope: phase-04-video-channel-management
si: SI-04.10b
target_file: next-frontend/tests/channel-settings.e2e-spec.ts
---

# Edição de informações do canal Test Plan

## Application Overview

`/dashboard/channel` permite ao dono do canal editar nickname, nome e descrição. A tela é restrita a usuários autenticados; um nickname já em uso retorna erro inline.

## Test Scenarios

### 1. Edição de informações do canal

**Setup:** `next-frontend/tests/fixtures.ts` (MSW network fixture auto-aplicado); sessão autenticada.

#### 1.1. editar-e-salvar-informacoes-do-canal

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. Usuário navega para `/dashboard/channel`, edita o nome e a descrição, e submete
    - expect: confirmação inline "Channel updated"

#### 1.2. exibir-erro-inline-de-nickname-duplicado

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. Fixture força `PATCH /api/channels/me` a retornar `409 CHANNEL_NICKNAME_TAKEN`; usuário submete um novo nickname
    - expect: erro inline no campo de nickname: "This nickname is already taken"

#### 1.3. redirecionar-usuario-nao-autenticado

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. Usuário sem sessão navega para `/dashboard/channel`
    - expect: redirecionamento para `/login`

#### 1.4. bloquear-submit-com-nickname-em-formato-invalido

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-12T00:00:00Z

**Steps:**
  1. Usuário digita um nickname com caracteres fora de `[a-z0-9_]`
    - expect: erro de validação client-side inline
    - expect: botão de submit desabilitado
