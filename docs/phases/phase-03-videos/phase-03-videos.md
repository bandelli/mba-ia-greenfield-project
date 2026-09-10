---
kind: phase
name: phase-03-videos
test_specs_aware: true
sources_mtime:
  docs/phases/phase-03-videos/context.md: "2026-09-09T17:57:48"
  docs/decisions/technical-decisions-phase-03-videos.md: "2026-09-09T14:15:19"
  docs/decisions/technical-decisions-openapi-docs-nestjs.md: "2026-09-07T21:58:17"
---

# Phase 03 — Upload e Processamento de Vídeos

## Objective

Implementar o serviço de armazenamento de arquivos (vídeos e thumbnails) e de processamento em segundo plano (filas), o upload de vídeos com suporte a arquivos de até 10GB sem impacto na performance com pré-cadastro automático do vídeo como rascunho ao iniciar o upload, o processamento automático do vídeo após upload (extração de duração e metadados e geração automática de thumbnail) com o ciclo de status do vídeo (rascunho → processando → pronto/erro) e tratamento de falha de processamento, a geração de URL única por vídeo sem conflito com outros vídeos, e a reprodução via streaming e o download do vídeo pelo usuário — entregando upload de até 10GB funcional, processamento automático do vídeo, streaming funcionando e URLs únicas geradas.

---

## Step Implementations

### SI-03.1 — Storage module (cliente S3-compatible)

**Description:** Cria o serviço de armazenamento de arquivos (vídeos e thumbnails) sobre `@aws-sdk/client-s3`, configurável para MinIO (dev) ou S3 real (prod) sem mudança de código.

**Technical actions:**

1. Criar `nestjs-project/src/storage/storage.config.ts` — factory `registerAs('storage', ...)` com `endpoint`, `forcePathStyle`, `region`, `bucket`, credenciais via env (per `phase-03-videos/TD-01`, seguindo a convenção `registerAs` de `phase-01-configuracao-base/TD-03`)
2. Adicionar as chaves de storage ao schema Joi de `env.validation.ts` (per `phase-01-configuracao-base/TD-02`)
3. Criar `nestjs-project/src/storage/storage.service.ts` — `StorageService` encapsulando `S3Client` (`putObject`, `getObject`, `deleteObject`) e `@aws-sdk/s3-request-presigner` (`getPresignedUrl`) (per `phase-03-videos/TD-01`)
4. Criar `nestjs-project/src/storage/storage.module.ts` — `StorageModule` com `ConfigModule.forFeature(storageConfig)` e export de `StorageService`
5. Registrar `StorageModule` em `AppModule`

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `StorageModule` | Unit: compilation test | `storage.module.spec.ts` |
| `StorageService` | Unit: real `@aws-sdk/client-s3` lib against local MinIO test config | `storage.service.spec.ts` |

**Dependencies:** none

**Acceptance criteria:**

- `StorageService.putObject` com um buffer válido armazena o objeto no bucket configurado e retorna a chave gerada.
- `StorageService.deleteObject` remove um objeto existente do bucket.
- `StorageService.getPresignedUrl` para uma chave existente retorna uma URL assinada válida por tempo limitado.
- A mesma configuração (`endpoint` + `forcePathStyle`) funciona tanto contra MinIO (dev) quanto contra um endpoint S3-compatible de produção, sem branching de código (per `phase-03-videos/TD-01`).

---

### SI-03.2 — Fila de processamento em segundo plano (pg-boss)

**Description:** Cria o serviço de fila em segundo plano sobre `pg-boss`, reaproveitando a conexão PostgreSQL já operada pelo projeto.

**Technical actions:**

1. Criar `nestjs-project/src/queue/queue.config.ts` — factory `registerAs('queue', ...)` reaproveitando a string de conexão do `databaseConfig` (per `phase-03-videos/TD-02`, `phase-01-configuracao-base/TD-03`)
2. Criar `nestjs-project/src/queue/queue.service.ts` — `QueueService` encapsulando `pg-boss` (`start()`, `send()`, `work()`) (per `phase-03-videos/TD-02`)
3. Criar `nestjs-project/src/queue/queue.module.ts` — `QueueModule` com export de `QueueService`
4. Registrar `QueueModule` em `AppModule`

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `QueueModule` | Unit: compilation test | `queue.module.spec.ts` |
| `QueueService` | Unit: real `pg-boss` lib against test Postgres config | `queue.service.spec.ts` |

**Dependencies:** none

