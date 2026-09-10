# phase-03-videos — Progress

**Status:** in_progress
**SIs:** 6/8 completed

### SI-03.1 — Storage module (cliente S3-compatible)
- **Status:** completed
- **Tests:** 4 passing
- **Observations:**
  - Serviço `minio` foi adicionado ao `compose.yaml` nesta SI (fora do escopo original, que reservava isso para SI-03.8) porque o teste desta própria SI (`real @aws-sdk/client-s3 lib against local MinIO test config`) exige uma instância MinIO real rodando — dependência técnica que precede a ordem do plano. SI-03.8 vai cuidar apenas de `video-worker` + docs; `minio` já está pronto.
  - Bucket `streamtube` criado manualmente via `minio/mc` (MinIO não cria bucket automaticamente).
  - Corrigido bug pré-existente de quoting em `MAIL_FROM` no `.env.example` (ângulo-colchetes sem aspas, documentado como "Wrong" no próprio `CLAUDE.md`) ao criar `.env` — fora do escopo desta SI, mas trivial e no mesmo arquivo tocado.
  - Porta do host do serviço `db` remapeada de `5432` para `5433` em `compose.yaml` (havia um container Postgres não relacionado já ocupando 5432 na máquina) — porta interna do container continua `5432`, sem impacto em `DB_HOST=db`/`DB_PORT=5432`.

### SI-03.2 — Fila de processamento em segundo plano (pg-boss)
- **Status:** completed
- **Tests:** 3 passing
- **Observations:**
  - `pg-boss@12.30.0` (última versão) é um pacote ESM puro (`"type": "module"`) — `import` estático falha no `require()` do Jest ("Cannot use import statement outside a module"). Tentativa 1 (dynamic `import()` dentro de `onModuleInit`) ainda falhou porque o Jest CJS não roda `import()` nativo sem a flag `--experimental-vm-modules`. Resolvido fazendo downgrade para `pg-boss@11.1.2` (última major ainda CommonJS), com API idêntica (`createQueue`/`send`/`work`) — fix na raiz, sem precisar mexer na config global do Jest.
  - Descoberto de passagem: `Test.createTestingModule({...}).compile()` do NestJS **não** roda hooks `onModuleInit` sozinho — precisa de `await moduleRef.init()` explícito. Sem isso, `QueueService.boss` nunca era inicializado nos testes. Ambos os specs (`queue.module.spec.ts`, `queue.service.spec.ts`) foram ajustados para chamar `.init()` após `.compile()`.

### SI-03.3 — Pipeline de processamento de vídeo (metadados + thumbnail)
- **Status:** completed
- **Tests:** 3 passing
- **Observations:**
  - `ffmpeg`/`ffprobe` não estavam instalados na imagem de dev (`Dockerfile.dev`) — adicionado `ffmpeg` ao `apt install` (pacote Debian inclui os dois binários) e reconstruída a imagem (`docker compose up -d --build nestjs-api`). Necessário para esta SI mesmo antes da SI-03.4 (worker dedicado), já que o teste desta própria SI roda `fluent-ffmpeg` de verdade.
  - `screenshots()` do `fluent-ffmpeg` não funciona com streams de entrada — `VideoProcessingService` baixa o objeto do storage para um arquivo temporário local (`fs/promises` + `stream/promises pipeline`) antes de rodar `ffprobe`/`screenshots()`, e limpa os arquivos temporários no `finally`.
  - Teste usa um vídeo de fixture sintético gerado on-the-fly via `ffmpeg`'s `lavfi testsrc` (2s, 320x240) em vez de committar um binário de vídeo no repo.
  - `@types/fluent-ffmpeg` instalado como devDependency para tipagem do `FfprobeData`.

