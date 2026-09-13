# phase-04-video-channel-management — Progress

**Status:** completed
**SIs:** 19/19 completed

### Cross-cutting: revisão final da fase antes do commit (após SI-04.11b, 2026-09-13)

A pedido do usuário ("faça a revisão, leia o que é pedido e veja se está tudo ok"), rodei duas passadas de verificação sobre todo o trabalho das SIs 04.9–04.11 antes de fechar a fase:

**1. Cruzamento manual contra os "Rendered states" do UI Contract.** Reli as 4 seções `Rendered states` do plano (`tela-de-edição-de-vídeo`, dashboard, Channel Settings, página pública) e percebi que **nenhuma das 4 telas tinha `loading.tsx`** — incluindo a tela de edição de vídeo, da SI-04.8 (sessão anterior). O `AC`/deliverable de cada tela explicitamente pede "renderiza loading, empty, success e error states", e o UI Contract de cada uma descreve um skeleton específico ("skeleton rows", "skeleton form", "skeleton banner + video grid"). Corrigido para as 3 telas desta leva de SIs (04.9/04.10/04.11) — a de vídeo (SI-04.8) é gap pré-existente, fora do escopo desta sessão, sinalizado ao usuário em vez de corrigido silenciosamente.
  - Adicionado o primitivo shadcn `skeleton.tsx` (via `npx shadcn@latest add skeleton`; corrigido o import quebrado `from "cn"` → `@/lib/utils`, mesmo problema já visto em outros scaffolds desta fase; removida a dependência `cn` não utilizada do `package.json`).
  - Criados `app/dashboard/videos/loading.tsx`, `app/dashboard/channel/loading.tsx`, `app/channel/[nickname]/loading.tsx`, cada um espelhando a estrutura real da tela correspondente.
  - **Efeito colateral real descoberto e confirmado (dev E build de produção, não só dev):** adicionar `loading.tsx` à página pública do canal faz o Next.js (App Router, streaming/Suspense) sempre responder HTTP 200 para um nickname inexistente, mesmo chamando `notFound()` — o shell inicial já comita o status 200 antes do erro ser descoberto durante o streaming. O conteúdo "not found" renderiza certo pro usuário; só o status de transporte HTTP fica errado (relevante para SEO/crawlers, já que essa é a única tela anônima da fase). Perguntei ao usuário se mantinha o `loading.tsx` (cumprindo o requisito de skeleton) ou removia só dessa tela (mantendo o 404 real) — optou por manter o skeleton. Documentado no próprio teste e2e (`channel-public-page.e2e-spec.ts`), que passou a checar o conteúdo renderizado em vez do status HTTP bruto.
  - Também rodei o gate de Definition of Done que faltava: `npm run build` (produção) do `next-frontend` — nunca tinha sido testado fora do dev server nesta fase. Passou limpo, confirmado com as 19 rotas esperadas.

