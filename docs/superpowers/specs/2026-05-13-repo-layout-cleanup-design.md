# Repo layout cleanup — design

- **Date:** 2026-05-13
- **Author:** Fayaz (with AI architect)
- **Status:** Approved — proceeding to implementation plan
- **Program:** 7-phase sequential program (see section 13)
- **Phase 1 branch:** `chore/repo-layout-cleanup`
- **Related:** plan at `docs/superpowers/plans/2026-05-13-repo-layout-cleanup-plan.md`

## 1. Problem statement

The NU-AURA monorepo has accumulated four years of organisational drift. Concretely:

- **27 non-dot files at the project root**, only ~13 of which are conventional repo metadata. The
  rest are scattered markdown docs, ad-hoc shell scripts, dated reports, dead deploy configs, and
  skill files.
- **Four naming conventions** coexist (`UPPER-KEBAB.md`, `lower-kebab.sh`, `UPPER_SNAKE.md`,
  `lower_snake.py`) with no enforced rule.
- **Provable duplication**: four byte-identical scripts at root and in `scripts/`, a `config/`
  directory byte-identical to `deployment/config/`, three stale `.skill` files duplicating
  `.claude/skills/nu-aura-*`, and pre-rename PDFs referring to the project as "NuHire" or "Nu
  Talent".
- **Committed runtime artifacts**: 16 MB `backend/backend-run.log`, 17 MB `backend/test-output.txt`,
  a 1.4 MB `frontend/nu-rbac-report.json`, `.next/` directory inside the Java backend,
  `node_modules/` committed under `scripts/qa-orchestrator/`, ad-hoc API-probe JSONs.
- **QA data sprawl**: `qa-reports/` (root), `docs/qa/` (~25,110 files), `docs/validation/` (47 loop
  logs), `frontend/test-results/` (882 entries), and `scripts/qa-orchestrator/` — six locations, no
  retention policy.
- **Overlapping docs**: seven files on the same "agent teams" topic spread across root and `docs/`;
  three architecture buckets (`docs/architecture/`, `docs/build-kit/`, `themes/`); dated audits
  never moved to an archive.

The drift makes onboarding hard, makes `git grep` noisy, bloats the working tree, and erodes the
team's ability to find authoritative documents.

## 2. Goals and non-goals

**Goals**

1. Reduce root-level files to conventional repo metadata only (~13 entries, all expected by tools or
   universally understood).
2. Establish a single canonical layout for `docs/`, `scripts/`, and ops/infra.
3. Enforce one naming convention across files and directories.
4. Remove committed runtime artifacts and update `.gitignore` to prevent regression.
5. Delete dated point-in-time reports and duplicated content; git history is the archive.
6. Land the program as **7 sequential PRs** (one per phase) that are individually reviewable,
   revertible, and verifiable against CI. No phase ships until the previous one is merged and green.
7. Address backend Java package structure and naming (`com.hrms` → `com.nulogic`, package
   rationalisation) — locked in Phase 4 per user decision.
8. Address frontend internal organisation (route consolidation, `lib/` boundary enforcement, auth
   hooks consolidation, components dedup) — locked in Phase 3 per user decision.
9. Backfill test coverage to JaCoCo 80% target across all modules — Phase 5.
10. Add missing CI workflows (PR validation, security scan, deploy) — Phase 6.
11. Rationalise overlapping QA / e2e / fix-loop skills — Phase 7.

**Non-goals**

1. Restructuring the internals of `backend/` (Java packages) or `frontend/` (Next.js App Router).
   Those remain untouched.
2. Migrating to a generic monorepo layout (`apps/`, `libs/`). NU-AURA is one application with one
   backend and one frontend; the cost of that restructure exceeds its benefit today.
3. Rewriting documentation content. We move and rename; we do not re-author.
4. Touching `.claude/`, `.github/workflows/` content beyond path references, or any open feature
   branches.

## 3. Requirements (EARS)

User stories first, then the formal acceptance criteria.

### 3.1 User stories

- **As a new engineer onboarding the repo**, I want the project root to surface only meta files and
  entry points, so that I can locate what I need without guessing.
- **As an engineer searching for a document**, I want each kind of document (PRD, ADR, runbook,
  agent prompt, QA plan) in a single canonical bucket, so that I do not chase the same topic across
  multiple folders.
- **As a CI / DevOps maintainer**, I want all infra (deployment, monitoring, local Maven deps)
  consolidated under one top-level directory, so that infra changes do not touch four unrelated
  places.
- **As a reviewer of this cleanup PR**, I want the diff structured as independent commits, so that I
  can review or revert by concern.
- **As the team**, I want the working tree free of committed logs, build artifacts, and generated
  reports, so that `git status` is meaningful and clones are fast.

### 3.2 EARS acceptance criteria

- **WHEN** the cleanup PR is merged, the project root **SHALL** contain at most 15 non-dot files,
  and all of them **SHALL** be: a conventional meta-markdown (`README`, `LICENSE`, `CHANGELOG`,
  `CONTRIBUTING`, `SECURITY`, `CLAUDE`, `MEMORY`), a build manifest (`pom.xml`), a container
  manifest (`Dockerfile`), or a `docker-compose*.yml` file.
