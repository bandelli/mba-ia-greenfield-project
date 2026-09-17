# Phase 07 — Handoff / Status Map

**Written:** 2026-09-17, at the end of the `/implement home-search-launch` run.
**Purpose:** a single place to pick this back up from — what's done, what's verified, what's *not* committed yet, and what's explicitly left open for a follow-up task.

## 1. Where the project stands

Phase 07 ("Home Page, Search, and Wrap-up") was the **last phase** in `docs/project-plan.md`'s 7-phase plan. All 20 of its Step Implementations are complete — see `progress.md` in this same folder for the full per-SI trail (what was built, every bug found and fixed, every judgment call and why). This doc is the short version + the "what to do next" list.

With Phase 07 done, the platform has: anonymous video watching, registration/login/password recovery, video upload+processing (backend; **frontend UI missing**, see §3), video/channel management, the watch page, social interactions (comments/likes/subscriptions), and now the home page (grid/search/category-filter/infinite-scroll) plus a shared header/sidebar/account-menu shell and production-deploy groundwork.

## 2. ⚠️ Nothing from this phase is committed yet

This is the single most important thing to know before doing anything else. The entire Phase 07 implementation — 69 changed/new/renamed files — sits **uncommitted** on branch `feature/fase-07-home-search-launch`. Run `git status` to see the full list; high level:

- **Backend (`nestjs-project/`):** new `GET /videos/public` endpoint + DTO, `pg_trgm` migration, updated `videos.service.ts`/`videos.controller.ts` + their tests, new production `Dockerfile`, new `e2e-fullstack-seed.ts`, updated `package.json` (new seed script), new `video-public-listing.e2e-spec.ts`.
- **Frontend (`next-frontend/`):** ~20 new components (`components/layout/*`, `components/video/video-grid*`, 4 shadcn primitives, several icons), the new `app/(main)/` route group (replacing the never-customized placeholder `app/page.tsx`), the BFF route `app/api/videos/public/route.ts`, updated `lib/api/contracts.ts`/`types.gen.ts`/`utils.ts`, updated MSW handlers, new production `Dockerfile`, updated `next.config.ts` (`output: "standalone"`), 10 new test files, `tests/home.e2e-spec.ts` + `tests/full-stack/*` (3 new specs) + their Playwright config split.
- **CI:** brand-new `.github/` — `ci.yml` (fast gates) + `full-stack-e2e.yml` (real-stack journeys). **Never triggered on real GitHub Actions** — only reproduced locally, step by step.
- **Docs:** `docs/deployment.md` (new), the full phase-07 planning trail (`context.md`, `validation.md`, `phase-07-home-search-launch.md`, `progress.md`, `frontend-drift-report.md`), decisions doc, screen inventory, figma-reference migration.