**2. `/code-review high`** sobre o diff completo da fase (rodado em background). 9 achados reais confirmados, todos corrigidos:
  - `page.tsx` do dashboard e da página pública: `Number(params.page) || 1` deixava passar `page` negativo/fracionado sem validação (`-1 || 1` é `-1` em JS, já que `-1` é truthy) — extraído `resolvePageParam()` compartilhado em `lib/utils.ts`, usado nos dois.
  - `formatRelativeTime`: bug de arredondamento em fronteira de unidade — "59m59s atrás" virava "60 minutes ago" em vez de "1 hour ago" (mesmo problema em "6d23h58m" → "7 days ago" em vez de bater a semana). Reescrito para, após arredondar, verificar se o valor "estourou" pra próxima unidade maior e subir de unidade nesse caso. Confirmado com 16 testes novos em `lib/__tests__/utils.test.ts` (arquivo que não existia — a função nunca tinha teste).
  - `channel-settings-form.tsx`: a confirmação "Channel updated" ficava visível mesmo depois do usuário editar o formulário de novo sem re-submeter (RHF's `isSubmitSuccessful` não reseta em mudança de campo, só em novo submit). Corrigido chamando `reset(values, {keepIsSubmitSuccessful: true})` no sucesso do submit (rebaseline do `isDirty` sem esconder a confirmação) e gating a mensagem com `isSubmitSuccessful && !isDirty`. Teste de regressão adicionado.
  - `video-dashboard-list.tsx` e `channel-public-page.tsx`: estado vazio usava `videos.length === 0` em vez de `total === 0` — uma página fora do intervalo (`?page=99` com resultado vazio mas canal com vídeos de verdade) mostrava incorretamente "nenhum vídeo enviado ainda" / "sem vídeos públicos". Corrigido nos dois + testes de regressão.
  - `video-dashboard-list.tsx`: o campo de busca usava `defaultValue` (não controlado) sem re-sincronizar quando a URL muda externamente (voltar/avançar do browser não remonta o componente) — ficava mostrando texto de busca obsoleto. Corrigido com `key={searchParams.get("search") ?? ""}` forçando remount quando o parâmetro muda; teste de regressão adicionado.
  - `thumbs-up-icon.tsx`: criado na SI-04.9a mas nunca usado de verdade — o contador de "likes" renderizava só um `•` sem ícone. Corrigido para usar o ícone, como já era feito para views/comments na mesma linha.
  - `mocks/handlers/channels.ts`: tentei tipar os envelopes de erro (409/404) via `HttpResponse.json<ApiErrorEnvelope>` per a convenção documentada do projeto — quebrou `tsc --noEmit` (MSW infere um único tipo de corpo de resposta por handler; misturar dois genéricos explícitos no mesmo resolver colide). Revertido para o mesmo padrão já usado em `videos.ts` (branch de erro sem generic explícito) — documentado no código por quê, já que a convenção escrita não é 100% alcançável na prática com múltiplos branches de resposta no mesmo handler.

Suite final após todas as correções: Vitest 135/135 (frontend, +20 desde o fechamento inicial da fase), Playwright 30/30, `tsc --noEmit`/lint limpos nos dois subprojetos, `npm run build` (produção) confirmado.

### Cross-cutting: Figma reference pre-fetch (after SI-04.9.0, 2026-09-13)

Usuário comprou créditos no Figma, liberando o rate limit do MCP (Starter plan). A pedido do usuário ("colete tudo o que precisa para completar o desafio... para que não tenhamos mais necessidade do Figma durante o desenvolvimento"), rodei `get_design_context` nos 3 nodes das telas restantes da fase (dashboard `39:652`, Channel Settings `39:1384`, Página pública do canal `39:30`) e baixei os 22 ícones SVG novos identificados neles — tudo salvo em `figma-assets/` (`raw/*.reference.txt` + `icons/*.svg`), indexado por `figma-reference.md` (sibling deste arquivo).

Isso corrigiu um achado da SI-04.9.0: o `UploadVideoButton` tinha sido classificado (via screenshot) como já alinhado com `variant="destructive" size="lg"` (`rounded-full`) — o node real é `rounded-[8px]`, que é drift também. `frontend-drift-report.md` foi atualizado com a correção e uma segunda bullet `auto-Edit` (`+size 'action'`).

`figma-reference.md` também registra achados cross-screen que não cabem no drift-report formal (Channel Settings e Página pública têm Reused DS list vazia): 3 formatos de input diferentes na fase (incluindo um padrão de label flutuante em Channel Settings, diferente da convenção estabelecida TD-04), 3 formatos de chip diferentes, e o botão Subscribe da página pública — todos marcados para decisão do usuário na respectiva SI de visual shell, não resolvidos silenciosamente aqui.

Nenhum arquivo em `next-frontend` foi alterado (só documentação em `docs/`).

### Cross-cutting: code review pass (after SI-04.11.0)

Rodei `/code-review` sobre todo o trabalho da fase (SIs 04.1–04.11.0) a pedido do usuário. 10 achados confirmados; corrigidos 8 (2 adiados por decisão explícita — ver abaixo). Nenhuma SI específica "possui" esta correção; toca código de várias SIs já concluídas.

**Corrigidos:**
- `VideoPublicationService.publish()` sobrescrevia `published_at` a cada chamada, mesmo em vídeo já publicado — corrigido com `??=` (set once). Adicionada `VideoMissingTitleException` (400 `VIDEO_MISSING_TITLE`) — publicar sem título agora é rejeitado no backend (antes só o Zod do frontend impedia isso, contornável por chamada direta à API).
- Busca de vídeo por título (`ChannelsService.findVideosForOwner`) era vulnerável a wildcards SQL não escapados (`%`/`_`) no `ILIKE` — adicionado `escapeLikePattern`.
- `limit` de paginação (`find-owner-videos-query.dto.ts`, `find-public-videos-query.dto.ts`) não tinha teto — adicionado `@Max(100)`.
- `VideosController`/`ChannelsController` retornavam as entidades `Video`/`Channel` cruas, vazando `storage_key`, `metadata`, `processing_error`, `user_id` etc. — adicionados mappers `toVideoResponse`/`toThumbnailResponse`/`toChannelResponse` restringindo a resposta aos campos já documentados no schema OpenAPI.
- Frontend: `as never` no body do PATCH de vídeo (`video-edit-form.tsx`) apagava a checagem de tipos — substituído por uma interface local `VideoEditPayload` totalmente tipada (a causa raiz — `UpdateVideoDto` vazio por limitação do `ts-node`/plugin do swagger — é debt aceito, documentado desde a SI-04.6).
- Extraído `lib/api/bff-response.ts` (`upstreamErrorResponse`) para eliminar a duplicação do bloco de forward de erro nas 7 Route Handlers de vídeo/canal.
- Testes atualizados/adicionados para cobrir os fixes: unit (`video-publication.service.spec.ts`: título ausente, título em branco, não sobrescrever `published_at`) + e2e (`video-edit-publish.e2e-spec.ts`: `rejeitar-publicacao-de-video-sem-titulo`, `nao-sobrescrever-published_at-ao-republicar`; os testes de publish existentes precisaram passar a incluir `title` no body, já que antes dependiam do gap para passar com vídeo sem título).
- Contrato OpenAPI regenerado (só uma descrição de resposta mudou; nenhum shape de tipo mudou, já que os schemas documentados já eram os campos restritos — o bug era só o corpo real devolvido não bater com o já documentado).
- Suite completa confirmada verde após os fixes: backend 209/209 unit/integration + 82/82 e2e; frontend 97/97 Vitest; lint limpo nos dois.

**Adiados (decisão explícita, não pedidos como "bugs"):**
- `ChannelsService` acessa a entidade `Video` diretamente via `dataSource.getRepository(Video)` em vez de delegar a um serviço do domínio de vídeos — violação de Single Responsibility real, mas o fix correto exigiria `forwardRef()` entre `ChannelsModule`/`VideosModule` (dependência circular hoje unidirecional: `VideosModule` já importa `ChannelsModule`) — risco/escopo maior do que os demais itens.
- `Object.assign(video, dto)` sem whitelist explícito no service — hoje seguro porque `UpdateVideoDto` só tem 4 campos e o `ValidationPipe` global já descarta campos desconhecidos; sem exploit concreto no momento.

### SI-04.1 — Video entity: category, published_at, visibility columns
- **Status:** completed
- **Tests:** 11 passing
- **Observations:**
  - Descoberto drift pré-existente da Fase 03: a tabela `migrations` do banco de dev só tinha 2 linhas registradas, mas o schema de `videos` já estava completo (aplicado via `synchronize` em algum momento). Registrei as 3 migrations faltantes (`CreateVideos`, `AddVideoStorageKeys`, `AddVideoMetadataFields`) na tabela `migrations` — sem alterar nenhuma coluna/tabela — para destravar `migration:run` da minha migration nova. Ação confirmada com o usuário antes de executar.
  - A migration gerada pela CLI também adicionou FKs `videos.user_id → users.id` e `videos.channel_id → channels.id` que nunca existiam no banco (drift da Fase 03) — a entidade já declarava essas relações via `@ManyToOne`, então a CLI as incluiu no diff. Mantido como gerado (não editado manualmente).

### SI-04.2 — Video edit & publish endpoints
- **Status:** completed
- **Tests:** 22 passing (5 unit + 12 integration + 5 e2e)
- **Observations:**
  - Descoberto durante a autoria: a entidade `Video` nunca tinha colunas `title`/`description` (gap real de Data Model da própria Fase A). Adicionadas ambas como nullable, gerada migration `AddVideoTitleDescription` via CLI, teste de default adicionado, e a Data Model table do plano anotada retroativamente com nota explicando o gap.
  - Removidas as exceptions `INVALID_CATEGORY`/`INVALID_VISIBILITY` planejadas — seriam dead code, pois `@IsEnum` no DTO já é capturado pelo `ValidationExceptionFilter` genérico antes de chegar ao service. Todas as referências no plano (Error Catalog, API Contracts, UI Contracts, texto do SI) e nos specs foram substituídas por `VALIDATION_ERROR`.
  - E2E `publicar-video-pronto` falhou na primeira rodada (esperava 200, recebeu 201 — default do Nest para `@Post`). Corrigido adicionando `@HttpCode(200)` ao handler `publishVideo`, já que o endpoint transiciona um recurso existente em vez de criar um novo.

### SI-04.3 — Custom thumbnail upload endpoint
- **Status:** completed
- **Tests:** 14 passing (8 unit + 2 integration + 4 e2e)
- **Observations:**
  - Bug real descoberto: `nestjs-project/tsconfig.json` declara `"types": ["jest", "node"]` explicitamente, o que faz o TypeScript deixar de auto-incluir qualquer pacote em `@types/` que não esteja na lista — `@types/multer` (necessário para `Express.Multer.File`) nunca era carregado, mesmo depois de instalado. Corrigido adicionando `"multer"` à lista. `@types/multer` também precisou ser instalado (não estava no package.json).
  - Bug real descoberto: o `FileTypeValidator` nativo do Nest carrega o pacote ESM-only `file-type` dinamicamente para detectar magic numbers — sob Jest esse `import()` dinâmico falha (mesma classe de problema já documentada no `nestjs-project/CLAUDE.md` para `@tus/server`), fazendo TODO upload ser rejeitado com 400 independente do conteúdo real do arquivo. Corrigido com `fallbackToMimetype: true`, que também torna a validação mais resiliente em produção caso o carregamento ESM falhe lá também.
  - Rodada completa (unit + integration + e2e) confirmada após os dois fixes: 194/194 testes gerais + 70/70 e2e + tsc/lint limpos.

### SI-04.4 — Channel controller: own-channel read & edit
- **Status:** completed
- **Tests:** 14 passing (9 unit + 1 module compilation + 4 e2e)
- **Observations:** none

### SI-04.5 — Channel & dashboard video listings
- **Status:** completed
- **Tests:** 29 passing (9 unit + 11 integration + 1 module compilation + 8 e2e)
- **Observations:** none

### SI-04.6 — BFF route handlers: video endpoints
- **Status:** completed
- **Tests:** 10 passing (Vitest + MSW integration)
- **Observations:**
  - Ambiente `next-frontend` nunca tinha sido inicializado nesta sessão (sem container, sem `node_modules`, sem `.env.local`): subi o container (`docker compose up -d`), instalei deps, e criei `.env.local` com `API_URL=http://host.docker.internal:3000` (stacks Docker separadas, per next-frontend-openapi-typing/TD-02 Context) e um `SESSION_PASSWORD` de dev.
  - Gap real descoberto e corrigido: `nestjs-project/openapi.json` estava desatualizado (0 referências aos endpoints da Fase 04) — regerado via `npm run openapi:export`, sincronizado para `next-frontend/openapi.json` (`scripts/sync-openapi.sh`), e `lib/api/types.gen.ts` regenerado.
  - Gap real descoberto e corrigido: os `@ApiResponse({status:200})` de `VideosController`/`ChannelsController` (SIs 04.2–04.5) nunca declaravam `schema`, então o OpenAPI gerado tinha `content` vazio nos sucessos — isso bloquearia qualquer alias pass-through tipado em `contracts.ts` (dado que `openapi:export` roda sob `ts-node` puro, sem o plugin CLI do `@nestjs/swagger` que infere schema de entities/DTOs). Corrigido adicionando `schema` inline em cada resposta 200, no mesmo estilo já usado por `getStreamUrl`/`getDownloadUrl` (Fase 03).
  - `PATCH /api/videos/:id/thumbnail` (multipart) implementado via `request.formData()` + `upstream.PATCH(..., {body: formData})` — o body-serializer padrão do `openapi-fetch` detecta `instanceof FormData` e repassa sem reserialização, preservando conteúdo/boundary. Interpretação da frase "body unread" do Tech Spec: usei o client `upstream` tipado (per regra "no raw fetch" do projeto) em vez de um `fetch()` bruto com stream, já que este último violaria a regra do BFF.

### SI-04.7 — BFF route handlers: channel endpoints
- **Status:** completed
- **Tests:** 10 passing (Vitest + MSW integration)
- **Observations:**
  - Gap real descoberto e corrigido: `GET /channels/me/videos` e `GET /channels/:nickname/videos` (SI-04.5) nunca tinham `@ApiQuery` nos parâmetros — o `openapi.json` gerado declarava `query?: never` para essas rotas, impedindo o forward tipado de `page`/`limit`/`visibility`/`sort`/`search` no BFF. Corrigido com `@ApiQuery` por campo em ambos os métodos.
  - Gap real descoberto e corrigido: `GET /channels/me` e `GET /channels/me/videos` nunca documentavam nenhuma resposta de erro (nem o `401` que o próprio Tech Spec já listava) — sem isso, o tipo `error` do client `upstream` era `never`, quebrando o branch de erro do Route Handler. Corrigido adicionando `@ApiResponse({status: 401})` a ambos, seguindo o precedente já existente em `auth.controller.ts` (`/auth/me`, `/auth/logout`).
  - Observação não-bloqueante (fora de escopo desta SI): outros endpoints protegidos da Fase 04 (`updateVideo`, `publishVideo`, `replaceThumbnail`, `updateMe`) também não documentam `401`, mas já tinham outras respostas de erro documentadas, então não bloqueavam a tipagem do BFF — não foram alterados aqui, por consistência ficaria bom revisitar depois.
  - Suite completa de ambos os subprojetos confirmada verde após as mudanças (backend: 204 unit/integration + 78 e2e; frontend: 87 testes).

### SI-04.8.0 — Drift audit: Tela de edição de vídeo
- **Status:** completed
- **Tests:** no tests
- **Observations:**
  - Desvio documentado: a skill `figma:figma-implement-design` referenciada pelo plano/pela skill `/implement` não está instalada nesta sessão (`Skill` tool retornou "Unknown skill"). Como a lista de Reused DS components desta tela é vazia por construção (todo componente é novo, per o screen inventory), a etapa de invocar o Figma não teria efeito no resultado (sub-passo 4 da skill /implement itera "for each component in the Reused DS list" — zero iterações). Escrevi a seção do relatório diretamente (Quick scan zerado, sem seções H3), sem invocar nenhuma ferramenta Figma.
  - Criado `frontend-drift-report.md` (primeira audit-SI da fase) com frontmatter + seção `## Screen: tela-de-edicao-de-video`.

### SI-04.8a — Tela de edição de vídeo (visual shell)
- **Status:** completed
- **Tests:** no tests (visual shell)
- **Observations:**
  - Instalados 3 primitivos shadcn faltantes (`textarea`, `select`, `radio-group`) via `npx shadcn@latest add`; o scaffold gerado vinha com `import { cn } from "cn"` quebrado (pacote `cn` não é o alias do projeto) e ícones `lucide-react` (biblioteca não usada neste projeto) — corrigido reescrevendo os 3 arquivos para usar `@/lib/utils`, tokens do projeto (`text-body-lg`, `rounded-[var(--radius-*)]`, `bg-input-background`, etc.) e ícones próprios em `components/icons/`. Removida a dependência `cn` (não utilizada) do `package.json`.
  - Criados 8 novos ícones em `components/icons/` (camera, chevron-down, circle-check, copy, globe, image, link, play) — a maioria com o path SVG baixado diretamente do asset exportado pelo Figma (per a regra de fidelidade de ícones), exceto chevron-down/check que seguem o padrão genérico já estabelecido em `check-icon.tsx`.
  - Verificado visualmente via browser (dev server temporário) contra o screenshot do Figma — fidelidade alta dentro da tolerância do design system; nenhum erro de console.
  - `tsc --noEmit`, lint e suite completa do Vitest (87/87) confirmados verdes.

### SI-04.8b — Tela de edição de vídeo (lógica & wiring)
- **Status:** completed
- **Tests:** 15 passing (8 unit + 6 e2e Playwright + reaproveita cobertura BFF já existente)
- **Observations:**
  - Gap real descoberto e corrigido (bloqueante): não existia NENHUM endpoint `GET /videos/:id` em todo o backend (Fase 03 nem 04) — mas a SI exige "Server Component busca os dados iniciais do vídeo" e "verifica ownership do vídeo server-side, 404 caso não seja o dono", o que é impossível sem essa leitura. Adicionado `GET /videos/:id` (owner-only, reaproveita o mesmo schema de resposta de `PATCH /videos/:id`) + `VideoPublicationService.getOwnedVideo` + testes unit/e2e no backend + regeneração do contrato OpenAPI/tipos.
  - `page.tsx` convertido para Server Component assíncrono: `redirect("/login")` se não autenticado, `notFound()` se o vídeo não existe/não pertence ao usuário (chama `upstream.GET` diretamente, não via BFF — RSC pode usar `env.API_URL`/`upstream` diretamente per next-frontend/CLAUDE.md, evitando um round-trip HTTP redundante ao próprio BFF).
  - `video-edit-form.tsx` totalmente religado: `react-hook-form` + Zod (mirror client-side de `title` obrigatório/200, `description` opcional/5000, `category`/`visibility` enum), dois submits (`PATCH` para draft, `POST publish`), upload de thumbnail via `FormData` imediato na seleção do arquivo, mapeamento completo do Error Catalog → UX (VALIDATION_ERROR inline, THUMBNAIL_INVALID_FILE inline sob o controle de thumbnail, VIDEO_NOT_READY/VIDEO_NOT_FOUND via toast — `VIDEO_NOT_FOUND` também redireciona ao dashboard).
  - Instalado `sonner` (shadcn) para toasts — scaffold gerado também tinha bugs (ícones `lucide-react`, `next-themes` desnecessário já que o projeto usa só `prefers-color-scheme`) corrigidos antes do uso; `<Toaster />` adicionado ao `app/layout.tsx`.
  - 2 bugs reais encontrados e corrigidos durante a autoria do E2E: (1) o helper de login só aguardava a *request* de `/api/auth/login` ser enviada, não a *response* — o cookie de sessão ainda não existia quando a navegação seguinte acontecia, causando redirect prematuro para `/login`; corrigido para aguardar `waitForResponse`. (2) o atributo HTML `maxLength` no `Input`/`Textarea` truncava o texto digitado nos 200/5000 caracteres, impedindo o erro do Zod de disparar (o browser nunca deixava o valor ultrapassar o limite); removidos, validação fica só no Zod.
  - Suite completa confirmada verde após os fixes: 97/97 Vitest (frontend) + 6/6 Playwright + tsc/lint limpos; backend 206/206 unit/integration + 80/80 e2e (após a adição do GET).

### SI-04.9.0 — Drift audit: Dashboard de gerenciamento de vídeos do canal
- **Status:** completed
- **Tests:** no tests (audit-only)
- **Observations:**
  - Retomada após pausa por rate limit do Figma MCP (Starter): uma nova chamada `get_design_context` (node `39:767`) confirmou o limite ainda batido (mesmo erro não-transiente da sessão anterior). `whoami` funciona porque é isento de rate limit — não é sinal de reset.
  - Usuário optou por contornar sem esperar o reset: capturou e colou manualmente 4 screenshots do Figma desktop (SearchVideosInput com dimensões 256×38; header com Upload video + camera icon button; tela completa do dashboard 2×, incluindo os chips Filter/Public/Date). Audit concluído com base nesses screenshots em vez de `get_design_context` para os 2 componentes que faltavam — ver nota "Audit method note" no próprio `frontend-drift-report.md`.
  - Achados: `input.tsx` (SearchVideosInput) e `button.tsx` (chips Filter/Public/Date) classificados `drift relevante` — ambos demandam um shape `rounded-full` compacto que não existe hoje (Input não tem variantes; Button só tem `rounded-full` no size `lg`, com padding incompatível com chip). Decisão `auto-Edit` aditiva (nova variante/size) em vez de retune da base, já que `Input` é reaproveitado verbatim por `login-form.tsx`/`signup-form.tsx`/`forgot-password-form.tsx`/`video-edit-form.tsx` — mudar o valor base quebraria essas telas. `UploadVideoButton` (dentro do mesmo `button.tsx`) já bate com `variant="destructive" size="lg"` existente — nenhuma edição necessária para esse call site.
  - `icon-button.tsx` classificado `alinhado` — mas com ressalva: `VideoRowMenuButton` (node `39:884`, o menu de "⋮" por linha de vídeo) não apareceu visualmente em nenhum dos 3 screenshots do dashboard (linha completa e zoom), incluindo o já documentado na SI-04.8.0. Classificado `alinhado` por falta de evidência contrária, não por confirmação — recomendado re-check via `get_design_context` antes/durante SI-04.9b.
  - `brand-logo.tsx` classificado `alinhado` por raciocínio (mesmo header já validado visualmente na SI-04.8a), sem novo screenshot dedicado.
  - Sem calls do Figma MCP bem-sucedidas nesta SI (apenas a tentativa que confirmou o rate limit ainda ativo) — `skillNames`/gates do `figma-design-to-code` não se aplicam a este fluxo manual.
  - `frontend-drift-report.md` atualizado (append da seção `## Screen: dashboard-de-gerenciamento-de-videos-do-canal`). Nenhum arquivo em `next-frontend` alterado (audit-only, confirmado por escopo — nenhum comando de edição rodou sobre o subprojeto).

### SI-04.9a — Dashboard de gerenciamento de vídeos do canal (visual shell)
- **Status:** completed
- **Tests:** _(empty — shell smoke-gated by build AC, per SI's Tests section)_
- **Observations:**
  - Aplicadas as Decisions do `frontend-drift-report.md` (SI-04.9.0, já corrigido com dados reais do `get_design_context`): `button.tsx` ganhou os sizes `chip` (`rounded-full`, compacto — Filter/Public/Date) e `action` (`rounded-[var(--radius-2)]`, 8px — Upload video/paginação); `input.tsx` foi convertido para `cva` com uma variante `shape` (`default` mantém `rounded-[var(--radius-1)]` — zero mudança visual para login/signup/forgot-password/video-edit-form — e `pill` novo para o `SearchVideosInput`). `icon-button.tsx`/`brand-logo.tsx` ficaram como estavam (`skip`, já alinhados).
  - Descoberto durante a implementação (não estava no audit): os botões de seta da paginação (prev/next) usam `icon-button.tsx`, mas nenhuma das 3 variantes existentes (`default`/`outline`/`ghost`) reproduz o preenchimento sólido `bg-[#272727]` do Figma para esse caso — usei `variant="outline"` como aproximação em vez de adicionar uma 4ª variante, para não expandir o escopo desta SI além do que o audit já havia mapeado. Documentado aqui para revisão futura, não decidido silenciosamente.
  - Criados 10 ícones novos em `components/icons/`: `filter-icon`, `sort-icon`, `thumbs-up-icon`, `comment-icon`, `chevron-left-icon`, `chevron-right-icon`, `search-icon`, `plus-icon` (todos com o path SVG exato baixado do Figma) e `more-vertical-icon` (sem asset do Figma para o kebab menu do vídeo — 3 círculos desenhados à mão, documentado no próprio arquivo).
  - Gap real, não resolvido aqui: o botão "Upload video" aponta para `/dashboard/videos/upload`, que **não existe** — a Fase 03 (upload/processamento) nunca teve nenhuma SI de frontend (só backend), então não há para onde navegar ainda. Mantido como link per o inventário ("button press itself is just a route trigger"), mas vai dar 404 até essa página ser construída em algum momento futuro (fora do escopo desta fase/SI).
  - Gap real, não resolvido aqui: o badge de duração no thumbnail (visível no Figma) não foi renderizado — `GET /channels/me/videos` (§API Contracts) não retorna nenhum campo de duração no `items[]`, só a listagem pública (`GET /channels/:nickname/videos`) tem `duration_seconds`. Documentado no código (`ChannelVideoListItem`) para a SI-04.9b não inventar o campo.
  - Badge de visibilidade: "Unlisted" usa `text-link` (`#3ea6ff` no dark mode bate exatamente com o Figma); "Public" usa `text-success-text` (token semântico mais próximo disponível — o verde do Figma, `#4caf50`, não tem correspondência exata em nenhum token atual, mas é a mesma família semântica).
  - Thumbnail renderizado como placeholder (`bg-muted`) — `thumbnail_key` (retornado pela API) é uma chave de storage bruta, sem nenhum esquema de resolução para URL pública ainda implementado no frontend; resolução real fica para a SI-04.9b ou uma fase futura de object storage.
  - Paginação numerada simplificada (primeiros 3 + último, sem janela ao redor da página atual) — documentado no código; suficiente para o visual shell, sem view do Figma com `page` no meio de um range grande para validar contra.
  - Nenhuma chrome de header/sidebar construída — confirmado que é convenção já estabelecida pela SI-04.8a/8b (a tela de edição de vídeo também não renderiza header/sidebar); esse shell fica para a Fase 07 (`docs/figma-reference/phase-07-home-search-wrapup/`).
  - Verificado visualmente via browser (dev server temporário) contra o screenshot do Figma — fidelidade alta; console sem erros.
  - `tsc --noEmit`, lint e suite completa do Vitest (97/97) confirmados verdes após as mudanças.

### SI-04.9b — Dashboard de gerenciamento de vídeos do canal (lógica & wiring)
- **Status:** completed
- **Tests:** 15 passing (8 unit `video-dashboard-list.test.tsx` + 7 e2e `video-dashboard.e2e-spec.ts`, per Test Specs `next-frontend/specs/video-dashboard.plan.md`)
- **Observations:**
  - Preflight: a Test Spec (`video-dashboard.plan.md`) era ~7h mais antiga que o plano da fase (fora da janela de 10min do preflight, tecnicamente "stale"). Conteúdo revisado e considerado coerente com o escopo da SI; usuário confirmou prosseguir com a spec existente em vez de re-rodar `/plan-test-specs`.
  - `page.tsx`: guard de auth (`redirect("/login")` se não logado) + fetch via `upstream.GET("/channels/me/videos")` **diretamente** (não via BFF `/api/channels/me/videos`), lendo `searchParams` (`page`/`visibility`/`sort`/`search`) — mesmo padrão RSC-direto-ao-upstream já estabelecido na SI-04.8b, per `next-frontend/CLAUDE.md`. Único erro documentado (`401 UNAUTHORIZED`) mapeado para redirect a `/login`.
  - Achado real, descoberto durante a escrita do e2e: como o RSC busca via `upstream` direto (não `fetch("/api/...")`), o browser **nunca** faz uma requisição visível para `/api/channels/me/videos` — só para a própria rota da página. Os testes e2e de filtro/busca/ordenação (que originalmente esperavam por `page.waitForRequest` nesse endpoint) tiveram que ser reescritos para observar a mudança da própria URL (`page.waitForURL`/`toHaveURL`) em vez de uma requisição de rede, que não existe nesse desenho.
  - `video-dashboard-list.tsx` virou Client Component (`"use client"`) para poder ler/escrever `searchParams` via `useRouter`/`useSearchParams` (filtros, busca, ordenação, paginação) — os dados em si continuam vindo só do RSC via props, sem cache client-side (per TD-06).
  - `icon-button.tsx` ganhou suporte a `asChild` (mesmo padrão de `button.tsx`, via `Slot.Root`) — necessário para o `VideoRowMenuButton` navegar como link.
  - Simplificação deliberada do `VideoRowMenuButton`: como a Fase 04 não tem capacidade de excluir/despublicar vídeo (só editar), o botão de kebab virou um link direto para `/dashboard/videos/{id}/edit` em vez de abrir um menu dropdown com uma única opção — evita instalar um novo primitivo shadcn (`dropdown-menu`) só para um item. Documentado; se uma fase futura adicionar mais ações (excluir, despublicar), aí sim vale a pena um menu de verdade.
  - Chip "Date": a API só tem `sort=latest|oldest`, sem parâmetro próprio de filtro por data — implementado como atalho que alterna o mesmo `sort` do dropdown "Sort by". Assunção documentada no código, não inventada silenciosamente.
  - Botão "Filter": mantido decorativo (sem `onClick`) — o Figma mostra como disclosure trigger de um painel cujo conteúdo nunca foi capturado (nenhum estado expandido no design).
  - Adicionado `formatRelativeTime` a `lib/utils.ts` (usa `Intl.RelativeTimeFormat` nativo, sem nova dependência) para exibir `published_at` como "2 days ago" etc., batendo com o Figma.
  - `mocks/handlers/channels.ts`: `GET /channels/me/videos` deixou de retornar sempre `items: []` — agora retorna 2 vídeos fixture por padrão, com um trigger reservado (`search=no-videos-match-this-search`) para simular lista vazia (usado no cenário 1.7). Confirmado que o teste de integração existente do BFF (`route.integration.test.ts`) não dependia do fixture antigo (usa `server.use()` próprio).
  - Verificação visual manual no browser não completou (a automação de clique/digitação do Chrome não conseguiu preencher o form de login neste ambiente — parece um hiccup da ferramenta, não um bug do app); a suíte Playwright real (22/22, incluindo os 7 cenários desta SI) já prova o fluxo autenticado ponta a ponta em um browser de verdade, então não foi bloqueante.
  - Suite completa confirmada verde: Vitest 105/105 (frontend), Playwright 22/22 (todos os specs e2e, não só os novos), `tsc --noEmit` e lint limpos.

### SI-04.10.0 — Drift audit: Edição de informações do canal
- **Status:** completed
- **Tests:** no tests (audit-only)
- **Observations:**
  - Executada fora da ordem do documento (mas dentro da Dependency Map): SI-04.9.0 está pausada por rate limit do Figma MCP. Como SI-04.10.0 é um branch raiz independente na Dependency Map (`Dependencies: none`, sem relação com SI-04.9.x) e tem Reused DS list vazia (mesma situação da SI-04.8.0), pôde ser completada sem nenhuma chamada ao Figma.
  - Adicionada a seção `## Screen: edicao-de-informacoes-do-canal` a `frontend-drift-report.md` (append — arquivo já existia desde a SI-04.8.0; frontmatter preservado).

### SI-04.10a — Edição de informações do canal (visual shell)
- **Status:** completed
- **Tests:** _(empty — shell smoke-gated by build AC, per SI's Tests section)_
- **Observations:**
  - Decisão do usuário (Reused DS list era vazia, sem drift decisions a aplicar): campos do formulário (Nickname, Channel Name, Description) usam o padrão já estabelecido de `<Label>` separado acima do campo (TD-04, mesmo de login/signup/video-edit-form), **não** o padrão de label flutuante que o Figma mostra para esta tela especificamente — decisão explícita para manter um único padrão de formulário no projeto, documentada no `figma-reference.md` como pendente e resolvida aqui.
  - Criados 5 ícones novos em `components/icons/`: `subscribers-icon`, `video-count-icon`, `info-icon`, `align-left-icon` (heading "About Channel"), `clock-icon` — todos com o path SVG exato baixado do Figma na pré-coleta.
  - Cards do formulário reaproveitam o token `bg-popover` (não um `bg-[#272727]` literal) — mesmo padrão já usado pelo painel lateral da tela de edição de vídeo; confirmado que `--popover` no dark mode (`#282828`) bate quase exatamente com o valor do Figma.
  - **Bug real encontrado e corrigido durante a verificação visual no browser:** `channel.subscriberCount.toLocaleString()`/`.videoCount.toLocaleString()` e `Intl.DateTimeFormat("en-US", {dateStyle: "long"})` sem locale/timezone fixos causavam erro de hidratação real (Next.js overlay: "Hydration failed because the server rendered text didn't match the client... Date formatting in a user's locale which doesn't match the server"). Corrigido fixando `"en-US"` explícito em todo `toLocaleString()` (incluindo os já existentes em `video-dashboard-list.tsx`, que tinham o mesmo padrão de risco ainda que não tivessem manifestado erro visível) e adicionando `timeZone: "UTC"` ao `Intl.DateTimeFormat` — esse segundo fix também corrigiu um bug de exibição visível (a data aparecia um dia a menos, ex. "January 14" em vez de "January 15", por causa do fuso local do navegador).
  - Verificado visualmente via browser (dev server temporário) contra o Figma — fidelidade alta; sem erros de console/hidratação após os fixes.
  - `tsc --noEmit`, lint e suite completa confirmados verdes: Vitest 105/105, Playwright 22/22.

### SI-04.10b — Edição de informações do canal (lógica & wiring)
- **Status:** completed
- **Tests:** 10 passing (6 unit `channel-settings-form.test.tsx` + 4 e2e `channel-settings.e2e-spec.ts`, per Test Specs `next-frontend/specs/channel-settings.plan.md`)
- **Observations:**
  - Mesma situação de "Test Spec ~7h mais antiga que o plano" já vista na SI-04.9b — seguido direto sem re-perguntar, já que o usuário tinha indicado essa preferência para o mesmo padrão de defasagem.
  - `page.tsx`: guard de auth + fetch via `upstream.GET("/channels/me")` direto (RSC), mesmo padrão das SIs anteriores. Único erro documentado (`401`) mapeado para redirect a `/login`.
  - `ChannelSettingsFormProps` mudou de dados 100% placeholder (SI-04.10a) para o formato real de `Channel` (`GET /channels/me`) + `avatarUrl`/`subscriberCount`/`videoCount` agora **opcionais**, porque o `Channel` do backend não tem nenhum desses três campos (sem upload de avatar nesta fase; assinantes é Fase 06; contagem de vídeos vive em outro endpoint). A linha de estatísticas e o avatar só renderizam quando o valor é passado — nada de número fabricado. `page.tsx` real não passa nenhum dos três.
  - `react-hook-form` + Zod com `mode: "onChange"` (não o padrão `onSubmit`) — necessário porque o cenário 1.4 do spec exige que o botão "Save Changes" fique desabilitado assim que o nickname digitado é inválido, não só depois de tentar submeter.
  - Erros mapeados: `CHANNEL_NICKNAME_TAKEN` → erro inline no campo Nickname ("This nickname is already taken"); qualquer outro erro (ex. `VALIDATION_ERROR`) → banner genérico `data-slot="form-error"`, mesmo padrão do `video-edit-form.tsx`.
  - Confirmação de sucesso ("Channel updated") é inline (`role="status"`, ícone de check), não um toast — como o spec pedia explicitamente "confirmação inline".
  - `UpdateChannelDto` (gerado do OpenAPI) é `Record<string, never>` — mesma limitação do `ts-node`/plugin do swagger já documentada para `UpdateVideoDto` desde a SI-04.6. Contornado com uma interface local `ChannelUpdatePayload`, mesmo padrão do `video-edit-form.tsx`.
  - `mocks/handlers/channels.ts`: `PATCH /channels/me` ganhou um trigger reservado (`nickname: "taken_nickname"` → 409 `CHANNEL_NICKNAME_TAKEN`) e passou a devolver `updated_at` atualizado no sucesso.
  - **Nota operacional (não é bug de código):** os 4 cenários e2e novos falharam repetidamente por timeout numa primeira rodada — investigado e isolado a um dev server "zumbi" na sessão do Docker (múltiplos restarts anteriores via `docker compose exec -d` sem matar o processo anterior, já que o container não tem `pkill`). Um `docker compose down && up` limpo resolveu; suite completa (Playwright 26/26, incluindo os 4 novos) confirmada verde depois. Não é um achado sobre o código do app.
  - Suite completa confirmada verde: Vitest 111/111 (frontend), Playwright 26/26, `tsc --noEmit` e lint limpos.

### SI-04.11.0 — Drift audit: Página pública do canal
- **Status:** completed
- **Tests:** no tests (audit-only)
- **Observations:**
  - Mesma situação da SI-04.10.0: branch raiz independente (`Dependencies: none`) com Reused DS list vazia — completada sem chamada ao Figma, apesar da SI-04.9.0 continuar pausada.
  - Adicionada a seção `## Screen: pagina-publica-do-canal` a `frontend-drift-report.md` (append; frontmatter preservado).

### SI-04.11a — Página pública do canal (visual shell)
- **Status:** completed
- **Tests:** _(empty — shell smoke-gated by build AC, per SI's Tests section)_
- **Observations:**
  - Sem drift decisions a aplicar (Reused DS list vazia). Criados `app/channel/[nickname]/page.tsx` + `components/channel/channel-public-page.tsx` + 1 ícone novo (`bell-icon.tsx`).
  - Chips de ordenação (Latest/Popular/Oldest) e a "action" size de `button.tsx` (já criada na SI-04.9a) se encaixaram perfeitamente sem nenhuma mudança de DS: o token `--primary` no dark mode é branco (`#ffffff`) com foreground escuro — bate exatamente com o chip ativo do Figma (`bg-[#f1f1f1]`, texto escuro), então `variant="default"` (ativo) / `variant="secondary"` (inativo) + `size="action"` resolveu sem criar nada novo. Confirma a suspeita registrada no `figma-reference.md` (Fase 07) de que esse padrão de chip se repete em várias telas.
  - Botão de notificação (sino) usa `variant="outline"` no `icon-button.tsx` — mesma aproximação pragmática já usada nas setas de paginação (SI-04.9b): nenhuma variante atual reproduz o preenchimento sólido `bg-[#272727]` do Figma para um ícone isolado, e não expandi o variant set de novo por esse único caso.
  - `PublicChannelInfo` (contrato de `GET /channels/:nickname`) não tem contagem de assinantes — mesmo gap já documentado para `Channel` (SI-04.10). `subscriberCount` é prop opcional, só renderiza quando fornecida.
  - Aba "About" renderizada de forma inerte (sem `onClick`, sem navegação) — o conteúdo de "sobre o canal" não tem nenhuma capability nesta fase (a edição de descrição do canal já vive na tela de Channel Settings, owner-only); confirmado meses atrás no `figma-reference.md`/`project-plan.md` que a aba "About" está fora do escopo da Fase 04.
  - Botão "Subscribe" e o de notificação ficam sem `onClick` — funcionalidade de inscrição é Fase 06 (Social Interactions), não desta fase; renderizados só por fidelidade visual.
  - Adicionado `formatDuration` a `lib/utils.ts` (mm:ss / h:mm:ss) para o badge de duração — esta tela tem `duration_seconds` de verdade na API (diferente do dashboard do dono, SI-04.9, que não tem esse campo).
  - Verificado visualmente via browser (dev server temporário) contra o Figma — fidelidade alta; sem erros de console, sem hidratação.
  - **Nota operacional (não é bug):** mesma flakiness de dev server já vista na SI-04.10b (Turbopack compilando várias rotas a frio sob carga concorrente do Playwright derruba algumas specs por timeout) — resolvido com restart limpo do container + "aquecer" cada rota via `curl` antes de rodar a suíte completa. Suite (Playwright 26/26) confirmada verde depois.
  - `tsc --noEmit`, lint e suite completa do Vitest (111/111, inalterada — SI sem testes próprios) confirmados verdes.

### SI-04.11b — Página pública do canal (lógica & wiring)
- **Status:** completed
- **Tests:** 8 passing (4 unit `channel-public-page.test.tsx` + 4 e2e `channel-public-page.e2e-spec.ts`, per Test Specs `next-frontend/specs/channel-public-page.plan.md`)
- **Observations:**
  - Mesma situação de "Test Spec ~7h mais antiga que o plano" já vista nas SIs 04.9b/04.10b — seguido direto, mesma preferência já indicada pelo usuário.
  - `page.tsx`: sem guard de auth (tela anônima) — busca `GET /channels/{nickname}` + `GET /channels/{nickname}/videos` em paralelo via `Promise.all` + `upstream.GET` direto (RSC), lendo `sort`/`page` de `searchParams`. Erro em qualquer um dos dois (ambos só documentam `404 CHANNEL_NOT_FOUND`, chaveados pelo mesmo nickname) → `notFound()` do Next.js.
  - `channel-public-page.tsx` ganhou a mesma interatividade de ordenação da SI-04.9b (`useRouter`/`useSearchParams`, `router.push` com o novo `sort`) — "Latest" (default) remove o param da URL em vez de escrevê-lo explicitamente, mesmo padrão usado pelo dashboard.
  - `mocks/handlers/channels.ts`: `GET /channels/:nickname` e `.../videos` passaram a aceitar 2 triggers reservados — `nickname-does-not-exist` (404 nos dois) e `channel-with-no-public-videos` (canal resolve normalmente, lista vazia) — e a listagem de vídeos públicos ganhou fixtures reais com `duration_seconds` (campo que a listagem do dono, SI-04.9, não tem).
  - **Bug real no meu próprio teste, não no app:** o e2e `1.1` inicialmente esperava o nome "Tech Mastery Plus" (herdado do dado placeholder do visual shell, SI-04.11a) — a fixture real do MSW sempre devolve `name: "Alice"` (só `nickname` ecoa o parâmetro da rota). Corrigido no teste, não no app; pego na primeira rodada da suíte completa, não passou despercebido.
  - Verificado visualmente via browser (dev server temporário): página 404 e estado vazio ("This channel has no public videos yet") renderizam corretamente contra os triggers reservados; sem erros de console.
  - Mesma nota operacional das duas SIs anteriores: restart limpo do container + "aquecer" rotas via `curl` antes da suíte completa, para evitar timeout de compilação a frio do Turbopack sob carga concorrente do Playwright.
  - Suite completa confirmada verde: Vitest 115/115 (frontend), Playwright 30/30 (todos os specs e2e da fase), `tsc --noEmit` e lint limpos.

## Fase 04 — concluída (19/19 SIs)

Todas as 4 telas do frontend (dashboard, edição de vídeo, configurações do canal, página pública do canal) e o backend/BFF completos. Suite final da fase: Vitest 115/115, Playwright 30/30, `tsc --noEmit` e lint limpos nos dois subprojetos, `npm run build` (produção) do `next-frontend` concluído com sucesso — todas as rotas (`/dashboard/videos`, `/dashboard/videos/[id]/edit`, `/dashboard/channel`, `/channel/[nickname]` + as 8 rotas de BFF) presentes no output.

Suite backend não foi re-rodada nesta rodada de SIs (04.9–04.11): nenhum arquivo do `nestjs-project` foi tocado, só `next-frontend`.