- **WHEN** the cleanup PR is merged, the repo **SHALL NOT** contain a file matching `*.log`,
  `nohup.out`, `*.tgz`, `*/test-results/*`, `*/playwright-report/*`, `*/.next/*`, or
  `**/node_modules/**` under tracked paths.
- **IF** a file documents a dated point-in-time event (gap analysis, hardening audit, executive
  summary), **THEN** it **SHALL** be removed from the tree (history retains it) — no archive
  directory is introduced.
- **IF** two files at different paths have identical content (verified via SHA-256), **THEN** the
  cleanup **SHALL** retain exactly one and delete the other.
- **WHEN** the cleanup PR is merged, no file or directory name in the tree **SHALL** use
  `UPPER_SNAKE_CASE` or `lower_snake_case` except for files which tooling requires (e.g., Java
  sources, Python modules under `__pycache__`). Filenames not bound by tooling **SHALL** use
  `lower-kebab-case`; root meta-markdown files **SHALL** use the conventional `UPPER-CASE.md` form.
- **WHEN** `docker-compose config` is run after the cleanup, the command **SHALL** exit 0.
- **WHEN** `cd backend && mvn clean package` is run after the cleanup, the build **SHALL** succeed.
- **WHEN** `cd frontend && npm ci && npm run build && npx tsc --noEmit` is run after the cleanup,
  all three commands **SHALL** succeed.
- **WHEN** `.github/workflows/ci.yml` runs on the cleanup branch, the workflow **SHALL** complete
  with status `success`.
- **WHEN** the team needs to recover any deleted file post-merge, the file **SHALL** be retrievable
  via `git log --diff-filter=D --name-only` and `git checkout <sha>~1 -- <path>`.

## 4. Architecture — target canonical layout

```
nu-aura/
├── README.md
├── LICENSE
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
├── CLAUDE.md
├── MEMORY.md
├── pom.xml
├── Dockerfile
├── docker-compose.yml
├── docker-compose.override.yml
├── docker-compose.prod.yml
├── .env.example
├── .env.production.example
├── .gitignore .dockerignore .editorconfig .mcp.json skills-lock.json
│
├── backend/           # Java Spring Boot — internals untouched
├── frontend/          # Next.js 14 — internals untouched
│
├── docs/
│   ├── README.md      # index of docs
│   ├── adr/           # architecture decisions
│   ├── prd/           # product requirements
│   ├── architecture/  # absorbs build-kit/ + themes/*.md
│   ├── design-system/ # absorbs themes/ PDFs
│   ├── agents/        # consolidates 7 agent-team docs
│   ├── qa/            # active test plans only (history dropped)
│   ├── runbooks/
│   ├── api/
│   └── superpowers/   # specs/, plans/ — unchanged
│
├── scripts/
│   ├── README.md
│   ├── dev/           # start-dev, stop-dev
│   ├── db/            # db-export/import, seed, promote-superadmin
│   ├── docker/        # docker-* utilities
│   ├── qa/            # qa-orchestrator, screenshot, test-ui
│   └── setup/         # claude-personal, install-it2, claude-commands
│
├── infra/             # NEW — consolidates ops
│   ├── deployment/    # from deployment/
│   ├── monitoring/    # from monitoring/ + root prometheus.yml
│   └── mvn-local-deps/# from lib/, renamed for clarity
│
└── .github/  .vscode/  .idea/  .claude/
```

Root drops from 27 non-dot files to 13.

## 5. Naming convention

| Path kind                                  | Rule                           | Examples                                                         |
|--------------------------------------------|--------------------------------|------------------------------------------------------------------|
| Root meta-markdown                         | `UPPER-CASE.md` (conventional) | `README.md`, `LICENSE`, `CHANGELOG.md`, `CLAUDE.md`, `MEMORY.md` |
| All other files (non-source)               | `lower-kebab-case.{ext}`       | `agent-teams.md`, `start-dev.sh`, `screenshot-all-pages.ts`      |
| All directories                            | `lower-kebab-case/`            | `docs/agents/`, `scripts/db/`, `infra/monitoring/`               |
| Source files (Java, Python, TS components) | Language convention            | `UserService.java`, `test_ui.py`, `UserProfile.tsx`              |
| Dated artifacts (if ever needed)           | `YYYY-MM-DD-slug.md` prefix    | `2026-04-02-gap-analysis.md`                                     |

Forbidden in non-source paths: `UPPER_SNAKE.md`, `lower_snake.{md,sh,ts,json}`, `MixedCase`
directories.

## 6. Components

### 6.1 `docs/` buckets

