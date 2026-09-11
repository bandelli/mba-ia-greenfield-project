---
subproject: backend
runner: jest+supertest
scope: phase-03-videos
si: SI-03.7
target_file: test/video-delivery.e2e-spec.ts
---

# Streaming and download endpoints (presigned URLs) — Test Plan

## Application Overview

`GET /videos/:id/stream-url` and `GET /videos/:id/download-url` issue short-lived presigned URLs pointing directly at object storage, so the browser plays via streaming or downloads the video without the bytes passing through the API. Both endpoints require the caller to be the video's owner (`owner`) — public/unlisted visibility for other users is decided in a future phase (Phase 04) and is not covered here. An `id` that doesn't match any `Video` returns `404`.

## Test Scenarios

### 1. Streaming URL issuance

**Setup:** `Test.createTestingModule({ imports: [AppModule] }).compile()` + `cleanAllTables(dataSource)` in `beforeEach` (per `.claude/rules/nestjs-testing.md`); global `ValidationPipe` and `DomainExceptionFilter`/`ValidationExceptionFilter` applied manually in `beforeAll`; fixture of a pre-existing `Video` belonging to the test's authenticated caller.

#### 1.1. stream-url-video-proprio-200

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-09T00:36:27Z

**Steps:**
  1. Authenticated caller, owner of the video, calls `GET /videos/:id/stream-url` with an existing `id`
    - expect: `200` response
    - expect: the body contains `url`, a presigned object-storage URL valid for a limited time

### 2. Download URL issuance

**Setup:** same bootstrap as Group 1.

#### 2.1. download-url-video-proprio-200

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-09-09T00:36:27Z

**Steps:**
  1. Authenticated caller, owner of the video, calls `GET /videos/:id/download-url` with an existing `id`
    - expect: `200` response
    - expect: the body contains `url`, a presigned object-storage URL valid for a limited time

### 3. Nonexistent video

**Setup:** same bootstrap as Group 1, with no `Video` fixture for the `id` used.

#### 3.1. stream-url-video-inexistente-404

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-09T00:36:27Z

**Steps:**
  1. Authenticated caller calls `GET /videos/:id/stream-url` with an `id` that doesn't match any `Video`
    - expect: `404` response

### 4. Video not yet ready (status != ready)

**Setup:** same bootstrap as Group 1, with a `Video` fixture belonging to the caller whose `status` is `draft`, `processing`, or `error` (per `phase-03-videos/TD-10`).

#### 4.1. stream-url-video-nao-pronto-404

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-09-09T22:23:59Z

**Steps:**
  1. Authenticated caller, owner of the video, calls `GET /videos/:id/stream-url` for a video whose `status` is `draft`, `processing`, or `error`
    - expect: `404` response