**Acceptance criteria:**

- `QueueService.send('video.uploaded', payload)` insere um job na fila (per `phase-03-videos/TD-02`, produtor definido em `phase-03-videos/TD-09`).
- Um job registrado via `QueueService.work` é processado por um handler ativo.
- Um job cujo handler lança exceção é reenviado automaticamente até o limite de retry/backoff configurado por `pg-boss` (per `phase-03-videos/TD-02`).

---

### SI-03.3 — Pipeline de processamento de vídeo (metadados + thumbnail)

**Description:** Cria o serviço que extrai duração/metadados via `ffprobe` e gera a thumbnail automática via `fluent-ffmpeg`, aplicando a regra de seleção de frame fixada em Revision.

**Technical actions:**

1. Criar `nestjs-project/src/processing/video-processing.service.ts` — `VideoProcessingService.extractMetadata(key)` chamando `ffmpeg.ffprobe` sobre o objeto lido via `StorageService` (per `phase-03-videos/TD-04`)
2. Implementar `VideoProcessingService.generateThumbnail(key)` — `.screenshots({ timestamps: [...] })` capturando o frame em `min(1s, 10% da duração)`, persistindo a thumbnail via `StorageService.putObject` (per `phase-03-videos/TD-04` e sua Revision de 2026-09-08)
3. Criar `nestjs-project/src/processing/processing.module.ts` — `ProcessingModule` importando `StorageModule`, export de `VideoProcessingService`
4. Registrar `ProcessingModule` em `AppModule`

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `ProcessingModule` | Unit: compilation test | `processing.module.spec.ts` |
| `VideoProcessingService` | Unit: real `fluent-ffmpeg` lib against a fixture video file | `video-processing.service.spec.ts` |

**Dependencies:** SI-03.1 — `StorageService` fornece leitura do objeto original e escrita da thumbnail gerada.

**Acceptance criteria:**

- `VideoProcessingService.extractMetadata` retorna duração e metadados corretos para um arquivo de vídeo válido.
- `VideoProcessingService.generateThumbnail` captura o frame em `min(1s, 10% da duração)` do vídeo (per `phase-03-videos/TD-04` Revision, 2026-09-08).
- A thumbnail gerada é persistida no object storage via `StorageService.putObject`.

---

### SI-03.4 — Worker de vídeo (processo dedicado)

**Description:** Cria o entrypoint do worker dedicado que consome a fila `video.uploaded`, delega ao pipeline de processamento e reflete o resultado no ciclo de status do `Video` — isolando o processamento pesado do processo da API.

**Technical actions:**