| Bucket                | Purpose                            | Contents                                                                                                                                                                                                                                     |
|-----------------------|------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `docs/adr/`           | Architecture decision records      | One file per decision, `NNN-slug.md`                                                                                                                                                                                                         |
| `docs/prd/`           | Product requirements               | `requirements.md` (formerly root `REQUIREMENTS.md`)                                                                                                                                                                                          |
| `docs/architecture/`  | Current system architecture        | Merged from `docs/architecture/` + `docs/build-kit/` + `themes/*.md`                                                                                                                                                                         |
| `docs/design-system/` | Design tokens, theming             | Merged from `themes/` PDFs                                                                                                                                                                                                                   |
| `docs/agents/`        | Subagent prompts & team config     | Consolidates `AGENTS.md`, `TEAMS.md`, `NU-AURA-AGENT-TEAM.md`, `USAGE-GUIDE.md`, and `docs/{AGENT-TEAMS-MASTER-REFERENCE, PROD-READY-AGENT-TEAM-PROMPT, QA-AGENT-TEAM-PROMPT}.md` into `overview.md`, `teams.md`, `usage.md`, `prompts/*.md` |
| `docs/qa/`            | Active test plans only             | Loose dated reports purged; new policy is in `docs/qa/README.md`                                                                                                                                                                             |
| `docs/runbooks/`      | Operational runbooks               | Unchanged                                                                                                                                                                                                                                    |
| `docs/api/`           | API documentation                  | Unchanged                                                                                                                                                                                                                                    |
| `docs/superpowers/`   | Specs & plans for AI-assisted work | `specs/` and `plans/` unchanged                                                                                                                                                                                                              |

### 6.2 `scripts/` namespaces

| Namespace         | Contents                                                                                                                                                |
|-------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------|
| `scripts/dev/`    | `start-dev.sh`, `stop-dev.sh`                                                                                                                           |
| `scripts/db/`     | `db-export.sh`, `db-import.sh`, `db-migrate-manual.sql`, `promote-superadmin.sql`, `README.md` (formerly `SEED_DATA_README.md`)                         |
| `scripts/docker/` | `docker-db-export.sh`, `docker-db-import.sh`, `docker-full-export.sh`, `docker-init-db.sh`, `docker-volume-export.sh`                                   |
| `scripts/qa/`     | `qa-orchestrator/` (without `node_modules/`), `screenshot-all-pages.ts`, `test-ui-with-ai.py`, `generate-ai-workshop-ppt.py`, `apply-compact-design.sh` |
| `scripts/setup/`  | `setup-claude-personal.sh`, `install-it2.sh`, `claude-commands.sh`                                                                                      |

`scripts/migrate-nuhire-to-nuaura.mjs` is deleted (one-time migration, completed).
`scripts/docker-compose.yml` is reviewed — if it duplicates root, delete; if it has a distinct
purpose, move to `scripts/docker/`.

### 6.3 `infra/` (new top-level)

| Path                    | Contents                                                 | Notes                                                              |
|-------------------------|----------------------------------------------------------|--------------------------------------------------------------------|
| `infra/deployment/`     | Verbatim move from `deployment/`                         | Update `cloudbuild.yaml` paths if relative                         |
| `infra/monitoring/`     | Verbatim move from `monitoring/` + root `prometheus.yml` | Update `docker-compose.yml` mounts                                 |
| `infra/mvn-local-deps/` | Verbatim move from `lib/`, renamed                       | Update `.github/workflows/ci.yml` `mvn install:install-file` lines |

### 6.4 Backend internals

The package and module structure inside `backend/src/main/java/...` is **out of scope** — we do not
touch Java packages. The rest of `backend/` is in scope:

| Path                                                                                                                                                                                    | Disposition                                                                                                   |
|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------|
| `backend/src/`, `backend/pom.xml`, `backend/Dockerfile`, `backend/start-backend.sh`, `backend/setup-db.sh`, `backend/.env.example`, `backend/.gitignore`, `backend/.env` *(gitignored)* | Keep                                                                                                          |
| `backend/docker/init-db.sql`                                                                                                                                                            | Keep — Docker bootstrap belongs with backend                                                                  |
| `backend/docs/assets/`                                                                                                                                                                  | Move to `docs/architecture/backend-assets/` (the only thing under `backend/docs/`)                            |
| `backend/DEVELOPER_CHECKLIST.md`, `backend/TESTING_GUIDE.md`                                                                                                                            | Move to `docs/runbooks/backend-developer-checklist.md` and `docs/runbooks/backend-testing-guide.md`           |
| `backend/logs/` *(98 MB of committed logs)*                                                                                                                                             | **Delete**, add `backend/logs/` to `.gitignore`                                                               |
| `backend/.next/` *(Next.js artifact inside a Java service — error)*                                                                                                                     | **Delete**, ensure `**/.next/` is gitignored                                                                  |
| `backend/docker-compose.yml` *(second compose, 2.4 KB, comment notes "postgres removed — using Neon")*                                                                                  | **Delete** — diverges from root `docker-compose.yml`; if needed later, re-introduce under `infra/deployment/` |
| `backend/anthropic-ai-sdk-0.78.0.tgz`                                                                                                                                                   | **Delete** — stray dependency tarball                                                                         |
| `backend/backend-*.log`, `backend/frontend-run.log`, `backend/test-output.txt` (17 MB)                                                                                                  | **Delete** + gitignore                                                                                        |
| `backend/create_project_result*.json`, `backend/login_result*.json`, `backend/projects_result*.json` (7 files)                                                                          | **Delete** + gitignore pattern                                                                                |
| `backend/.claude/`, `backend/.github/` *(stray sub-folder copies)*                                                                                                                      | **Delete** — `.claude/` and `.github/` are root-level concerns; the backend copies are accidents              |

