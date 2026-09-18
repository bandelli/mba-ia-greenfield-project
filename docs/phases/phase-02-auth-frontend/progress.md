# phase-02-auth-frontend — Progress

**Status:** completed
**SIs:** 24/24 completed

### Setup-Infra — playwright.config.ts + instrumentation.ts + tests/fixtures.ts
- **Status:** completed
- **Tests:** no tests (infra setup)
- **Observations:**
  - `@playwright/test` was already in node_modules (v1.60.0) but not declared in package.json — added to devDependencies.
  - `playwright.config.ts` created: no webServer (dev server is containerized), baseURL=localhost:3001, testDir=./tests, testMatch=*.e2e-spec.ts.
  - `instrumentation.ts` created: register() conditioned on `NEXT_RUNTIME === "nodejs"` && `MSW_ENABLED === "true"`, `onUnhandledRequest: "bypass"` per E2E architecture.
  - `tests/fixtures.ts` created: auto-use `network` fixture that documents the contract (no page.route(), no server.use() per test).
  - Script `test:e2e` added to package.json.

### SI-02.0.1 — Infra: install batch shadcn primitives
- **Status:** completed
- **Tests:** no tests (infra)
- **Observations:** none

### SI-02.0.2 — Tests shadcn batch (checkbox)
- **Status:** completed
- **Tests:** 6 passing
- **Observations:**
  - `vitest.config.ts` needed `resolve.alias` for the `@/` path (tsconfig is not read automatically by Vite).
  - `vitest.setup.ts` created with `@testing-library/jest-dom/vitest` (Vitest-specific export) and explicit `afterEach(cleanup)` — without globals mode, RTL's auto-cleanup does not trigger on its own.

### SI-02.0.3 — Custom-ui: icon-button.tsx
- **Status:** completed
- **Tests:** 5 passing
- **Observations:** none

### SI-02.0.4 — Custom-business simple group
- **Status:** completed
- **Tests:** 22 passing
- **Observations:** none

### SI-02.0.5 — Custom-business complex: password-visibility-toggle
- **Status:** completed
- **Tests:** 3 passing
- **Observations:**
  - Created `components/icons/eye-icon.tsx` and `components/icons/eye-off-icon.tsx` as a dependency of the toggle.

### SI-02.0.6 — Custom-business complex: terms-checkbox
- **Status:** completed
- **Tests:** 6 passing
- **Observations:** none

### SI-02.1 — Auth contract aliases in lib/api/contracts.ts
- **Status:** completed
- **Tests:** no tests (type-only; compile-gated)
- **Observations:**
  - DTOs (`RegisterDto`, `LoginDto`, `ForgotPasswordDto`, `RefreshTokenDto`) are `Record<string, never>` in the current openapi.json — fields will expand when the upstream spec evolves; tsc passes.
  - Added `RefreshTokenPair` and `RefreshTokenDto`, which SI-02.4 will need.

### SI-02.2 — iron-session session module (lib/auth/session.ts)
- **Status:** completed
- **Tests:** 4 passing
- **Observations:**
  - `lib/env.ts` updated with `SESSION_PASSWORD` (Zod min 32 chars).
  - `vitest.setup.ts` received `process.env.SESSION_PASSWORD` for tests.
  - `next/headers` mocked via `vi.mock` with an in-memory Map; iron-session runs real crypto in the test.