### SI-03.4 — Worker de vídeo (processo dedicado)
- **Status:** completed
- **Tests:** 23 passing (main.spec.ts: 4; queue.service.spec.ts: 5, 2 novos; video-status.service.integration-spec.ts: 3; video.entity.integration-spec.ts: 9; videos.module.spec.ts: 1 — os últimos 4 arquivos foram re-rodados por terem sido afetados pelas colunas novas)
- **Observations:**
  - Estendida a entidade `Video` (SI-03.5) com 4 colunas que o plano tinha deixado explicitamente "fora de escopo" para `/implement` resolver quando a necessidade funcional aparecesse: `storage_key` (not null — TD-01/TD-06), `thumbnail_key` (nullable — TD-04), `duration_seconds` (nullable — TD-04) e `metadata` jsonb (nullable — TD-04). O worker não conseguiria funcionar sem elas (precisa saber onde está o arquivo de origem e onde persistir o resultado da extração). Duas migrations novas geradas via CLI (`AddVideoStorageKeys`, `AddVideoMetadataFields`), nunca escritas à mão.
  - Criado `VideoStatusService` (`src/videos/video-status.service.ts`) — não estava no plano como artefato explícito, mas é o único jeito limpo de o worker (processo standalone, sem controller) e o futuro endpoint de upload (SI-03.6) compartilharem a lógica de transição de status sem duplicar queries. Exportado por `VideosModule`.
  - Estendido `QueueService` (SI-03.2, já completa) com um novo método `workWithMetadata()` que passa `{ includeMetadata: true }` ao `pg-boss`, expondo `job.retryCount`/`job.retryLimit` ao handler — necessário para o worker saber quando está na última tentativa antes do job falhar definitivamente (per TD-10). O método `work()` original não foi alterado (mantém a assinatura e o comportamento já testado pela SI-03.2 intactos); `workWithMetadata()` é aditivo.
  - **Dois bugs pegos no fix-loop, ambos documentados para não se repetirem:**
    1. `worker/main.spec.ts` usava `await import('./main.js')` para carregar o entrypoint dentro do teste — falhou com `"A dynamic import callback was invoked without --experimental-vm-modules"` (o Jest deste projeto roda em CJS puro). Mesma classe de problema ESM/CJS já visto com `pg-boss` na SI-03.2. Corrigido trocando por `require('./main')` (com `eslint-disable-next-line` pontual para `no-require-imports`, já que é a única forma correta de recarregar um módulo com efeito colateral de bootstrap dentro de um teste CJS).
    2. Depois do fix acima, o teste "registers a workWithMetadata handler" falhava com 0 chamadas registradas — causa: `beforeEach` chamava `jest.clearAllMocks()`, que limpava também o histórico de chamada do `workWithMetadata` (invocado uma única vez, no `beforeAll`, durante o bootstrap). Corrigido substituindo por `mockClear()` individual nos mocks que realmente precisam de reset por teste, preservando o histórico do `workWithMetadata`.
  - `Dockerfile.dev` **não** precisou de mudança nesta SI — o `ffmpeg`/`ffprobe` já tinha sido instalado na SI-03.3 (a imagem de dev é compartilhada entre `nestjs-api` e o futuro serviço `video-worker`, sem multi-stage build). O item "adicionar stage/target video-worker ao Dockerfile" do plano não se aplica à convenção real deste projeto — não há stages/targets, só uma imagem de dev com `command:` diferente por serviço (isso é trabalho da SI-03.8, ao adicionar o serviço no `compose.yaml`).
  - Adicionados os scripts `worker:start` e `worker:start:dev` ao `package.json`, usando `nest start --entryFile worker/main` (espelhando o par `start`/`start:dev` já existente).

### SI-03.5 — Entidade Video: identificador público único, ownership e ciclo de status
- **Status:** completed
- **Tests:** 8 passing
- **Observations:**
  - Implementada fora de ordem em relação à listagem do arquivo do plano: o `/plan-build --rebuild` (incorporando a TD-10) passou a fazer SI-03.4 (worker) depender de SI-03.5 (antes não dependia) — pelo Dependency Map atualizado, SI-03.5 é raiz e precisa rodar antes de SI-03.4. Seguido o Dependency Map/campo Dependencies, não a ordem de leitura do arquivo.
  - `nanoid@^3.3.8` escolhido deliberadamente em vez da major mais recente (v5/v6) — nanoid v4+ é ESM-only; v3.x ainda publica build CommonJS (`require` condition em package.json), evitando o mesmo problema de `"Cannot use import statement outside a module"` já visto com `pg-boss` na SI-03.2.
  - `public_id` gerado via hook `@BeforeInsert()` na própria entidade (em vez de na camada de serviço) — mantém a invariante "todo Video tem public_id" contida na entidade, já que nenhum service ainda existe nesta SI (será criado em SI-03.6).
  - `cleanAllTables()` (helper compartilhado em `src/test/create-test-data-source.ts`) atualizado para apagar `videos` antes de `channels`/`users` — sem isso, qualquer teste futuro que crie um `Video` quebraria o cleanup de outras suítes por violação de FK.