### 6.5 Frontend internals

The `app/`, `components/`, `lib/`, `hooks/`, `public/`, `styles/` structure inside `frontend/` is *
*out of scope** — we do not move Next.js routes or component libraries. The rest of `frontend/` is
in scope:

| Path                                                                                                                                                                                                                                                                                                                                                                                       | Disposition                                                                                 |
|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------|
| Build configs: `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.typecheck.json`, `next.config.js`, `next-env.d.ts`, `middleware.ts`, `tailwind.config.js`, `tailwind.config.aura-dark.js`, `postcss.config.js`, `playwright.config.ts`, `vitest.config.ts`, `vitest.setup.ts`, `sockjs-client.d.ts`, `nu-rbac.config.ts`, `.eslintrc.json`, `.eslintignore`, `.env.example` | Keep                                                                                        |
| `frontend/Dockerfile`, `frontend/start-frontend.sh`                                                                                                                                                                                                                                                                                                                                        | Keep                                                                                        |
| `frontend/__tests__/` *(vitest unit tests, 7 files)*                                                                                                                                                                                                                                                                                                                                       | Keep — conventional vitest path                                                             |
| `frontend/e2e/` *(Playwright e2e specs, 142 files)*                                                                                                                                                                                                                                                                                                                                        | Keep — canonical e2e location                                                               |
| `frontend/playwright/` *(only contains `.auth/user.json`)*                                                                                                                                                                                                                                                                                                                                 | Move `.auth/` into `frontend/e2e/.auth/`, delete the empty `playwright/` directory          |
| `frontend/playwright-report/`, `frontend/test-results/` (2,166 entries), `frontend/sessions/`                                                                                                                                                                                                                                                                                              | **Delete** + gitignore — all generated/ephemeral                                            |
| `frontend/.next/`, `frontend/.vercel/`                                                                                                                                                                                                                                                                                                                                                     | **Delete** + gitignore — build cache and Vercel state                                       |
| `frontend/.claude/`                                                                                                                                                                                                                                                                                                                                                                        | **Delete** — `.claude/` is a root-level concern                                             |
| `frontend/eslint-plugin-nu-aura/`                                                                                                                                                                                                                                                                                                                                                          | Keep if it has contents; **delete** if empty (the audit showed it empty in the listing)     |
| `frontend/docs/`                                                                                                                                                                                                                                                                                                                                                                           | Move contents into root `docs/`, then delete the directory                                  |
| `frontend/frontend-run.log`, `frontend/frontend.log` (23 KB), `frontend/nohup.out` (41 KB)                                                                                                                                                                                                                                                                                                 | **Delete** + gitignore                                                                      |
| `frontend/nu-rbac-report.json` (1.4 MB), `frontend/migration-report.md`, `frontend/unconvertible-classes.json`                                                                                                                                                                                                                                                                             | **Delete** + gitignore                                                                      |
| `frontend/spinner-mega-preview.html` (118 KB), `frontend/spinner-preview-v2.html` (37 KB)                                                                                                                                                                                                                                                                                                  | **Delete** — demo HTML, copy salvage-worthy bits into `docs/design-system/` first if needed |
| `frontend/tsconfig.tsbuildinfo` (719 KB)                                                                                                                                                                                                                                                                                                                                                   | **Delete** + gitignore (generated)                                                          |

### 6.6 docs/ subfolders not yet covered

| Path                                                                                                                                                                                                                                       | Disposition                                                                                                                   |
|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------|
| `docs/handover/PROJECT-HANDOVER.md`                                                                                                                                                                                                        | Keep — rename to `docs/handover/project-handover.md`                                                                          |
| `docs/presentations/` (2 .pptx files)                                                                                                                                                                                                      | Keep, rename to kebab-case                                                                                                    |
| `docs/screenshots/key-screens/`                                                                                                                                                                                                            | Keep — reference images                                                                                                       |
| `docs/screenshots/qa-sweep-2026-05-02/`                                                                                                                                                                                                    | **Delete** — dated QA screenshot dump                                                                                         |
| `docs/assets/NU logo.png`, `docs/assets/symbol-03.png`                                                                                                                                                                                     | Keep — brand assets                                                                                                           |
| `docs/assets/Nu Talent Management System*.pdf` (2 files)                                                                                                                                                                                   | **Delete** — old project name (pre-rename to NU-AURA)                                                                         |
| `docs/audit/` (4 active audit MDs: kafka-idempotency, soft-delete, spring-boot upgrade, wave-10)                                                                                                                                           | Keep — these are scoped technical audits, not dated point-in-times                                                            |
| `docs/build-kit/`                                                                                                                                                                                                                          | Merge into `docs/architecture/`                                                                                               |
| `docs/validation/` (47 loop QA logs)                                                                                                                                                                                                       | **Delete** — `git log` preserves                                                                                              |
| Loose `.md` at `docs/` root (7 files: `AGENT-TEAMS-MASTER-REFERENCE`, `PLATFORM-STATUS-2026-04-05`, `PROD-READY-AGENT-TEAM-PROMPT`, `PRODUCTION-READINESS-REPORT`, `QA-AGENT-TEAM-PROMPT`, `QA-SIGNOFF-REPORT`, `TEST-PLAN-RBAC-USECASES`) | Distribute: agent-team docs → `docs/agents/`; QA-signoff/readiness/test-plan → `docs/qa/`; dated platform-status → **delete** |