**Before resuming feature work, decide:** commit this as-is (it's fully verified, see §4), or review the diff first. Either way, nothing here has been pushed or opened as a PR.

## 3. Known gaps — not fixed, flagged on purpose

These came up *during* Phase 07 and were deliberately left alone (out of scope for the SI that found them, or an explicit user decision). None of them are silent — each has a fuller writeup in `progress.md`.

| # | Gap | Where flagged | Suggested next step |
|---|---|---|---|
| 1 | **Video upload page was never built.** 3 dangling UI links to `/dashboard/videos/upload` since Phase 04; backend upload (tus) is complete, frontend has no page and no tus client installed. | SI-07.0.5, SI-07.7 (blocked the "upload→publish→watch" E2E journey — user explicitly chose to skip it rather than build the page inline) | A dedicated task/small phase: `app/dashboard/videos/upload/page.tsx` + a tus client (`tus-js-client` isn't installed yet) + progress UI + BFF wiring decision (does tus's chunked PATCH protocol go through the BFF or direct?). Once it exists, author `upload-to-watch.e2e-spec.ts` per the original TD-06 scope. |
| 2 | **CI checks don't block merges yet.** Both workflows exist and are believed correct (every step reproduced locally) but were never run on real GitHub Actions, and even once green, GitHub won't *require* them without branch-protection config. | SI-07.6 | Push this branch, open a PR, watch both workflows actually run. Then a repo admin enables "Require status checks to pass" for `dev`/`main` in GitHub settings — not something committable in a workflow file. |
| 3 | **`next-frontend/CLAUDE.md` documents an `openapi-freshness.yml` CI guard that doesn't exist.** Pre-existing doc/reality mismatch, not created this phase (literally out of SI-07.6's scope). | SI-07.6 | Small follow-up: either build the guard (sync-openapi.sh + openapi:types + `git diff --exit-code`) or correct the doc. |
| 4 | **No SMTP auth support** (`nestjs-project/src/config/mail.config.ts` only reads host/port/from). Fine for Mailpit; will break on a real provider (SendGrid, Postmark, etc.) that requires auth. | SI-07.5 (`docs/deployment.md`) | Small backend change: add `MAIL_USER`/`MAIL_PASS` (or equivalent) to `mail.config.ts` + the nodemailer transport before actually cutting over production email. |
| 5 | **Sidebar has no live "subscribed channels" list.** `subscribed-channel-row.tsx`/`pagination-controls.tsx` are in the Home screen's Reused DS list but no SI ever wired real subscription data into the sidebar — it currently shows only the 3 static nav items (Home/Subscriptions/Your videos). | SI-07.4a, SI-07.4b | Needs its own small SI/task: fetch `GET /users/me/subscriptions` (already exists, used by `/subscriptions` page) into the sidebar, decide on a "show N more" cutoff. |
| 6 | **Category chip labels are the real backend enum, not Figma's decorative values** (intentional — chips must filter real data) — also duplicated locally instead of a shared `lib/video-categories.ts`. | SI-07.0.7 | Cosmetic/DRY cleanup only, no functional gap. Low priority. |
| 7 | **R2 bucket public-read vs. presigned-URL** wasn't decided in `docs/deployment.md` — deferred to whatever `phase-05-video-watch-page`'s existing presigned-URL flow already implies. | SI-07.5 | Verify against that phase's TDs before flipping any bucket-visibility setting in Cloudflare R2. |
| 8 | **`nestjs-project/Dockerfile` and `next-frontend/Dockerfile` pin different Node versions** (25.6.0 vs 22.16.0) — this mirrors a pre-existing mismatch already present in each subproject's own `Dockerfile.dev`, not introduced by SI-07.5. Harmless, just worth knowing. | SI-07.5 | Only worth touching if the project ever wants to unify Node versions across subprojects — not urgent. |

## 4. What *is* verified (and how)

Every item in the plan's Deliverables checklist passed, run fresh at the very end of this session:

- Backend: 342/342 unit+integration tests, 133/133 E2E tests, `tsc --noEmit` clean, lint clean (0 errors).
- Frontend: 272/272 Vitest tests, 50/50 existing Playwright E2E specs (MSW-based), 3/3 new full-stack Playwright specs (real backend/DB/Mailpit), `tsc --noEmit` clean, lint clean (0 errors).
- Both production `Dockerfile`s build successfully (`docker build`, verified locally, then the test images were removed — nothing pushed to a registry).

**Not verified:** actual execution on GitHub Actions infrastructure (§3, gap #2), and running the deployed containers against a live production Postgres/R2 (would require actually provisioning a platform account).

## 5. Suggested order if resuming

1. Review the uncommitted diff (`git status` / `git diff`), commit + push this branch, open the PR against `dev`.
2. Watch `ci.yml` and `full-stack-e2e.yml` actually run on GitHub — fix anything that only breaks in that environment (the doc above already names the most likely culprit: `host.docker.internal` resolution, though `next-frontend/compose.yaml` already sets `extra_hosts: host-gateway` for it, so this is a medium-confidence "should just work," not a known-broken item).
3. Once CI is green, ask a repo admin to make the checks required (gap #2).
4. Pick off gaps #1/#4/#5 as their own small tasks/phases — #1 (upload page) is the biggest and most user-facing; the platform's core loop (discover → watch → interact) is complete without it, but "upload a video" is the one flow a real user still can't do end-to-end through the UI.
