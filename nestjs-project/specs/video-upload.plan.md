---
subproject: backend
runner: jest+supertest
scope: phase-03-videos
si: SI-03.6
target_file: test/video-upload.e2e-spec.ts
---

# Endpoint de upload (protocolo tus) — Test Plan

## Application Overview

O endpoint de upload monta o middleware do protocolo tus (`@tus/server` + `@tus/s3-store`) dentro da API NestJS, exigindo um caller autenticado. Em `onUploadCreate` — antes de qualquer byte do arquivo trafegar — o tipo declarado em `Upload-Metadata` é checado contra um allow-list de vídeo; se falhar, a sessão é rejeitada com `400 UPLOAD_INVALID_FILE_TYPE` e nenhum rascunho é criado. Se passar, um rascunho `Video` é criado imediatamente com `userId`/`channelId` do caller autenticado. Depois que o upload completo chega, `onUploadFinish` roda `ffprobe` sobre o objeto como checagem autoritativa: se o conteúdo não for um vídeo decodificável, o objeto no S3 e o rascunho são apagados e a resposta é `422 UPLOAD_CONTENT_VALIDATION_FAILED`; se passar, o job `video.uploaded` é publicado na fila para o worker processar.

## Test Scenarios

### 1. Autenticação e validação declarada (onUploadCreate)

**Setup:** `Test.createTestingModule({ imports: [AppModule] }).compile()` + `cleanAllTables(dataSource)` em `beforeEach` (per `.claude/rules/nestjs-testing.md`); global `ValidationPipe` e `DomainExceptionFilter`/`ValidationExceptionFilter` aplicados manualmente em `beforeAll` (per `nestjs-testing.md` § "Reproduzir main.ts").

#### 1.1. upload-sem-autenticacao-401

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-09T00:36:27Z

**Steps:**
  1. Caller abre uma sessão de upload tus sem header `Authorization`
    - expect: resposta `401` com `errorCode: "UPLOAD_UNAUTHENTICATED"`
    - expect: nenhum rascunho `Video` é criado

#### 1.2. upload-metadata-invalida-400-sem-draft

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-09-09T00:36:27Z

**Steps:**
  1. Caller autenticado abre uma sessão de upload declarando em `Upload-Metadata` um tipo fora do allow-list de vídeo
    - expect: resposta `400` com `errorCode: "UPLOAD_INVALID_FILE_TYPE"`
    - expect: nenhum rascunho `Video` é criado no banco

#### 1.3. upload-valido-cria-draft-com-ownership

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-09T00:36:27Z

**Steps:**
  1. Caller autenticado abre uma sessão de upload declarando um tipo de vídeo válido em `Upload-Metadata`
    - expect: a sessão é aceita (resposta de criação da sessão tus, sem bytes do arquivo ainda transferidos)
    - expect: um rascunho `Video` é criado no banco com `userId`/`channelId` do caller autenticado

### 2. Checagem autoritativa pós-upload (onUploadFinish)

**Setup:** mesmo bootstrap do Grupo 1; requer um arquivo fixture não-vídeo (ex.: um PDF renomeado) e um arquivo fixture de vídeo válido para simular o `PATCH` completo da sessão tus.

#### 2.1. upload-conteudo-invalido-422-remove-storage-e-draft

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-09-09T00:36:27Z

**Steps:**
  1. Caller completa uma sessão de upload cujo conteúdo real não é um vídeo decodificável (fixture não-vídeo)
    - expect: resposta final `422` com `errorCode: "UPLOAD_CONTENT_VALIDATION_FAILED"`
    - expect: o objeto correspondente é removido do object storage
    - expect: o rascunho `Video` criado em `onUploadCreate` é removido do banco

#### 2.2. upload-valido-publica-job-processamento

**Covers AC:** #5
**Source:** auto
**Last sync:** 2026-09-09T00:36:27Z

**Steps:**
  1. Caller completa uma sessão de upload com um arquivo de vídeo válido
    - expect: `onUploadFinish` conclui com sucesso
    - expect: um job `video.uploaded` é publicado na fila (verificável via `QueueService`/tabela do `pg-boss`)