### 6.7 Left alone (justification)

These directories are intentionally untouched. Listing them so reviewers know we did not forget
them:

| Path                                                                                                                | Why untouched                                                              |
|---------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------|
| `.github/`                                                                                                          | CI workflows — only the path references inside `ci.yml` change (commit 10) |
| `.claude/`                                                                                                          | AI tooling config required by CLAUDE.md; team-shared, version-controlled   |
| `.idea/`, `.vscode/`                                                                                                | IDE configs; checked into the repo by team convention                      |
| `backend/src/` (Java package tree)                                                                                  | Out of scope — package refactors are separate from layout cleanup          |
| `frontend/app/`, `frontend/components/`, `frontend/lib/`, `frontend/hooks/`, `frontend/public/`, `frontend/styles/` | Out of scope — Next.js code refactors are separate                         |
| `.mcp.json`, `.dockerignore`, `.editorconfig`, `.gitignore` (root)                                                  | Tooling configs that must remain at root                                   |
| `skills-lock.json`                                                                                                  | Lock file referenced by skill loader                                       |

## 7. Disposition: what dies, moves, stays

### 7.1 Deleted outright (with `git rm`)

| Path                                                                                                                                                                                            | Reason                                                                             |
|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| `setup-claude-personal.sh`, `start-dev.sh`, `stop-dev.sh`, `promote-superadmin.sql` *(root copies)*                                                                                             | Byte-identical duplicates of files in `scripts/`                                   |
| `nu-aura-dev.skill`, `nu-aura-qa.skill`, `nu-aura-full-platform-qa.skill`                                                                                                                       | Not in `skills-lock.json`; superseded by `.claude/skills/nu-aura-*`                |
| `nu-aura-dev/`, `nu-aura-qa/`                                                                                                                                                                   | Stale single-file dirs duplicating `.claude/skills/`                               |
| `config/`                                                                                                                                                                                       | Byte-identical to `deployment/config/` (which moves to `infra/deployment/config/`) |
| `railway.json`, `render.yaml`                                                                                                                                                                   | Zero references; project ships via GCP cloudbuild                                  |
| `script.sh`                                                                                                                                                                                     | One-off zshrc installer subsumed by `setup-claude-personal.sh`                     |
| `tools/`                                                                                                                                                                                        | Empty subtree                                                                      |
| `NU-AURA-QA-Report-2026-04-01.xlsx`                                                                                                                                                             | Frozen dated artifact                                                              |
| `qa-reports/`, `docs/validation/`, every loose file under `docs/qa/`                                                                                                                            | Aggressive delete per retention decision; `git log` is archive                     |
| `GAP-ANALYSIS-2026-04-02.md`, `HARDENING-AUDIT-RESULTS.md`, `ARCHITECTURE_GAP_REGISTER.md`, `EXECUTIVE-SUMMARY.md`, `docs/PLATFORM-STATUS-2026-04-05.md`                                        | Dated point-in-time audits                                                         |
| `backend/anthropic-ai-sdk-0.78.0.tgz`                                                                                                                                                           | Stray dependency tarball (509 KB)                                                  |
| `backend/*_result*.json` (7 files), `backend/backend-run.log`, `backend/test-output.txt`, `backend/*.log`, `backend/.next/`                                                                     | Committed runtime artifacts                                                        |
| `frontend/nu-rbac-report.json`, `frontend/nohup.out`, `frontend/spinner-*preview*.html`, `frontend/migration-report.md`, `frontend/unconvertible-classes.json`, `frontend/tsconfig.tsbuildinfo` | Generated reports + demo HTML                                                      |
| `scripts/qa-orchestrator/node_modules/`, `scripts/migrate-nuhire-to-nuaura.mjs`                                                                                                                 | `node_modules` committed; one-time migration done                                  |
| `docs/architecture/NU_AURA_PLATFORM_ARCHITECTURE.docx`, `docs/assets/Nu Talent Management System_25-Aug.pdf`                                                                                    | Old project name pre-rename                                                        |
| `.playwright-mcp/`, `.agents/`, `.DS_Store` (anywhere)                                                                                                                                          | Runtime trash and OS noise                                                         |

### 7.2 Moved and renamed