### SI-03.6 — Endpoint de upload (protocolo tus, autenticação e validação)
- **Status:** completed
- **Tests:** 15 passing (video-upload.service.integration-spec.ts: 5; videos.module.spec.ts: 1; channels.service.integration-spec.ts: 4, 2 novos de `findByUserId`; video-upload.e2e-spec.ts: 5)
- **Observations:**
  - `@tus/server`/`@tus/s3-store` são mais um caso da classe recorrente de incompatibilidade ESM/Jest já vista com `pg-boss` (SI-03.2) e `nanoid` (SI-03.5), mas desta vez o pacote em si é irremovível (é a própria decisão TD-06) — resolvido com config de Jest em vez de trocar dependência. Cadeia de causa: `@tus/server` importa `srvx` (dependência transitiva, também ESM-only) → `srvx/dist/adapters/node.mjs` quebra o parser do `jest-runtime` com `SyntaxError: Cannot use import statement outside a module`. `transformIgnorePatterns` sozinho não resolve — apenas desliga o "ignore" do Jest, mas o arquivo ainda precisa de um transformer real para converter `import`/`export` em `require`. Tentativa com `ts-jest` (mesmo com override inline de `tsconfig.module: "commonjs"`) falhou silenciosamente: o compilador TypeScript trata a extensão `.mjs` como ESM incondicional (`impliedNodeFormat`), ignorando a opção `module` do override — `ts-jest` roda sem erro mas devolve o arquivo sem transformar nenhum `import`. Resolvido com um transformer Jest dedicado (`nestjs-project/jest-esm-transform.js`) usando `@babel/core` + `@babel/plugin-transform-modules-commonjs` (nova devDependency, pinada em `^7` por conflito de peer-dependency com a v8 já presente transitivamente) registrado só para o padrão `^.+\.mjs$`, mantendo `ts-jest` para `.ts`/`.js`. Aplicado em `package.json` (`jest.transform`) e `test/jest-e2e.json`; `transformIgnorePatterns: ["/node_modules/(?!(@tus|srvx)/)"]` continua necessário nos dois.
  - Descoberto durante o e2e: `@tus/server` v2.4.5 embrulha o `req`/`res` do Express no adapter `srvx` antes de invocar os hooks (`onUploadCreate`/`onUploadFinish`) — o objeto `req` recebido no hook não é o mesmo `req` do Express onde `TusAuthMiddleware` grava `req.user`, é um `NodeRequest` do `srvx`. O valor original é acessível via `req.runtime.node.req` (back-reference documentada informalmente no próprio código-fonte do `srvx`, sem tipos públicos). Resolvido com um helper `getAuthenticatedUser(req)` em `TusServerMiddleware` que navega essa referência em vez de castar `req` diretamente para `AuthenticatedRequest`.
  - `upload.id` (identificador interno do `@tus/s3-store`, único dado estável disponível tanto em `onUploadCreate` quanto em `onUploadFinish`) usado como `storage_key` do `Video` — evita depender de `upload.storage.path`, cuja disponibilidade no momento do hook não é garantida pela documentação do tus.
  - Adicionado `ChannelsService.findByUserId(userId)` (usa `findOneByOrFail`) — necessário para `VideoUploadService.createDraft` resolver o `channel_id` do caller autenticado a partir do `user_id` do JWT.
  - Três novas `DomainException` subclasses (`UploadUnauthenticatedException`, `UploadInvalidFileTypeException`, `UploadContentValidationFailedException`) seguindo o padrão já estabelecido na Fase 02.
  - Autenticação re-implementada na camada de middleware (`TusAuthMiddleware`, reaproveitando `JwtService`/`BEARER_PREFIX`/`JwtPayload` do guard de auth já existente) porque o `tus` é montado como middleware Express puro (via `NestModule.configure()`), fora do pipeline de Guards/Controllers do Nest — decisão já registrada em TD-06.
  - Corrigidos dois bugs no próprio `test/video-upload.e2e-spec.ts` (escrito nesta SI) durante o fix-loop, depois que o transformer ESM parou de mascarar os testes reais: (1) o teste `upload-metadata-invalida-400-sem-draft` lia `res.body.error`, mas o `@tus/server` não seta `Content-Type: application/json` na resposta de erro (`toTusError`) — corrigido para `JSON.parse(res.text).error`, mesmo padrão já usado nos outros testes do arquivo; (2) as requisições `PATCH` de continuação do upload não enviavam o header `Authorization` — como `TusAuthMiddleware` protege tanto a rota de criação quanto a de `:id`, toda requisição ao mount tus exige o token, então os `PATCH` também precisam do header.
  - **Débito de lint pré-existente confirmado, fora de escopo desta SI:** `npm run lint` reporta 156 erros / 40 warnings, mas nenhum é novo — todos em arquivos não tocados nesta sessão (`src/channels/channels.service.ts` linhas 12-16, `channels.service.spec.ts`, `domain-exception.filter.spec.ts`, `validation-exception.filter.spec.ts`, `env.validation.integration-spec.ts`, `mail.service.integration-spec.ts`, `users.service.integration-spec.ts`, `test/auth.e2e-spec.ts`) ou seguindo deliberadamente o mesmo padrão já estabelecido em `test/*.e2e-spec.ts` (6 erros `no-unsafe-member-access`/`no-unsafe-assignment` em `test/video-upload.e2e-spec.ts`, idênticos em forma aos já presentes em `auth.e2e-spec.ts`). Como "lint passa" é um critério do Definition of Done, isso precisa de uma decisão explícita do usuário (aceitar a dívida como está, ou abrir uma tarefa dedicada de limpeza) antes da verificação final da fase.

### SI-03.7 — Endpoints de streaming e download (URLs pré-assinadas)
- **Status:** pending
- **Tests:** no tests
- **Observations:** none

### SI-03.8 — Topologia Docker Compose para nova infraestrutura
- **Status:** pending
- **Tests:** no tests
- **Observations:** none