### SI-02.3 — Auth MSW handlers (mocks/handlers/auth.ts)
- **Status:** completed
- **Tests:** no tests (test-infra)
- **Observations:**
  - `lucide-react` (added by shadcn on the checkbox) replaced with `@/components/icons/check-icon.tsx` per UI rule.
  - `@testing-library/user-event` added to devDependencies (it was in the container's node_modules but not declared).
  - MSW handler resolvers use `HttpResponse.json(data)` without a conflicting generic — body typing still passes via `type` imports of the aliases.

### SI-02.4 — Single-flight token refresh helper (lib/auth/refresh.ts)
- **Status:** completed
- **Tests:** 4 passing
- **Observations:**
  - Uses raw `fetch` (not the `upstream` client) for `/auth/refresh` — avoids a type conflict with `RefreshTokenDto: Record<string, never>` in the current schema.

### SI-02.5 — BFF Route Handler: POST /api/auth/signup
- **Status:** completed
- **Tests:** 4 passing
- **Observations:**
  - `server-only` guard resolved via `resolve.alias` in vitest.config.ts (empty stub at `lib/__mocks__/server-only.ts`).
  - Handler imported via dynamic import inside `beforeAll` — mandatory pattern to avoid capturing the fetch not yet patched by MSW (per project memory).

### SI-02.6 — BFF Route Handler: POST /api/auth/login
- **Status:** completed
- **Tests:** 4 passing
- **Observations:** none

### SI-02.7 — BFF Route Handler: POST /api/auth/logout
- **Status:** completed
- **Tests:** 2 passing
- **Observations:** none

### SI-02.8 — BFF Route Handler: POST /api/auth/forgot-password
- **Status:** completed
- **Tests:** 3 passing
- **Observations:** none

### SI-02.9 — Session propagation to Client Components
- **Status:** completed
- **Tests:** 4 passing (2 session-provider + 2 use-session)
- **Observations:**
  - `lib/env.ts` updated with `isServer: typeof window === "undefined" || process.env.VITEST !== undefined` to avoid blocking server-only vars in jsdom tests.

### SI-02.10.0 — Drift audit: Signup screen
- **Status:** completed
- **Tests:** no tests (audit-only)
- **Observations:**
  - Re-run at the user's request against the actual files on disk (figma:figma-implement-design → node 140:333). Fixed 3 phantoms from the previous report: back-link (was classified as an icon-button `size-9→size-6`; it is actually a text `<Link>` wrapper → aligned), password-visibility-toggle (assumed IconButton consumption; it is a raw `<button>` → direct retune in the className), terms-checkbox (nonexistent `text-foreground` anchor; already `text-muted-foreground` → aligned).
  - Corrected quick scan: 11 components (8 aligned, 2 minor drift, 1 significant drift, 0 missing). Applicable specifics: checkbox.tsx (5), password-visibility-toggle.tsx (2), password-strength-meter.tsx (2).
  - The audit produced no edits in `next-frontend` (the report lives in `docs/`); AC "empty git diff" interpreted as "no code edits by the audit" (a literal reading is impossible when resuming with the whole phase uncommitted).

### SI-02.10a — Signup screen (visual shell)
- **Status:** completed
- **Tests:** no tests (visual shell)
- **Observations:**
  - Applied the 3 auto-Edit decisions from the corrected Drift Report: checkbox.tsx (hardcoded radius→token, border→border-2, border-input→border-border, drop 2 dark overrides), password-visibility-toggle.tsx (radius-1→radius-full, svg size-4→size-6), password-strength-meter.tsx (bars rounded-full→radius-0-5, text-helper→text-caption). 8 components skipped.
  - Page path: the plan specifies `app/(auth)/signup/page.tsx` (route group); the existing login page is at `app/login/page.tsx` (no route group) — path convention divergence between slices; reconciling this is out of scope for this SI (note for the user).
  - Created `components/icons/arrow-back-icon.tsx` from the Figma asset (arrow_back) — back-link.tsx is a `<Link>` wrapper and receives the icon as children (absolute positioning via call-site, allowed).
  - **Out of scope (authorized by the user):** `hooks/__tests__/use-session.test.ts:12` had a pre-existing TS2769 type error from SI-02.9 (SessionProvider missing `children` in createElement); applied a 1-line fix (children in the props object) to unblock the project's `tsc --noEmit` gate. SI-02.9 should have caught this — follow-up for the user.
  - Visual parity not verified in the browser (dev server not started per next-frontend/CLAUDE.md rule — only on explicit request); the project's tsc --noEmit passes (exit 0).

### SI-02.10b — Signup screen (logic & wiring)
- **Status:** completed
- **Tests:** 4 passing (signup-form.wiring vitest) + 3 passing (auth-signup E2E)
- **Observations:**
  - Complete wiring: RHF + zodResolver (schema TD-04: fullName/email/password/confirmPassword/terms; `RegisterDto` empty in the contract source — payload `{email,password}` authored per TD-04, pass-through by the BFF). Submit→`fetch("/api/auth/signup")`; 409→inline hint on the email field + CTA to `/login`; 400→form-level message (`data-slot=form-error`, not on the email field); 201→"Account created!" state.
  - Installed deps `react-hook-form@^7.76.0` + `@hookform/resolvers@^5.2.2` (zod ^4.4.3 already present; resolver auto-detects v4). `z.email()` / `z.boolean().refine` (Zod 4 idioms).
  - **Deviation from library-refs (justified):** the canonical pattern uses the shadcn primitive `components/ui/form.tsx`, which does NOT exist and was deliberately excluded from the screen's Reused DS list (uses plain Label+Input). Wired RHF directly via `register`/`Controller` + inline `text-destructive` messages, without introducing an unaudited DS primitive — keeps the SI in scope.
  - **Test-infra (in-scope):** `vitest.setup.ts` gained a `ResizeObserver` polyfill (jsdom does not provide one; Radix `@radix-ui/react-use-size` references it on mount — it was blocking every Radix-backed component test).
  - **Removed (direct consequence of this SI):** `components/auth/__tests__/signup-form.test.tsx` (presentational bootstrap test from SI-02.0.4) — it asserted the old contract (`isSubmitting` prop, "Sign up" button) that this SI deliberately replaced; superseded by the wiring test + E2E.
  - Created `lib/auth/error-mapping.ts` (maps `ApiErrorEnvelope` → setError by status, per library-refs).
  - **Out of scope (follow-ups for the user):** (a) `.env.local` was created by the testing subagent with `API_URL=http://localhost:3000` — inside the container this points to the Next dev server itself; if the server-side MSW dies (hot-reload), the upstream fetch falls back to Next's 404 HTML instead of failing fast. The project convention (CLAUDE.md / vitest.setup default) is the Compose service name (`http://nestjs-api:3000`). (b) `.env.example` does not list `SESSION_PASSWORD`. (c) Operational: the dev server needs a clean restart with `MSW_ENABLED=true` before each E2E run — a previous session's server may have silently killed MSW (not reproducible from a clean state).

### SI-02.11.0 — Drift audit: Login screen
- **Status:** completed
- **Tests:** no tests (audit-only)
- **Observations:**
  - Figma node 138:179 audited against disk; 8 components from the Reused DS list. Quick scan: 7 aligned, 1 minor drift, 0 significant drift, 0 missing.
  - 6 components (`card`, `label`, `input`, `button`, `brand-logo`, `auth-footer`) reproduce the `aligned/skip` decision from the signup audit (SI-02.10.0) — Prior honored, no CONFLICT (identical Figma demand between the two screens, same design file).
  - `streamtube-icon.tsx` is first-time (was not in the signup Reused DS): DS-compliant SVG icon, no token surface to drift → aligned.
  - Only drift: `login-form.tsx` link "Forgot password?" uses `text-label-md` (Medium-weight label token) where Figma 147:539 demands Inter Regular 14/20 = `text-body-md`. Typical auto-Edit retune (same typographic system → minor), to be applied in SI-02.11a.
  - The audit produced no edits in `next-frontend` (the report lives in `docs/`); AC "empty git diff" satisfied in the sense of "no code edits by the audit".

### SI-02.11a — Login screen (visual shell)
- **Status:** completed
- **Tests:** no tests (visual shell)
- **Observations:**
  - Drift Report applied: 1 auto-Edit in `components/auth/login-form.tsx` (link "Forgot password?" `text-label-md` → `text-body-md`, per Figma 147:539 Inter Regular 14/20). The other 7 components `skip`. Post-edit variant-conflict guard: no typographic sibling under a variant prefix on the link → no extra action.
  - Created `app/(auth)/login/page.tsx` (route group, mirrors the `app/(auth)/signup/page.tsx` convention): main > Card > BrandLogo + h1 "Sign in" + LoginForm + AuthFooter. No BackLink/subtitle (absent in Figma node 138:179).
  - **Removed (direct consequence of this SI):** `app/login/page.tsx` (pre-phase scaffold). The plan fixes the path at `app/(auth)/login/page.tsx`; keeping both would resolve `/login` in parallel (route group does not affect the URL) → Next parallel-route error. The old scaffold was the pre-phase version of this same screen, replaced by this one (which composes LoginForm) — superseded.
  - Visual parity not verified in the browser (dev server not started per the next-frontend/CLAUDE.md rule); compilation validated at final verification.

### SI-02.11b — Login screen (logic & wiring)
- **Status:** completed
- **Tests:** 5 passing (login-form.wiring vitest) + 3 passing (auth-login E2E)
- **Observations:**
  - 4 actions complete: (1) RSC shell + client form already satisfied by SI-02.11a (anonymous route, no guard); (2) RHF + zodResolver, minimal schema `email`+`password` (LoginDto with no props in the contract source, authored per TD-04); (3) submit → `fetch("/api/auth/login")`, `router.refresh()` on 200 (TD-06; tokens never on the client per TD-02); (4) error-mapping: 401→form-level alert, 403→distinct alert + resend CTA, 400→inline on the email field.
  - `login-form.tsx` rewritten from presentational (prop `isSubmitting`) to wired RHF — supersedes the SI-02.0.4 scaffold. **Removed (direct consequence):** `components/auth/__tests__/login-form.test.tsx` (presentational bootstrap test asserted the old contract, replaced by the wiring test + E2E).
  - Added `mapLoginErrorToForm` to `lib/auth/error-mapping.ts` (mirrors the signup one; keys off statusCode).
  - **Test-infra (in-scope):** `mocks/handlers/auth.ts` gained 2 reserved triggers on the `/auth/login` handler — `invalid@example.com`→401, `unconfirmed@example.com`→403 (the handler only had `badrequest@`→400). Mechanism sanctioned by the project's E2E contract (per-scenario via reserved trigger, no `server.use()` in E2E); required by this SI's spec 401/403 scenarios. Values do not collide with existing triggers.
  - Fix-loop diagnosis (1 attempt): the Vitest failure was test isolation (`refreshMock` at module level retained the count from the previous 200 test — correct source, returns before `router.refresh()` on `!res.ok`); resolved with `beforeEach(refreshMock.mockClear())`. The E2E 401 failure was stale server-side MSW: `instrumentation.ts` loads MSW once at boot and does NOT hot-reload; the pre-edit server fell into the 200 branch. Resolved with a clean restart of the dev server (same gotcha already recorded in SI-02.10b).
  - **Out of scope (follow-up for the user):** the resend-confirmation CTA points to `/resend-confirmation`, a route that does not exist in this phase (design gap/TBD already recorded in the UI Contract — `403` Error Catalog "TBD — design gap"). No resend endpoint within this slice's scope.
  - **Operational:** the `next-frontend` container does not have `pkill`; killing the stale dev server before E2E requires killing via `/proc` (`next-server` PIDs). Relevant for SI-02.12b (same E2E flow).
  - Visual parity not verified in the browser (next-frontend/CLAUDE.md rule — only on explicit request).

### SI-02.12.0 — Drift audit: Password recovery screen
- **Status:** completed
- **Tests:** no tests (audit-only)
- **Observations:**
  - Figma node 140:289 audited against disk; 8 components. Quick scan: 8 aligned, 0 drift (minor/significant/missing). No auto-Edit — SI-02.12a will apply only skips.
  - 6 components (`card`, `label`, `input`, `button`, `brand-logo`, `auth-footer`) reproduce the `aligned/skip` decision from the signup/login audits — Prior honored, no CONFLICT.
  - `forgot-password-form.tsx` (first-time): composes only aligned DS primitives, no hardcoded token → aligned. `icon-button.tsx` (first-time): Figma arrow_back is a M3 standard icon button (container invisible until interaction) → maps to the `ghost` variant; the arrow's size/position are call-site composition of SI-02.12a (precedent from signup's back-link) → no DS-file drift.
  - Observed (outside the audit's scope): the Figma footer shows "Sign up" where "Sign in" would be usual — a content/prop value + design gap already recorded as an open question in the UI Contract; not a token drift.
  - The audit produced no edits in `next-frontend` (report in `docs/`); AC "empty git diff" satisfied.

### SI-02.12a — Password recovery screen (visual shell)
- **Status:** completed
- **Tests:** no tests (visual shell)
- **Observations:**
  - Drift Report: 8 `skip` decisions — no DS edit applied.
  - Created `app/(auth)/forgot-password/page.tsx` (route group, mirrors the signup/login convention): main > Card relative > IconButton(arrow_back, absolute top-left) + BrandLogo + h1 "Reset password" + subtitle + ForgotPasswordForm + AuthFooter. No conflicting old scaffold (there was no `app/forgot-password/`).
  - Back affordance: `IconButton` (DS primitive, per UI Contract) with `ArrowBackIcon` (reuses `components/icons/arrow-back-icon.tsx`, created in SI-02.10a from the Figma arrow_back asset — same asset/position as signup's back-link). The client-side navigation back to `/login` (onClick) is interaction → wiring belongs to SI-02.12b; the shell renders the control.
  - **Figma fidelity vs. UX (follow-up for the user):** AuthFooter rendered per the literal Figma — question "Remember your password?" + link "Sign up" → `/signup`. The UI Contract records as an open question that "Sign in" → `/login` would be usual (design inconsistency to confirm with the designer). Kept faithful to Figma per AC; not resolved unilaterally.
  - Visual parity not verified in the browser (next-frontend/CLAUDE.md rule); compilation checked at final verification.

### SI-02.12b — Password recovery screen (logic & wiring)
- **Status:** completed
- **Tests:** 4 passing (forgot-password-form.wiring vitest) + 3 passing (auth-forgot-password E2E)
- **Observations:**
  - 5 actions complete: (1) RSC shell + client form already satisfied by SI-02.12a (anonymous route, no guard); (2) RHF + zodResolver, schema with only `email` (ForgotPasswordDto with no props, authored per TD-04); (3) submit → `fetch("/api/auth/forgot-password")` payload `{email}`; (4) success `204` → inline confirmation box (`role=status`, "Check your email") replaces the form within the same Card, neutral anti-enumeration message (identical whether registered or not); (5) `400` → inline below the email field (form not replaced).
  - `forgot-password-form.tsx` rewritten from presentational to wired RHF (signup-form pattern, no router — success is an inline state, not navigation). **Removed (direct consequence):** `components/auth/__tests__/forgot-password-form.test.tsx` (presentational bootstrap test superseded by the wiring test + E2E).
  - Added `mapForgotPasswordErrorToForm` to `lib/auth/error-mapping.ts` (400→email field; else→root.serverError).
  - No new MSW reserved triggers — the `/auth/forgot-password` handler already had `badrequest@`→400 / any other→204 (anti-enumeration). No edits in `mocks/`.
  - Fix-loop not necessary (0 attempts); the subagent needed a clean restart of the dev server because the pre-existing server was running WITHOUT `MSW_ENABLED=true` (HTTP 200 but server-side MSW off). Reliable E2E readiness confirmation = `POST /api/auth/forgot-password` returning 204, not just a `curl -I` 200.
  - Visual parity not verified in the browser (next-frontend/CLAUDE.md rule).