| From                                                                                                                                                                 | To                                                            |
|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------|
| `AGENTS.md` + `TEAMS.md` + `NU-AURA-AGENT-TEAM.md` + `USAGE-GUIDE.md` + `docs/{AGENT-TEAMS-MASTER-REFERENCE, PROD-READY-AGENT-TEAM-PROMPT, QA-AGENT-TEAM-PROMPT}.md` | `docs/agents/{overview,teams,usage,prompts/*}.md`             |
| `REQUIREMENTS.md`                                                                                                                                                    | `docs/prd/requirements.md`                                    |
| `SETUP.md`                                                                                                                                                           | Merged into `README.md`                                       |
| `SEED_DATA_README.md`                                                                                                                                                | `scripts/db/README.md`                                        |
| `themes/`                                                                                                                                                            | `docs/design-system/`                                         |
| `deployment/`                                                                                                                                                        | `infra/deployment/`                                           |
| `monitoring/`, root `prometheus.yml`                                                                                                                                 | `infra/monitoring/`                                           |
| `lib/`                                                                                                                                                               | `infra/mvn-local-deps/`                                       |
| `db/seed/V001__seed_data.sql`                                                                                                                                        | `backend/src/main/resources/db/migration/V001__seed_data.sql` |
| `scripts/{start-dev,stop-dev}.sh`                                                                                                                                    | `scripts/dev/`                                                |
| `scripts/{setup-claude-personal,install-it2,claude-commands}.sh`                                                                                                     | `scripts/setup/`                                              |
| `scripts/db-*.sh`, `scripts/docker-db-*.sh`, `scripts/promote-superadmin.sql`, `scripts/db-migrate-manual.sql`                                                       | `scripts/db/`                                                 |
| `scripts/docker-*.sh` (non-db)                                                                                                                                       | `scripts/docker/`                                             |
| `scripts/qa-orchestrator/`, `scripts/test_ui_with_ai.py`, `scripts/screenshot-all-pages.ts`, `scripts/generate_ai_workshop_ppt.py`                                   | `scripts/qa/` (renamed to kebab-case)                         |
| `docs/build-kit/*`                                                                                                                                                   | `docs/architecture/`                                          |
| `docs/{PRODUCTION-READINESS-REPORT, QA-SIGNOFF-REPORT, TEST-PLAN-RBAC-USECASES}.md`                                                                                  | `docs/qa/` (kebab-cased)                                      |

### 7.3 `.gitignore` additions

```
# build artifacts
*.log
nohup.out
*.tgz
**/.next/
**/test-results/
**/playwright-report/
**/tsconfig.tsbuildinfo

# tooling caches
**/.claude-flow/
**/.playwright-mcp/
**/node_modules/

# ad-hoc dev/test outputs
backend/*_result*.json
frontend/nu-rbac-report.json
sessions/
.vercel/

# OS noise
.DS_Store
```

### 7.4 Stays at root

`README.md`, `LICENSE`, `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CLAUDE.md`, `MEMORY.md`,
`pom.xml`, `Dockerfile`, `docker-compose.yml`, `docker-compose.override.yml`,
`docker-compose.prod.yml`, `.gitignore`, `.dockerignore`, `.editorconfig`, `.env.example`,
`.env.production.example`, `.mcp.json`, `skills-lock.json`, `.github/`, `.vscode/`, `.idea/`,
`.claude/`, `backend/`, `frontend/`.

## 8. Migration plan — commit structure

The PR `chore/repo-layout-cleanup` will be a single branch with a sequence of commits that can be
reviewed and reverted independently:

1. `chore: gitignore runtime artifacts` — `.gitignore` only, no removals yet.
2. `chore: delete committed runtime junk` — logs, `.next/`, tarballs, `*_result*.json`,
   `node_modules` under scripts/.
3. `chore: delete duplicate root scripts and stale .skill files` — byte-identical dups + dead skill
   files + `nu-aura-dev/`, `nu-aura-qa/`.
4. `chore: delete config/ duplicate and dead deploy configs` — `config/`, `railway.json`,
   `render.yaml`, `tools/`, `script.sh`.
5. `chore: delete dated audit and QA artifacts (history preserves)` — point-in-time audits,
   `qa-reports/`, `docs/qa/*` loose files, `docs/validation/`, `NU-AURA-QA-Report-2026-04-01.xlsx`.
6. `chore: move docs into canonical buckets` — `git mv` heavy commit for `docs/`.
7. `chore: introduce infra/ and move ops dirs` — `deployment/`, `monitoring/`, `prometheus.yml`,
   `lib/` (renamed).
8. `chore: namespace scripts/{dev,db,docker,qa,setup}` — script moves and kebab-case renames.
9. `chore: move db/seed into Flyway migration path` — relocate seed SQL.
10. `chore: update CI, docker-compose, and doc references` — fix every consumer of changed paths.
11. `docs: update README to reflect new layout + absorb SETUP.md` — narrative cleanup.

Every commit either passes the build cleanly or is paired with the consumer-update commit (commit
10).

### 8.1 Load-bearing reference updates

| File                                                                      | Change                                                                                            |
|---------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------|
| `.github/workflows/ci.yml`                                                | 3× `mvn install:install-file -Dfile=lib/...` → `infra/mvn-local-deps/...`                         |
| `docker-compose.yml`                                                      | `./prometheus.yml` → `./infra/monitoring/prometheus.yml`; `./monitoring/` → `./infra/monitoring/` |
| `docker-compose.prod.yml`, `docker-compose.override.yml`                  | Same paths as above                                                                               |
| `infra/deployment/deploy.sh` and other scripts inside `infra/deployment/` | Relative-path references to siblings, if any                                                      |
| `backend/start-backend.sh`                                                | Verify no path references; expected none                                                          |
| `README.md`, `CLAUDE.md`, `MEMORY.md`                                     | Update path references to docs, scripts, infra                                                    |
| `.idea/`, `.vscode/` workspace files                                      | Audit for hardcoded paths                                                                         |
| Any doc that links to a moved file                                        | `grep -r` for stale paths and patch                                                               |

