---
subproject: backend
runner: jest+supertest
scope: phase-03-videos
si: SI-03.6
target_file: test/video-upload.e2e-spec.ts
---

# Upload endpoint (tus protocol) — Test Plan

## Application Overview

The upload endpoint mounts the tus protocol middleware (`@tus/server` + `@tus/s3-store`) inside the NestJS API, requiring an authenticated caller. In `onUploadCreate` — before any byte of the file is transferred — the type declared in `Upload-Metadata` is checked against a video allow-list; if it fails, the session is rejected with `400 UPLOAD_INVALID_FILE_TYPE` and no draft is created. If it passes, a `Video` draft is created immediately with `userId`/`channelId` from the authenticated caller. After the complete upload arrives, `onUploadFinish` runs `ffprobe` on the object as the authoritative check: if the content is not a decodable video, the S3 object and the draft are both deleted and the response is `422 UPLOAD_CONTENT_VALIDATION_FAILED`; if it passes, the `video.uploaded` job is published to the queue for the worker to process.

## Test Scenarios

### 1. Authentication and declared validation (onUploadCreate)

**Setup:** `Test.createTestingModule({ imports: [AppModule] }).compile()` + `cleanAllTables(dataSource)` in `beforeEach` (per `.claude/rules/nestjs-testing.md`); global `ValidationPipe` and `DomainExceptionFilter`/`ValidationExceptionFilter` applied manually in `beforeAll` (per `nestjs-testing.md` § "Reproducing main.ts").

#### 1.1. upload-sem-autenticacao-401

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-09T00:36:27Z

**Steps:**
  1. Caller opens a tus upload session with no `Authorization` header
    - expect: `401` response with `errorCode: "UPLOAD_UNAUTHENTICATED"`
    - expect: no `Video` draft is created

#### 1.2. upload-metadata-invalida-400-sem-draft

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-09-09T00:36:27Z

**Steps:**
  1. Authenticated caller opens an upload session declaring a type outside the video allow-list in `Upload-Metadata`
    - expect: `400` response with `errorCode: "UPLOAD_INVALID_FILE_TYPE"`
    - expect: no `Video` draft is created in the database

#### 1.3. upload-valido-cria-draft-com-ownership

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-09T00:36:27Z

**Steps:**
  1. Authenticated caller opens an upload session declaring a valid video type in `Upload-Metadata`
    - expect: the session is accepted (tus session-creation response, with no file bytes transferred yet)
    - expect: a `Video` draft is created in the database with `userId`/`channelId` from the authenticated caller

### 2. Post-upload authoritative check (onUploadFinish)

**Setup:** same bootstrap as Group 1; requires a non-video fixture file (e.g., a renamed PDF) and a valid video fixture file to simulate the tus session's complete `PATCH`.

#### 2.1. upload-conteudo-invalido-422-remove-storage-e-draft

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-09-09T00:36:27Z

**Steps:**
  1. Caller completes an upload session whose actual content is not a decodable video (non-video fixture)
    - expect: final `422` response with `errorCode: "UPLOAD_CONTENT_VALIDATION_FAILED"`
    - expect: the corresponding object is removed from object storage
    - expect: the `Video` draft created in `onUploadCreate` is removed from the database

#### 2.2. upload-valido-publica-job-processamento

**Covers AC:** #5
**Source:** auto
**Last sync:** 2026-09-09T00:36:27Z

**Steps:**
  1. Caller completes an upload session with a valid video file
    - expect: `onUploadFinish` completes successfully
    - expect: a `video.uploaded` job is published to the queue (verifiable via `QueueService`/the `pg-boss` table)