1. Criar `nestjs-project/src/worker/main.ts` — bootstrap standalone (`NestFactory.createApplicationContext`) que registra `QueueService.work('video.uploaded', handler)` chamando `VideoProcessingService`; em caso de sucesso, atualiza `Video.status = 'ready'` (per `phase-03-videos/TD-03`; status per `phase-03-videos/TD-10`)
2. Adicionar stage/target `video-worker` ao `Dockerfile` do `nestjs-project/`, com `ffmpeg`/`ffprobe` instalados na imagem (per `phase-03-videos/TD-03`, `TD-04`)
3. Adicionar script `worker:start` ao `package.json`
4. Implementar o listener de conclusão do job (`pg-boss`'s `onComplete`/estado final `failed`) — quando o job `video.uploaded` esgota o `retryLimit` configurado em `phase-03-videos/TD-10`, atualiza `Video.status = 'error'` e persiste a última mensagem de falha em `Video.processingError` (per `phase-03-videos/TD-10`)

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `worker/main.ts` | Unit: bootstrap/compilation test — modelo de cobertura mais próximo enquanto não existe guia dedicado a entrypoints de worker (per nota em `## Testing Requirements` do context.md) | `main.spec.ts` |

**Dependencies:** SI-03.2 (fila), SI-03.3 (pipeline de processamento), SI-03.5 (entidade `Video` — status/processingError)

**Acceptance criteria:**

- O processo do worker inicia de forma independente do processo da API — falhas do worker não derrubam a API (per `phase-03-videos/TD-03`).
- Um job publicado em `video.uploaded` é consumido pelo worker e resulta em metadados extraídos, thumbnail gerada e `Video.status = 'ready'`.
- Um job cujo handler falha repetidamente até esgotar o `retryLimit` resulta em `Video.status = 'error'` com `Video.processingError` preenchido (per `phase-03-videos/TD-10`).

---

### SI-03.5 — Entidade Video: identificador público único, ownership e ciclo de status

**Description:** Cria a entidade `Video` com o identificador público opaco (`nanoid`), os campos de ownership (`userId`, `channelId`) fixados na Revision de `phase-03-videos/TD-06`, e o ciclo de status (`status`/`processingError`) decidido em `phase-03-videos/TD-10`.

**Technical actions:**

1. Criar `nestjs-project/src/videos/video.entity.ts` — colunas `userId` (uuid, FK → `User`) e `channelId` (uuid, FK → `Channel`), ambas `not null` (per `phase-03-videos/TD-06` Revision, 2026-09-08); coluna de identificador público via `nanoid` (per `phase-03-videos/TD-05`); coluna `status` (enum `draft`/`processing`/`ready`/`error`, not null, default `draft`) e coluna `processingError` (text, nullable) (per `phase-03-videos/TD-10`) — demais colunas (chaves de storage, duração/metadados) ficam fora do escopo desta fase (per a nota "This document decides the Video entity's status lifecycle... but NOT the rest of its schema" em `phase-03-videos`)
2. Criar migration TypeORM para a tabela `video`
3. Criar `nestjs-project/src/videos/videos.module.ts` — `VideosModule` com `TypeOrmModule.forFeature([Video])`
4. Registrar `VideosModule` em `AppModule`

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `Video` (entity) | Integration: constraints, defaults, unique index no identificador público, default de `status` | `video.entity.integration-spec.ts` |
| `VideosModule` | Unit: compilation test | `videos.module.spec.ts` |

**Dependencies:** none

**Acceptance criteria:**

- Inserir um `Video` sem `userId` ou sem `channelId` viola a constraint `not null`.
- Dois `Video`s nunca recebem o mesmo identificador público (unique index, per `phase-03-videos/TD-05`).
- O identificador público é curto e URL-safe (per `phase-03-videos/TD-05`).
- Um `Video` criado sem `status` explícito recebe o default `draft`; `processingError` é `null` por padrão (per `phase-03-videos/TD-10`).

---

### SI-03.6 — Endpoint de upload (protocolo tus, autenticação e validação)

**Description:** Monta o middleware tus resumível, exige autenticação, cria o rascunho `Video` com ownership imediato, aplica a validação de conteúdo em duas camadas (fast-reject + checagem autoritativa) e transiciona o status do vídeo para `processing` ao publicar o job de processamento.

**Technical actions:**

1. Montar `@tus/server` + `@tus/s3-store` como middleware Express dentro do `nestjs-api` (per `phase-03-videos/TD-06`), atrás de guard de autenticação reaproveitado de `phase-02-auth` (per `phase-03-videos/TD-06` Revision, 2026-09-08)
2. Implementar `onUploadCreate` — rejeita (400) quando o tipo declarado em `Upload-Metadata` falha o allow-list; caso passe, cria o rascunho `Video` (`status: draft`) gravando `userId`/`channelId` do caller autenticado (per `phase-03-videos/TD-06` Revision, `phase-03-videos/TD-09`; `status` default per `phase-03-videos/TD-10`)
3. Implementar `onUploadFinish` — roda `ffprobe` sobre o objeto completo (via `VideoProcessingService.extractMetadata`); em caso de falha, apaga o objeto S3 e o rascunho `Video` (422); em caso de sucesso, atualiza `Video.status = 'processing'` e publica o job `video.uploaded` via `QueueService.send` com `retryLimit: 3, retryBackoff: true` (per `phase-03-videos/TD-09`; status e política de retry per `phase-03-videos/TD-10`)
4. Mapear os erros `UPLOAD_INVALID_FILE_TYPE` (400), `UPLOAD_UNAUTHENTICATED` (401) e `UPLOAD_CONTENT_VALIDATION_FAILED` (422) no filtro de exceção de domínio herdado (per `phase-02-auth/TD-07`)

**Route:** POST /videos/uploads (sessão tus — múltiplos métodos tus montados no mesmo path)
**Test Specs:** see `nestjs-project/specs/video-upload.plan.md`
**Authorization:** Authenticated (per `phase-03-videos/TD-06` Revision, 2026-09-08)

**Tests:** _(empty — Middleware: E2E only per convenção do projeto, movido para /plan-test-specs spec)_

**Dependencies:** SI-03.1 (storage), SI-03.2 (fila), SI-03.5 (entidade Video)

**Acceptance criteria:**

- Uma sessão de upload sem caller autenticado retorna `401` com `errorCode: "UPLOAD_UNAUTHENTICATED"`.
- Uma sessão de upload com `Upload-Metadata` declarando um tipo fora do allow-list de vídeo retorna `400` com `errorCode: "UPLOAD_INVALID_FILE_TYPE"`, sem criar rascunho.
- Uma sessão de upload válida cria um rascunho `Video` com `status: draft` e `userId`/`channelId` do caller, antes de qualquer byte do arquivo trafegar.
- Um upload completo cujo conteúdo falha na checagem `ffprobe` retorna `422` com `errorCode: "UPLOAD_CONTENT_VALIDATION_FAILED"`, e remove tanto o objeto S3 quanto o rascunho `Video`.
- Um upload completo e válido atualiza `Video.status` para `processing` e publica o job `video.uploaded` na fila com retry limitado (per `phase-03-videos/TD-10`).

---

### SI-03.7 — Endpoints de streaming e download (URLs pré-assinadas)

**Description:** Expõe os endpoints que emitem URLs pré-assinadas de curta duração para reprodução via streaming e para download do vídeo processado, condicionado ao vídeo estar `ready`.

**Technical actions:**

1. Criar `nestjs-project/src/videos/videos.controller.ts` com `GET /videos/:id/stream-url` e `GET /videos/:id/download-url`, ambos chamando `StorageService.getPresignedUrl` (per `phase-03-videos/TD-07`)
2. Mapear o erro `404` quando o `Video` não existe ou quando `Video.status !== 'ready'` (per `phase-03-videos/TD-10`)

**Route:** GET /videos/:id/stream-url, GET /videos/:id/download-url
**Test Specs:** see `nestjs-project/specs/video-delivery.plan.md`
**Authorization:** Owner (per `## Technical Specifications` → Authorization Matrix; visibilidade pública/unlisted fica para a Fase 04)

**Tests:** _(empty — Controller: E2E only per convenção do projeto, movido para /plan-test-specs spec)_

**Dependencies:** SI-03.1 (storage), SI-03.5 (entidade Video)

**Acceptance criteria:**

- `GET /videos/:id/stream-url` para um vídeo do próprio usuário com `status: ready` retorna `200` com uma `url` pré-assinada válida por tempo limitado.
- `GET /videos/:id/download-url` para um vídeo do próprio usuário com `status: ready` retorna `200` com uma `url` pré-assinada válida por tempo limitado.
- `GET /videos/:id/stream-url` para um `id` inexistente retorna `404`.
- `GET /videos/:id/stream-url` para um vídeo do próprio usuário cujo `status` seja `draft`, `processing` ou `error` retorna `404` (per `phase-03-videos/TD-10`).

---

### SI-03.8 — Topologia Docker Compose para nova infraestrutura

**Description:** Estende o `compose.yaml` do `nestjs-project` com os serviços de infraestrutura introduzidos nesta fase (object storage e worker dedicado).

**Technical actions:**

1. Adicionar serviço `minio` ao `nestjs-project/compose.yaml`, na mesma rede padrão de `nestjs-api`/`db` (per `phase-03-videos/TD-08`)
2. Adicionar serviço `video-worker` ao `compose.yaml`, usando o stage/target criado em `SI-03.4` (per `phase-03-videos/TD-08`)
3. Atualizar `nestjs-project/CLAUDE.md` com a nova seção `## Services` documentando `minio` e `video-worker`

**Tests:** _(empty — Infra: configuração de compose, sem lógica testável em código)_

**Dependencies:** SI-03.1 (storage), SI-03.2 (fila), SI-03.4 (worker)

**Acceptance criteria:**

- `docker compose up` sobe `minio` e `video-worker` junto com os serviços existentes (`nestjs-api`, `db`, `mailpit`).
- `nestjs-api` e `video-worker` alcançam `minio` pelo nome do serviço Compose (`http://minio:9000`), nunca via `localhost`.
- O `nestjs-project/compose.yaml` permanece o único arquivo de orquestração do backend — `next-frontend/` continua com stack separada (per `phase-03-videos/TD-08`).

---

## Technical Specifications

### Data Model

#### Video

| Field | Type | Constraints |
|-------|------|-------------|
| userId | uuid | FK → User, not null — stamped in `onUploadCreate` at draft creation *(per phase-03-videos/TD-06 Revision, 2026-09-08)* |
| channelId | uuid | FK → Channel, not null — stamped in `onUploadCreate` at draft creation *(per phase-03-videos/TD-06 Revision, 2026-09-08)* |
| status | enum(`draft`, `processing`, `ready`, `error`) | not null, default `draft` — `draft` set in `onUploadCreate`; `processing` set when the validated upload is queued in `onUploadFinish`; `ready` set by the worker on successful metadata/thumbnail extraction; `error` set once `pg-boss`'s bounded retry is exhausted *(per phase-03-videos/TD-10)* |
| processingError | text | nullable — the last processing failure's message, populated only when `status = error`; cleared (`null`) whenever `status` is anything else *(per phase-03-videos/TD-10)* |

**Relations:** `Video` belongs to `User` and to `Channel` (many-to-one each) — ownership is assigned at draft creation, not later.
**Indexes:** _undetermined — the remaining `Video` schema (public identifier column, storage/thumbnail keys, duration/metadata fields, title) is explicitly out of scope for `phase-03-videos`'s decisions doc ("This document decides the Video entity's status lifecycle... but NOT the rest of its schema"). `/implement` resolves the remaining columns with the `typeorm` skill against the functional requirements already fixed by `phase-03-videos/TD-01` (storage), `TD-04` (processing/metadata + thumbnail), and `TD-05` (unique public identifier), without contradicting the ownership and status fields above._

### API Contracts

#### Upload session — tus protocol mount (SI-03.6)

**Mount:** tus 1.0 protocol middleware (`@tus/server` + `@tus/s3-store`), mounted at a dedicated upload route *(per phase-03-videos/TD-06)*. _Exact route path is not verbatim in TD-06's Recommendation prose; `/implement` fixes the concrete path during SI-03.6, following the project's existing REST namespace conventions._

**Request headers:**
- `Authorization`: required — the caller must be an authenticated user *(per phase-03-videos/TD-06 Revision, 2026-09-08)*
- `Upload-Metadata`: tus-standard comma-separated key/value pairs — carries the client-declared filename/filetype consumed by the `onUploadCreate` fast-reject check *(per phase-03-videos/TD-09)*

**onUploadCreate behavior:**
- Rejects (400) when `Upload-Metadata`'s declared file type/extension fails the video allow-list check, before the draft row is created *(per phase-03-videos/TD-09)*
- On pass: creates the draft `Video` row with `status: draft`, stamping `userId`/`channelId` from the authenticated caller *(per phase-03-videos/TD-06 Revision, 2026-09-08; `status` default per phase-03-videos/TD-10)*

**onUploadFinish behavior:**
- Runs `ffprobe` against the fully-uploaded object; on failure, deletes both the S3 object and the draft `Video` row created in `onUploadCreate` *(per phase-03-videos/TD-09)*
- On pass: transitions the `Video` row's `status` to `processing` and enqueues the `video.uploaded` job (see `### Events/Messages`) *(per phase-03-videos/TD-10; producer per phase-03-videos/TD-09)*

**Error responses:**
- 400 UPLOAD_INVALID_FILE_TYPE: declared file type fails the `onUploadCreate` allow-list check *(per phase-03-videos/TD-09)*
- 401 UPLOAD_UNAUTHENTICATED: caller not authenticated *(per phase-03-videos/TD-06 Revision)*
- 422 UPLOAD_CONTENT_VALIDATION_FAILED: `ffprobe` authoritative check fails after upload completes *(per phase-03-videos/TD-09)*

---

#### GET /videos/:id/stream-url (SI-03.7)

_Route inferred from TD-07's topic ("Media Delivery Mechanism for Streaming & Download") and the "Reprodução via streaming" capability — not verbatim in the Recommendation prose; confirm during `/implement`._

**Response 200:**
- url: string — short-lived presigned object-storage URL *(per phase-03-videos/TD-07)*

**Error responses:**
- 404: video not found, or `status != ready` *(per phase-03-videos/TD-10 — a `draft`/`processing`/`error` video has no playable object yet)*

---

#### GET /videos/:id/download-url (SI-03.7)

_Route inferred the same way as the stream-url endpoint above — not verbatim in TD-07's Recommendation prose._

**Response 200:**
- url: string — short-lived presigned object-storage URL *(per phase-03-videos/TD-07)*

**Error responses:**
- 404: video not found, or `status != ready` *(per phase-03-videos/TD-10)*

### Authorization Matrix

| Endpoint | Anonymous | Authenticated | Owner |
|----------|-----------|---------------|-------|
| Upload session (tus mount) | ✗ | ✓ | ✓ |
| GET /videos/:id/stream-url | _TBD¹_ | _TBD¹_ | ✓ |
| GET /videos/:id/download-url | _TBD¹_ | _TBD¹_ | ✓ |

¹ Public/unlisted video visibility is decided in Phase 04 ("Visibilidade do vídeo: público ou unlisted", per `docs/project-plan.md`'s Fase 04 scope) — not yet resolved by any `phase-03-videos` TD. Owner access is always allowed regardless of visibility.

### Error Catalog

| errorCode | HTTP | Trigger |
|-----------|------|---------|
| UPLOAD_INVALID_FILE_TYPE | 400 | Declared upload file type fails the `onUploadCreate` allow-list check *(per phase-03-videos/TD-09; errorCode follows the inherited domain-exception envelope, `phase-02-auth/TD-07`)* |
| UPLOAD_UNAUTHENTICATED | 401 | Upload session requested without an authenticated caller *(per phase-03-videos/TD-06 Revision, 2026-09-08)* |
| UPLOAD_CONTENT_VALIDATION_FAILED | 422 | `ffprobe` authoritative check fails in `onUploadFinish` after upload completes *(per phase-03-videos/TD-09)* |

### Events/Messages

#### video.uploaded (queued for processing)

**Payload:**

```json
{ "videoId": "uuid" }
```

**Producer:** upload endpoint's `onUploadFinish` hook (per `phase-03-videos/TD-06`, `TD-09`)
**Consumer:** Video Worker — dedicated process (per `phase-03-videos/TD-03`)
**Trigger:** fires once `onUploadFinish`'s authoritative content-validation check passes (per `phase-03-videos/TD-09`); `Video.status` transitions to `processing` at the same time (per `phase-03-videos/TD-10`)
**Delivery semantics:** at-least-once, via `pg-boss` retry/backoff/dead-letter primitives (per `phase-03-videos/TD-02`). Sent with a bounded retry policy — `retryLimit: 3`, `retryBackoff: true` — instead of `pg-boss`'s low defaults, so a transient failure self-heals without a full 10GB re-upload *(per phase-03-videos/TD-10)*.

The worker consumes this job to run `fluent-ffmpeg` metadata extraction and thumbnail generation — frame captured at `min(1s, 10% da duração)` (per `phase-03-videos/TD-04` and its 2026-09-08 Revision). On success, the worker sets `Video.status = ready`. On exhausted retries, a job-completion listener sets `Video.status = error` and persists the last failure's message in `Video.processingError` (per `phase-03-videos/TD-10`).

---

<!-- phase-a-complete -->

## Dependency Map

```
SI-03.1 (root)
├── SI-03.3 — depends on SI-03.1
│   └── SI-03.4 — depends on SI-03.2, SI-03.3, SI-03.5
├── SI-03.6 — depends on SI-03.1, SI-03.2, SI-03.5
├── SI-03.7 — depends on SI-03.1, SI-03.5
└── SI-03.8 — depends on SI-03.1, SI-03.2, SI-03.4
SI-03.2 (root, independent — also feeds SI-03.4, SI-03.6, SI-03.8 above)
SI-03.5 (root, independent — also feeds SI-03.4, SI-03.6, SI-03.7 above)
```

---

## Deliverables

- [ ] SI-03.1 — Storage module (cliente S3-compatible)
- [ ] SI-03.2 — Fila de processamento em segundo plano (pg-boss)
- [ ] SI-03.3 — Pipeline de processamento de vídeo (metadados + thumbnail)
- [ ] SI-03.4 — Worker de vídeo (processo dedicado)
- [ ] SI-03.5 — Entidade Video: identificador público único, ownership e ciclo de status
- [ ] SI-03.6 — Endpoint de upload (protocolo tus, autenticação e validação)
- [ ] SI-03.7 — Endpoints de streaming e download (URLs pré-assinadas)
- [ ] SI-03.8 — Topologia Docker Compose para nova infraestrutura

**Full test suites:**

- [ ] Backend unit tests pass (`cd nestjs-project && npm test`)
- [ ] Backend integration tests pass (`cd nestjs-project && npm run test:integration`)
- [ ] Backend E2E tests pass (`cd nestjs-project && npm run test:e2e`)
- [ ] Type/compilation checks pass (`cd nestjs-project && npx tsc --noEmit`)
- [ ] Lint passes (`cd nestjs-project && npm run lint`)