## 9. Verification

The PR is not mergeable until all of these gates pass:

1. `cd backend && mvn clean package` succeeds.
2. `cd frontend && npm ci && npm run build && npx tsc --noEmit` all succeed.
3. `docker-compose config` validates (catches broken mount paths).
4. `docker-compose up -d postgres redis kafka` boots without error.
5. `./scripts/dev/start-dev.sh` successfully starts backend + frontend.
6. `.github/workflows/ci.yml` passes on the cleanup branch.
7. `grep -rn 'config/\|^lib/\|^prometheus.yml\|^railway.json\|^render.yaml'` across kept files
   returns zero matches that refer to the deleted locations.
8. `git status` is clean after a full build — no new untracked artifacts (proves `.gitignore`
   works).
9. Root non-dot file count is ≤ 15 (matches the EARS criterion).

## 10. Error handling and rollback

**Rollback at PR level.** Because each commit in the PR is independent, any single commit can be
reverted standalone with `git revert <sha>`. If the post-merge build breaks unexpectedly,
`git revert <merge-commit>` restores the entire layout.

**File recovery.** Every removed file remains recoverable via:

```bash
git log --diff-filter=D --name-only --since="2026-05-13"
git checkout <sha>~1 -- <path>
```

**Risk register.**

| Risk                                                  | Mitigation                                                                                   |
|-------------------------------------------------------|----------------------------------------------------------------------------------------------|
| CI breaks on `lib/` rename                            | Verification gate 6 catches it; rename + CI update bundled in commit 10                      |
| Docker mount breaks for prometheus                    | Verification gates 3 and 4 catch it before merge                                             |
| Open feature branches conflict with moves             | One-PR strategy minimises rebase pain; team is asked to land or abandon stale branches first |
| Skill loader breaks if `.skill` files were referenced | Audit confirmed zero references in `skills-lock.json`; re-verified in commit 3 message       |
| Team member has scripts bookmarked at old paths       | `CHANGELOG.md` entry in commit 11 lists every relocation                                     |
| Aggressive delete removes something still in use      | `git log` + `git reflog` retain everything; recovery procedure documented above              |

## 11. Testing strategy

This is a structural refactor — no application logic changes. The "tests" are the verification gates
in section 9, plus:

- **Smoke test post-merge**: an engineer pulls `main`, runs `./scripts/dev/start-dev.sh`, opens the
  frontend, signs in as SuperAdmin, navigates one page. If that flow works, the move did not break
  the developer loop.
- **CI on the cleanup branch**: must complete green before merge.
- **No new tests are added** as part of this PR — adding test code would mix concerns.

## 12. Scope evolution — phase 1 vs program

This spec originally scoped a single cleanup PR. After the user's "internals too" decision, the
program expanded to **7 sequential phases**. **Phase 1 alone** is what sections 1–11 above describe
in detail (surface cleanup, no internal refactors). Phases 2–7 are summarised in section 13 and
detailed in the plan document at `docs/superpowers/plans/2026-05-13-repo-layout-cleanup-plan.md`.

Items moved **from "out of scope" into scope** (Phases 2–5):

- Reorganising `backend/src/main/java/...` package structure → **Phase 4**
- Reorganising `frontend/app/`, `frontend/components/`, `frontend/lib/` → **Phase 3**
- Adding tests for the 363 domain + 311 infrastructure + 27 untested `api/` modules → **Phase 5**
- Adding missing CI workflows (PR validation, security scan, deploy) → **Phase 6**
- Rationalising the 10 overlapping QA/e2e/fix skills → **Phase 7**
- Merging `docs/architecture/` + `docs/build-kit/` into one tree → **Phase 2**

Items that **remain out of scope** for the entire program:

- Migrating to a generic monorepo layout (`apps/`, `libs/`)
- Rewriting documentation content beyond consolidation and naming normalisation
- Behavioural changes to deploy, infra, or runtime (no functional change anywhere)
- Touching open feature branches; team is asked to land or abandon them before each phase

## 13. Implementation phases (locked decisions)

### 13.0 Locked user decisions

| Decision | Value | Effect |
|---|---|---|
| Java root package | **Rename `com.hrms` → `com.nulogic`** | Phase 4a touches ~1,800 Java files (every `import`, `@ComponentScan`, `package` line, `application.yml` `base-package` ref, serialised class FQNs in JPA / Kafka payloads) |
| Frontend API layer | **Split by kind** — `lib/api/` = raw axios clients, `lib/services/` = business logic over them | Phase 3b enforces the boundary, no mass migration |
| Architecture docs | **Merge into `docs/architecture/`** | Phase 2 merges `docs/build-kit/` content into topic-keyed subfolders under `docs/architecture/`; build-kit folder removed |
| Route winners | `organization-chart` (delete `org-chart`); `calendar` (delete `nu-calendar`); **keep both `goals/` and `okr/`** as separate routes (different concepts — Goals = personal/team, OKR = framework); nest `letters/templates` (delete `letter-templates`); nest `statutory/filings` (delete `statutory-filings`) | Phase 3a — redirects in `middleware.ts`, sidebar update |
| PR shape | **One PR per phase, sequential** | 7 PRs, each merges before the next is branched |
| Test strategy | **Full backfill** — tests for 363 domain + 311 infra classes + 27 untested `api/` modules | Phase 5 is the longest phase (~3–4 weeks) |

### 13.1 Phase map

| Phase | Branch | Scope | Risk | Effort |
|---|---|---|---|---|
| **1** | `chore/repo-layout-cleanup` | Sections 6.1–6.24: deletes, moves, gitignore, `infra/` introduction, naming convention | Low — mechanical | 1 day |
| **2** | `chore/docs-consolidation` | Merge `docs/build-kit/` into `docs/architecture/` by topic; fix ADR-001..004 collision; normalise filename casing across `docs/`; rewrite `docs/architecture/README.md` as the new index | Low — editorial | 1–2 days |
| **3** | `chore/frontend-internals` | (a) Route consolidation + `middleware.ts` redirects + sidebar update; (b) Enforce `lib/api/` vs `lib/services/` boundary; relocate `lib/{utils,websocket,design-system}.ts`; (c) Auth hooks audit + consolidation; (d) Components dedup | Medium — touches imports across every consuming page | 3–5 days |
| **4** | `chore/backend-internals` | (a) Rename `com.hrms` → `com.nulogic`; (b) Move `domain/{kafka,ai,file,event,tenant,bgv}` → `infrastructure/`; (c) Rationalise `application/{admin,dashboard,mobile,publicapi,security,migration,meeting,home}`; (d) Consolidate `config/` package | **High** — Spring `@ComponentScan`, JPA entity registration, Kafka topics, serialised class FQNs in DB / Kafka payloads | 5–7 days |
| **5** | `chore/test-coverage-backfill` | Backfill JaCoCo to 80%: tests for 27 untested `api/` modules, 363 domain classes, 311 infrastructure classes. Sub-phased 5a/5b/5c | Medium — net-additive code | 3–4 weeks |
| **6** | `chore/ci-workflows` | Add `pr-validation.yml`, `security-scan.yml`, `deploy.yml` | Low | 1–2 days |
| **7** | `chore/skill-rationalisation` | Pick canonical skills from the 10 QA/e2e/fix variants; deprecate rest; update `MEMORY.md` and `CLAUDE.md` | Low | 1.5 days |

**Total program: ~5–6 weeks of focused work.**

### 13.2 Per-phase verification gates

Every phase PR must pass these gates before merge:

1. `cd backend && mvn clean package` succeeds
2. `cd frontend && npm ci && npm run build && npx tsc --noEmit` all succeed
3. `docker-compose config` validates
4. `.github/workflows/ci.yml` passes on the branch
5. `git status` clean after a full build
6. Smoke test: `./scripts/dev/start-dev.sh`, sign in as SuperAdmin, navigate one page

**Phase 4a (Java rename) additionally requires:**

- `application.yml` `spring.kafka.consumer.value-deserializer.spring.json.trusted.packages` updated
- Any `@JsonTypeInfo` / `@JsonSubTypes` annotations with FQN strings updated
- Verification: `git grep "com\.hrms"` returns zero matches (incl. resources/, test/, .yml configs)
- Kafka payloads in flight when the new code deploys: Phase 4a includes a one-week dual-class-alias
  window (both `com.hrms.X` and `com.nulogic.X` deserializable) before old aliases are removed

**Phase 5 additionally requires:**

- JaCoCo report shows ≥80% line coverage per module
- No flaky tests in 3 consecutive CI runs

### 13.3 Cross-phase dependencies

- **Phase 1 → 2**: Phase 1 introduces `docs/` bucket structure; Phase 2 fills it.
- **Phase 2 → 3**: Frontend docs in `docs/architecture/frontend/` get updated when Phase 3 changes
  routes/lib boundaries.
- **Phase 3 → 4**: Independent of backend internals; sequential per user choice.
- **Phase 4 → 5**: Tests must reference post-rename package paths; backfilling first would force
  rewrite after Phase 4.
- **Phase 5 → 6**: New CI workflows in Phase 6 run the now-existing tests from Phase 5.
- **Phase 7**: Independent of others; can land anytime after Phase 1.

### 13.4 Rollback boundaries

Each phase merges into `main` independently. Rollback is `git revert <merge-commit>` at phase
granularity. **No phase depends on a later phase shipping** — if Phase 4 stalls, Phases 1–3 remain
in `main` and are not undone.

## 14. Open questions

All previously open questions are resolved by the locked decisions in section 13.0. One question
carried into the plan document:

- **Sub-phasing of Phase 5**: ship as one PR (4 weeks on one branch) or three sub-PRs
  (5a = `api/` modules, 5b = `domain/`, 5c = `infrastructure/`)?
  **Recommendation: three sub-PRs** to keep review surface tractable. Resolved in the plan document.

## 15. Status

- **Spec status:** Approved by user (2026-05-13). All open questions resolved.
- **Next action:** Hand off to `writing-plans` skill for the detailed phase-by-phase implementation
  plan at `docs/superpowers/plans/2026-05-13-repo-layout-cleanup-plan.md`.
