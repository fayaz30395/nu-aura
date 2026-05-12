# Repo layout cleanup — design

- **Date:** 2026-05-13
- **Author:** Fayaz (with AI architect)
- **Status:** Draft — awaiting user sign-off
- **Branch:** `chore/repo-layout-cleanup` (proposed)
- **Related:** none

## 1. Problem statement

The NU-AURA monorepo has accumulated four years of organisational drift. Concretely:

- **27 non-dot files at the project root**, only ~13 of which are conventional repo metadata. The rest are scattered markdown docs, ad-hoc shell scripts, dated reports, dead deploy configs, and skill files.
- **Four naming conventions** coexist (`UPPER-KEBAB.md`, `lower-kebab.sh`, `UPPER_SNAKE.md`, `lower_snake.py`) with no enforced rule.
- **Provable duplication**: four byte-identical scripts at root and in `scripts/`, a `config/` directory byte-identical to `deployment/config/`, three stale `.skill` files duplicating `.claude/skills/nu-aura-*`, and pre-rename PDFs referring to the project as "NuHire" or "Nu Talent".
- **Committed runtime artifacts**: 16 MB `backend/backend-run.log`, 17 MB `backend/test-output.txt`, a 1.4 MB `frontend/nu-rbac-report.json`, `.next/` directory inside the Java backend, `node_modules/` committed under `scripts/qa-orchestrator/`, ad-hoc API-probe JSONs.
- **QA data sprawl**: `qa-reports/` (root), `docs/qa/` (~25,110 files), `docs/validation/` (47 loop logs), `frontend/test-results/` (882 entries), and `scripts/qa-orchestrator/` — six locations, no retention policy.
- **Overlapping docs**: seven files on the same "agent teams" topic spread across root and `docs/`; three architecture buckets (`docs/architecture/`, `docs/build-kit/`, `themes/`); dated audits never moved to an archive.

The drift makes onboarding hard, makes `git grep` noisy, bloats the working tree, and erodes the team's ability to find authoritative documents.

## 2. Goals and non-goals

**Goals**

1. Reduce root-level files to conventional repo metadata only (~13 entries, all expected by tools or universally understood).
2. Establish a single canonical layout for `docs/`, `scripts/`, and ops/infra.
3. Enforce one naming convention across files and directories.
4. Remove committed runtime artifacts and update `.gitignore` to prevent regression.
5. Delete dated point-in-time reports and duplicated content; git history is the archive.
6. Land the entire cleanup as a single, commit-structured PR that is reviewable, revertible, and verifiable against CI.

**Non-goals**

1. Restructuring the internals of `backend/` (Java packages) or `frontend/` (Next.js App Router). Those remain untouched.
2. Migrating to a generic monorepo layout (`apps/`, `libs/`). NU-AURA is one application with one backend and one frontend; the cost of that restructure exceeds its benefit today.
3. Rewriting documentation content. We move and rename; we do not re-author.
4. Touching `.claude/`, `.github/workflows/` content beyond path references, or any open feature branches.

## 3. Requirements (EARS)

User stories first, then the formal acceptance criteria.

### 3.1 User stories

- **As a new engineer onboarding the repo**, I want the project root to surface only meta files and entry points, so that I can locate what I need without guessing.
- **As an engineer searching for a document**, I want each kind of document (PRD, ADR, runbook, agent prompt, QA plan) in a single canonical bucket, so that I do not chase the same topic across multiple folders.
- **As a CI / DevOps maintainer**, I want all infra (deployment, monitoring, local Maven deps) consolidated under one top-level directory, so that infra changes do not touch four unrelated places.
- **As a reviewer of this cleanup PR**, I want the diff structured as independent commits, so that I can review or revert by concern.
- **As the team**, I want the working tree free of committed logs, build artifacts, and generated reports, so that `git status` is meaningful and clones are fast.

### 3.2 EARS acceptance criteria

- **WHEN** the cleanup PR is merged, the project root **SHALL** contain at most 15 non-dot files, and all of them **SHALL** be: a conventional meta-markdown (`README`, `LICENSE`, `CHANGELOG`, `CONTRIBUTING`, `SECURITY`, `CLAUDE`, `MEMORY`), a build manifest (`pom.xml`), a container manifest (`Dockerfile`), or a `docker-compose*.yml` file.
- **WHEN** the cleanup PR is merged, the repo **SHALL NOT** contain a file matching `*.log`, `nohup.out`, `*.tgz`, `*/test-results/*`, `*/playwright-report/*`, `*/.next/*`, or `**/node_modules/**` under tracked paths.
- **IF** a file documents a dated point-in-time event (gap analysis, hardening audit, executive summary), **THEN** it **SHALL** be removed from the tree (history retains it) — no archive directory is introduced.
- **IF** two files at different paths have identical content (verified via SHA-256), **THEN** the cleanup **SHALL** retain exactly one and delete the other.
- **WHEN** the cleanup PR is merged, no file or directory name in the tree **SHALL** use `UPPER_SNAKE_CASE` or `lower_snake_case` except for files which tooling requires (e.g., Java sources, Python modules under `__pycache__`). Filenames not bound by tooling **SHALL** use `lower-kebab-case`; root meta-markdown files **SHALL** use the conventional `UPPER-CASE.md` form.
- **WHEN** `docker-compose config` is run after the cleanup, the command **SHALL** exit 0.
- **WHEN** `cd backend && mvn clean package` is run after the cleanup, the build **SHALL** succeed.
- **WHEN** `cd frontend && npm ci && npm run build && npx tsc --noEmit` is run after the cleanup, all three commands **SHALL** succeed.
- **WHEN** `.github/workflows/ci.yml` runs on the cleanup branch, the workflow **SHALL** complete with status `success`.
- **WHEN** the team needs to recover any deleted file post-merge, the file **SHALL** be retrievable via `git log --diff-filter=D --name-only` and `git checkout <sha>~1 -- <path>`.

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

| Path kind | Rule | Examples |
|---|---|---|
| Root meta-markdown | `UPPER-CASE.md` (conventional) | `README.md`, `LICENSE`, `CHANGELOG.md`, `CLAUDE.md`, `MEMORY.md` |
| All other files (non-source) | `lower-kebab-case.{ext}` | `agent-teams.md`, `start-dev.sh`, `screenshot-all-pages.ts` |
| All directories | `lower-kebab-case/` | `docs/agents/`, `scripts/db/`, `infra/monitoring/` |
| Source files (Java, Python, TS components) | Language convention | `UserService.java`, `test_ui.py`, `UserProfile.tsx` |
| Dated artifacts (if ever needed) | `YYYY-MM-DD-slug.md` prefix | `2026-04-02-gap-analysis.md` |

Forbidden in non-source paths: `UPPER_SNAKE.md`, `lower_snake.{md,sh,ts,json}`, `MixedCase` directories.

## 6. Components

### 6.1 `docs/` buckets

| Bucket | Purpose | Contents |
|---|---|---|
| `docs/adr/` | Architecture decision records | One file per decision, `NNN-slug.md` |
| `docs/prd/` | Product requirements | `requirements.md` (formerly root `REQUIREMENTS.md`) |
| `docs/architecture/` | Current system architecture | Merged from `docs/architecture/` + `docs/build-kit/` + `themes/*.md` |
| `docs/design-system/` | Design tokens, theming | Merged from `themes/` PDFs |
| `docs/agents/` | Subagent prompts & team config | Consolidates `AGENTS.md`, `TEAMS.md`, `NU-AURA-AGENT-TEAM.md`, `USAGE-GUIDE.md`, and `docs/{AGENT-TEAMS-MASTER-REFERENCE, PROD-READY-AGENT-TEAM-PROMPT, QA-AGENT-TEAM-PROMPT}.md` into `overview.md`, `teams.md`, `usage.md`, `prompts/*.md` |
| `docs/qa/` | Active test plans only | Loose dated reports purged; new policy is in `docs/qa/README.md` |
| `docs/runbooks/` | Operational runbooks | Unchanged |
| `docs/api/` | API documentation | Unchanged |
| `docs/superpowers/` | Specs & plans for AI-assisted work | `specs/` and `plans/` unchanged |

### 6.2 `scripts/` namespaces

| Namespace | Contents |
|---|---|
| `scripts/dev/` | `start-dev.sh`, `stop-dev.sh` |
| `scripts/db/` | `db-export.sh`, `db-import.sh`, `db-migrate-manual.sql`, `promote-superadmin.sql`, `README.md` (formerly `SEED_DATA_README.md`) |
| `scripts/docker/` | `docker-db-export.sh`, `docker-db-import.sh`, `docker-full-export.sh`, `docker-init-db.sh`, `docker-volume-export.sh` |
| `scripts/qa/` | `qa-orchestrator/` (without `node_modules/`), `screenshot-all-pages.ts`, `test-ui-with-ai.py`, `generate-ai-workshop-ppt.py`, `apply-compact-design.sh` |
| `scripts/setup/` | `setup-claude-personal.sh`, `install-it2.sh`, `claude-commands.sh` |

`scripts/migrate-nuhire-to-nuaura.mjs` is deleted (one-time migration, completed).
`scripts/docker-compose.yml` is reviewed — if it duplicates root, delete; if it has a distinct purpose, move to `scripts/docker/`.

### 6.3 `infra/` (new top-level)

| Path | Contents | Notes |
|---|---|---|
| `infra/deployment/` | Verbatim move from `deployment/` | Update `cloudbuild.yaml` paths if relative |
| `infra/monitoring/` | Verbatim move from `monitoring/` + root `prometheus.yml` | Update `docker-compose.yml` mounts |
| `infra/mvn-local-deps/` | Verbatim move from `lib/`, renamed | Update `.github/workflows/ci.yml` `mvn install:install-file` lines |

### 6.4 Backend internals

The package and module structure inside `backend/src/main/java/...` is **out of scope** — we do not touch Java packages. The rest of `backend/` is in scope:

| Path | Disposition |
|---|---|
| `backend/src/`, `backend/pom.xml`, `backend/Dockerfile`, `backend/start-backend.sh`, `backend/setup-db.sh`, `backend/.env.example`, `backend/.gitignore`, `backend/.env` *(gitignored)* | Keep |
| `backend/docker/init-db.sql` | Keep — Docker bootstrap belongs with backend |
| `backend/docs/assets/` | Move to `docs/architecture/backend-assets/` (the only thing under `backend/docs/`) |
| `backend/DEVELOPER_CHECKLIST.md`, `backend/TESTING_GUIDE.md` | Move to `docs/runbooks/backend-developer-checklist.md` and `docs/runbooks/backend-testing-guide.md` |
| `backend/logs/` *(98 MB of committed logs)* | **Delete**, add `backend/logs/` to `.gitignore` |
| `backend/.next/` *(Next.js artifact inside a Java service — error)* | **Delete**, ensure `**/.next/` is gitignored |
| `backend/docker-compose.yml` *(second compose, 2.4 KB, comment notes "postgres removed — using Neon")* | **Delete** — diverges from root `docker-compose.yml`; if needed later, re-introduce under `infra/deployment/` |
| `backend/anthropic-ai-sdk-0.78.0.tgz` | **Delete** — stray dependency tarball |
| `backend/backend-*.log`, `backend/frontend-run.log`, `backend/test-output.txt` (17 MB) | **Delete** + gitignore |
| `backend/create_project_result*.json`, `backend/login_result*.json`, `backend/projects_result*.json` (7 files) | **Delete** + gitignore pattern |
| `backend/.claude/`, `backend/.github/` *(stray sub-folder copies)* | **Delete** — `.claude/` and `.github/` are root-level concerns; the backend copies are accidents |

### 6.5 Frontend internals

The `app/`, `components/`, `lib/`, `hooks/`, `public/`, `styles/` structure inside `frontend/` is **out of scope** — we do not move Next.js routes or component libraries. The rest of `frontend/` is in scope:

| Path | Disposition |
|---|---|
| Build configs: `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.typecheck.json`, `next.config.js`, `next-env.d.ts`, `middleware.ts`, `tailwind.config.js`, `tailwind.config.aura-dark.js`, `postcss.config.js`, `playwright.config.ts`, `vitest.config.ts`, `vitest.setup.ts`, `sockjs-client.d.ts`, `nu-rbac.config.ts`, `.eslintrc.json`, `.eslintignore`, `.env.example` | Keep |
| `frontend/Dockerfile`, `frontend/start-frontend.sh` | Keep |
| `frontend/__tests__/` *(vitest unit tests, 7 files)* | Keep — conventional vitest path |
| `frontend/e2e/` *(Playwright e2e specs, 142 files)* | Keep — canonical e2e location |
| `frontend/playwright/` *(only contains `.auth/user.json`)* | Move `.auth/` into `frontend/e2e/.auth/`, delete the empty `playwright/` directory |
| `frontend/playwright-report/`, `frontend/test-results/` (2,166 entries), `frontend/sessions/` | **Delete** + gitignore — all generated/ephemeral |
| `frontend/.next/`, `frontend/.vercel/` | **Delete** + gitignore — build cache and Vercel state |
| `frontend/.claude/` | **Delete** — `.claude/` is a root-level concern |
| `frontend/eslint-plugin-nu-aura/` | Keep if it has contents; **delete** if empty (the audit showed it empty in the listing) |
| `frontend/docs/` | Move contents into root `docs/`, then delete the directory |
| `frontend/frontend-run.log`, `frontend/frontend.log` (23 KB), `frontend/nohup.out` (41 KB) | **Delete** + gitignore |
| `frontend/nu-rbac-report.json` (1.4 MB), `frontend/migration-report.md`, `frontend/unconvertible-classes.json` | **Delete** + gitignore |
| `frontend/spinner-mega-preview.html` (118 KB), `frontend/spinner-preview-v2.html` (37 KB) | **Delete** — demo HTML, copy salvage-worthy bits into `docs/design-system/` first if needed |
| `frontend/tsconfig.tsbuildinfo` (719 KB) | **Delete** + gitignore (generated) |

### 6.6 docs/ subfolders not yet covered

| Path | Disposition |
|---|---|
| `docs/handover/PROJECT-HANDOVER.md` | Keep — rename to `docs/handover/project-handover.md` |
| `docs/presentations/` (2 .pptx files) | Keep, rename to kebab-case |
| `docs/screenshots/key-screens/` | Keep — reference images |
| `docs/screenshots/qa-sweep-2026-05-02/` | **Delete** — dated QA screenshot dump |
| `docs/assets/NU logo.png`, `docs/assets/symbol-03.png` | Keep — brand assets |
| `docs/assets/Nu Talent Management System*.pdf` (2 files) | **Delete** — old project name (pre-rename to NU-AURA) |
| `docs/audit/` (4 active audit MDs: kafka-idempotency, soft-delete, spring-boot upgrade, wave-10) | Keep — these are scoped technical audits, not dated point-in-times |
| `docs/build-kit/` | Merge into `docs/architecture/` |
| `docs/validation/` (47 loop QA logs) | **Delete** — `git log` preserves |
| Loose `.md` at `docs/` root (7 files: `AGENT-TEAMS-MASTER-REFERENCE`, `PLATFORM-STATUS-2026-04-05`, `PROD-READY-AGENT-TEAM-PROMPT`, `PRODUCTION-READINESS-REPORT`, `QA-AGENT-TEAM-PROMPT`, `QA-SIGNOFF-REPORT`, `TEST-PLAN-RBAC-USECASES`) | Distribute: agent-team docs → `docs/agents/`; QA-signoff/readiness/test-plan → `docs/qa/`; dated platform-status → **delete** |

### 6.7 docs/adr/ vs docs/build-kit/ — ADR numbering collision (in scope)

**Problem:** Two parallel ADR series exist with clashing numbers and inconsistent casing:

| `docs/adr/` (lowercase-kebab) | `docs/build-kit/` (UPPERCASE-KEBAB) |
|---|---|
| ADR-001-multi-tenant-architecture.md | ADR-001-THEME-CONSOLIDATION.md |
| ADR-002-authentication-strategy.md | ADR-002-JWT-TOKEN-OPTIMIZATION.md |
| ADR-003-caching-strategy.md | ADR-003-PAYROLL-SAGA-PATTERN.md |
| ADR-004-webhook-delivery-system.md | ADR-004-RECRUITMENT-ATS-GAP-ANALYSIS.md |
| — | ADR-005-DATABASE-CONNECTION-POOL-SIZING.md |

Plus `docs/build-kit/ADR-INDEX.md`.

**Action (in cleanup PR):** Move `docs/build-kit/ADR-*` into `docs/adr/`, renumber to ADR-005…ADR-009, normalise all to lowercase-kebab (`adr-005-theme-consolidation.md`, etc.), update `docs/build-kit/ADR-INDEX.md` content into a new `docs/adr/README.md` that supersedes the existing one.

### 6.8 docs/architecture/ vs docs/build-kit/ (deferred)

These two folders both hold architecture docs with overlapping topics (`docs/architecture/OBSERVABILITY.md` vs `docs/build-kit/15_OBSERVABILITY.md`, etc.). Filename casing is inconsistent within each (CamelCase + kebab + SCREAMING_SNAKE). Picking a canonical source and deprecating the other is an editorial decision, not a layout change. **Deferred to `adr-010-documentation-consolidation`**. This PR only moves them together as cousins (no content merge, no file deletion beyond what 6.7 covers).

### 6.9 .github/ cleanup (in scope)

| Path | Disposition |
|---|---|
| `.github/workflows/ci.yml`, `.github/workflows/cosign-sign.yml` | Keep; update `lib/` references inside `ci.yml` |
| `.github/CODEOWNERS`, `.github/dependabot.yml` | Keep |
| `.github/java-upgrade/20260315210339/`, `.github/java-upgrade/20260317122725/`, `.github/java-upgrade/20260317122758/` | **Delete** — committed tool run output (logs + progress.md). Add `.github/java-upgrade/2*/` to `.github/.gitignore` |
| `.github/appmod/appcat/` *(only contains `.gitignore`)* | **Delete** if intentionally empty; keep only if AppCAT tooling needs it |

### 6.10 .claude/skills/ cleanup (in scope)

| Skill folder | Action | Reason |
|---|---|---|
| `rails-backend/` | **Delete** | Stack is Spring Boot, not Rails |
| `.DS_Store` | **Delete** | OS noise |
| `nu-chrome-e2e/runs/` (84 files) | **Delete + gitignore** `**/runs/` under `.claude/skills/nu-chrome-e2e/` | Ephemeral playwright trace dumps |
| `nu-aura-team-roles/` *(15 role MDs, no SKILL.md)* | Move to `docs/team/` (it's reference docs, not a skill) |
| `nu-usecase-runner/` *(1 file, no SKILL.md)* | **Delete** — incomplete and unreferenced |
| The 10 QA/e2e/fix skills (`nu-e2e`, `nu-e2e-qa`, `nu-aura-e2e-lifecycle`, `nu-chrome-e2e`, `nu-aura-full-platform-qa`, `playwright-autonomous`, `qa-dev-loop`, `nu-validate`, `nu-validate-fix-loop`, `autonomous-fix-loop`) | **Deferred to `adr-011-qa-skill-rationalization`** — needs user input on which are canonical |
| All other skills with valid SKILL.md | Keep |

### 6.11 frontend/lib/ root-file relocation (in scope)

The following `frontend/lib/` root files are misplaced and have natural homes:

| From | To |
|---|---|
| `lib/utils.ts` | Merge into `lib/utils/index.ts` (currently `lib/utils.ts` and `lib/utils/` co-exist) |
| `lib/websocket.ts` | `lib/services/websocket.ts` |
| `lib/design-system.ts` | `lib/theme/design-system.ts` |

All consumers re-pointed via `grep -r "from ['\"].*lib/(utils|websocket|design-system)['\"]"`.

### 6.12 frontend/components/ dedup (in scope)

| Action | Reason |
|---|---|
| Merge `components/resources/` (4 files) into `components/resource-management/` | Same domain, 4 vs 8 files, no naming overlap |
| Move `components/ui/EDITABLECELL_USAGE.md` → `docs/frontend/editable-cell-usage.md` | Markdown doesn't belong inside components |
| Pick one of `components/org-chart/` vs `app/org-chart/_components/` (recommend route-local) | Single canonical home |

### 6.13 frontend/app/ route dedup — limited scope

**In this PR (low-risk):** Delete the duplicate route `app/org-chart/` (canonical is `app/organization-chart/`). Verify no internal links reference the old path; add a redirect in `middleware.ts` if needed.

**Deferred to `adr-012-frontend-route-consolidation`:** The deeper merges (`calendar/nu-calendar`, `goals/okr`, `letters/letter-templates` → `letters/templates`, `statutory/statutory-filings` → `statutory/filings`, the `attendance/time-tracking/timesheets/shifts/overtime` family, the `app/app/*` nested router rename). These need sidebar updates, redirect rules, and per-consumer audits.

### 6.14 scripts/qa-orchestrator/ tidy (in scope)

| Action |
|---|
| Delete `scripts/qa-orchestrator/node_modules/` (committed) |
| Rename `scripts/qa-orchestrator/frontend/` → `scripts/qa-orchestrator/reports/` (it only holds `playwright-report/autonomous/`, the "frontend" name is misleading) |
| Add `scripts/qa/qa-orchestrator/reports/playwright-report/` to `.gitignore` |
| Verify `frontend/package.json:22` reference `bash ../scripts/qa-orchestrator/run.sh` still resolves after the parent move into `scripts/qa/` |

### 6.15 backend/ test coverage flag (deferred)

`backend/src/test/` has 282 test files but coverage is wildly skewed: 363 production classes in `domain/` with **1 test**, 311 in `infrastructure/` with **1 test**, and 27 `api/` modules with no corresponding test package. This is real risk, not layout. **Deferred to `adr-013-test-coverage-strategy`**.

### 6.16 backend/src/main/java/com/hrms vs com.nulogic (deferred, but flagged)

Actual Java root package is `com.hrms`. CLAUDE.md and team conventions reference `com.nulogic`. Two possibilities:
- CLAUDE.md is wrong → fix CLAUDE.md (low-risk doc edit, **in scope** as part of commit 11 in section 8)
- Package should be `com.nulogic` → mass rename of all `import com.hrms.*` (**not** in scope; that's `adr-014-java-package-naming`)

User decision needed before this PR merges. Default assumption pending user input: CLAUDE.md is stale; we fix the doc and leave `com.hrms` alone.

### 6.17 backend/src/main/java/ package structure (deferred entirely)

The audit found:
- `domain/{kafka,ai,file,event,tenant,bgv}` — infra/service concerns wrongly placed under `domain/`
- `application/{admin,dashboard,mobile,publicapi,security,migration,meeting,home}` — application-only modules with no domain pair
- `config/` package near-empty (2 files); per-module configs scattered
- 120 single-class leaf packages

**Deferred to `adr-015-backend-package-rationalization`.** Moving Java packages is a multi-day refactor with imports, Spring component-scan paths, and serialization-class references at stake. Not a layout PR.

### 6.18 frontend/lib/api vs lib/services API-layer duplication (deferred)

`lib/api/` (12 files) and `lib/services/` (113 files) are two parallel axios-wrapping layers. Boundary unclear. **Deferred to `adr-016-frontend-api-layer-unification`** — touches every data-fetching consumer.

### 6.19 frontend/lib/hooks/ auth hooks duplication (deferred)

5 auth-flavoured hooks (`useAuth`, `useAuthStatus`, `usePermissions`, `useSessionTimeout`, `useTokenRefresh`) plus an `useUnsavedChanges` / `useUnsavedChangesWarning` pair. **Deferred to `adr-017-auth-hooks-consolidation`** — security-sensitive code.

### 6.20 backend/logs/ — runtime artifact directory (in scope)

`backend/logs/` contains **98 MB of committed logs** (8 files, including `backend.log` at 87 MB). Delete entire directory; add `backend/logs/` to `.gitignore`.

### 6.21 frontend/eslint-plugin-nu-aura/ (in scope)

Audit shows the folder empty. If empty post-verification, **delete**. If it has hidden content (e.g., a `package.json` referenced from `frontend/.eslintrc.json`), keep and fix `.gitignore` to stop hiding contents.

### 6.22 frontend/sessions/ (in scope)

`frontend/sessions/hopeful-awesome-lamport/` — a single subdir, looks like Claude session state leaked into the repo. **Delete + gitignore `sessions/`**.

### 6.23 Empty directory cleanup (in scope)

Delete the following empty / near-empty directories (~10 in total):
- `frontend/.claude/skills/` (empty, parallel to top-level)
- `frontend/docs/screenshots/`, `frontend/docs/qa/network/`, `frontend/docs/qa/playwright/runs/`, `frontend/docs/qa/a11y/`
- `.claude/skills/qa-dev-loop/scripts/`
- 7 empty leaf dirs under `.claude/skills/nu-chrome-e2e/runs/*/{evidence,fix-logs,har,cookies,console}` (covered by the bulk delete in 6.10)

### 6.24 CLAUDE.md stale path reference (in scope)

CLAUDE.md says "frontend/hooks/" — actual path is `frontend/lib/hooks/`. Fix the reference in commit 11.

### 6.25 Left alone (justification)

These directories are intentionally untouched. Listing them so reviewers know we did not forget them:

| Path | Why untouched |
|---|---|
| `.github/` | CI workflows — only the path references inside `ci.yml` change (commit 10) |
| `.claude/` | AI tooling config required by CLAUDE.md; team-shared, version-controlled |
| `.idea/`, `.vscode/` | IDE configs; checked into the repo by team convention |
| `backend/src/` (Java package tree) | Out of scope — package refactors are separate from layout cleanup |
| `frontend/app/`, `frontend/components/`, `frontend/lib/`, `frontend/hooks/`, `frontend/public/`, `frontend/styles/` | Out of scope — Next.js code refactors are separate |
| `.mcp.json`, `.dockerignore`, `.editorconfig`, `.gitignore` (root) | Tooling configs that must remain at root |
| `skills-lock.json` | Lock file referenced by skill loader |

## 7. Disposition: what dies, moves, stays

### 7.1 Deleted outright (with `git rm`)

| Path | Reason |
|---|---|
| `setup-claude-personal.sh`, `start-dev.sh`, `stop-dev.sh`, `promote-superadmin.sql` *(root copies)* | Byte-identical duplicates of files in `scripts/` |
| `nu-aura-dev.skill`, `nu-aura-qa.skill`, `nu-aura-full-platform-qa.skill` | Not in `skills-lock.json`; superseded by `.claude/skills/nu-aura-*` |
| `nu-aura-dev/`, `nu-aura-qa/` | Stale single-file dirs duplicating `.claude/skills/` |
| `config/` | Byte-identical to `deployment/config/` (which moves to `infra/deployment/config/`) |
| `railway.json`, `render.yaml` | Zero references; project ships via GCP cloudbuild |
| `script.sh` | One-off zshrc installer subsumed by `setup-claude-personal.sh` |
| `tools/` | Empty subtree |
| `NU-AURA-QA-Report-2026-04-01.xlsx` | Frozen dated artifact |
| `qa-reports/`, `docs/validation/`, every loose file under `docs/qa/` | Aggressive delete per retention decision; `git log` is archive |
| `GAP-ANALYSIS-2026-04-02.md`, `HARDENING-AUDIT-RESULTS.md`, `ARCHITECTURE_GAP_REGISTER.md`, `EXECUTIVE-SUMMARY.md`, `docs/PLATFORM-STATUS-2026-04-05.md` | Dated point-in-time audits |
| `backend/anthropic-ai-sdk-0.78.0.tgz` | Stray dependency tarball (509 KB) |
| `backend/*_result*.json` (7 files), `backend/backend-run.log`, `backend/test-output.txt`, `backend/*.log`, `backend/.next/` | Committed runtime artifacts |
| `frontend/nu-rbac-report.json`, `frontend/nohup.out`, `frontend/spinner-*preview*.html`, `frontend/migration-report.md`, `frontend/unconvertible-classes.json`, `frontend/tsconfig.tsbuildinfo` | Generated reports + demo HTML |
| `scripts/qa-orchestrator/node_modules/`, `scripts/migrate-nuhire-to-nuaura.mjs` | `node_modules` committed; one-time migration done |
| `docs/architecture/NU_AURA_PLATFORM_ARCHITECTURE.docx`, `docs/assets/Nu Talent Management System_25-Aug.pdf` | Old project name pre-rename |
| `.playwright-mcp/`, `.agents/`, `.DS_Store` (anywhere) | Runtime trash and OS noise |

### 7.2 Moved and renamed

| From | To |
|---|---|
| `AGENTS.md` + `TEAMS.md` + `NU-AURA-AGENT-TEAM.md` + `USAGE-GUIDE.md` + `docs/{AGENT-TEAMS-MASTER-REFERENCE, PROD-READY-AGENT-TEAM-PROMPT, QA-AGENT-TEAM-PROMPT}.md` | `docs/agents/{overview,teams,usage,prompts/*}.md` |
| `REQUIREMENTS.md` | `docs/prd/requirements.md` |
| `SETUP.md` | Merged into `README.md` |
| `SEED_DATA_README.md` | `scripts/db/README.md` |
| `themes/` | `docs/design-system/` |
| `deployment/` | `infra/deployment/` |
| `monitoring/`, root `prometheus.yml` | `infra/monitoring/` |
| `lib/` | `infra/mvn-local-deps/` |
| `db/seed/V001__seed_data.sql` | `backend/src/main/resources/db/migration/V001__seed_data.sql` |
| `scripts/{start-dev,stop-dev}.sh` | `scripts/dev/` |
| `scripts/{setup-claude-personal,install-it2,claude-commands}.sh` | `scripts/setup/` |
| `scripts/db-*.sh`, `scripts/docker-db-*.sh`, `scripts/promote-superadmin.sql`, `scripts/db-migrate-manual.sql` | `scripts/db/` |
| `scripts/docker-*.sh` (non-db) | `scripts/docker/` |
| `scripts/qa-orchestrator/`, `scripts/test_ui_with_ai.py`, `scripts/screenshot-all-pages.ts`, `scripts/generate_ai_workshop_ppt.py` | `scripts/qa/` (renamed to kebab-case) |
| `docs/build-kit/*` | `docs/architecture/` |
| `docs/{PRODUCTION-READINESS-REPORT, QA-SIGNOFF-REPORT, TEST-PLAN-RBAC-USECASES}.md` | `docs/qa/` (kebab-cased) |

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

`README.md`, `LICENSE`, `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CLAUDE.md`, `MEMORY.md`, `pom.xml`, `Dockerfile`, `docker-compose.yml`, `docker-compose.override.yml`, `docker-compose.prod.yml`, `.gitignore`, `.dockerignore`, `.editorconfig`, `.env.example`, `.env.production.example`, `.mcp.json`, `skills-lock.json`, `.github/`, `.vscode/`, `.idea/`, `.claude/`, `backend/`, `frontend/`.

## 8. Migration plan — commit structure

The PR `chore/repo-layout-cleanup` will be a single branch with a sequence of commits that can be reviewed and reverted independently:

1. `chore: gitignore runtime artifacts` — `.gitignore` only, no removals yet.
2. `chore: delete committed runtime junk` — logs, `.next/`, tarballs, `*_result*.json`, `node_modules` under scripts/.
3. `chore: delete duplicate root scripts and stale .skill files` — byte-identical dups + dead skill files + `nu-aura-dev/`, `nu-aura-qa/`.
4. `chore: delete config/ duplicate and dead deploy configs` — `config/`, `railway.json`, `render.yaml`, `tools/`, `script.sh`.
5. `chore: delete dated audit and QA artifacts (history preserves)` — point-in-time audits, `qa-reports/`, `docs/qa/*` loose files, `docs/validation/`, `NU-AURA-QA-Report-2026-04-01.xlsx`.
6. `chore: move docs into canonical buckets` — `git mv` heavy commit for `docs/`.
7. `chore: introduce infra/ and move ops dirs` — `deployment/`, `monitoring/`, `prometheus.yml`, `lib/` (renamed).
8. `chore: namespace scripts/{dev,db,docker,qa,setup}` — script moves and kebab-case renames.
9. `chore: move db/seed into Flyway migration path` — relocate seed SQL.
10. `chore: update CI, docker-compose, and doc references` — fix every consumer of changed paths.
11. `docs: update README to reflect new layout + absorb SETUP.md` — narrative cleanup.

Every commit either passes the build cleanly or is paired with the consumer-update commit (commit 10).

### 8.1 Load-bearing reference updates

| File | Change |
|---|---|
| `.github/workflows/ci.yml` | 3× `mvn install:install-file -Dfile=lib/...` → `infra/mvn-local-deps/...` |
| `docker-compose.yml` | `./prometheus.yml` → `./infra/monitoring/prometheus.yml`; `./monitoring/` → `./infra/monitoring/` |
| `docker-compose.prod.yml`, `docker-compose.override.yml` | Same paths as above |
| `infra/deployment/deploy.sh` and other scripts inside `infra/deployment/` | Relative-path references to siblings, if any |
| `backend/start-backend.sh` | Verify no path references; expected none |
| `README.md`, `CLAUDE.md`, `MEMORY.md` | Update path references to docs, scripts, infra |
| `.idea/`, `.vscode/` workspace files | Audit for hardcoded paths |
| Any doc that links to a moved file | `grep -r` for stale paths and patch |

## 9. Verification

The PR is not mergeable until all of these gates pass:

1. `cd backend && mvn clean package` succeeds.
2. `cd frontend && npm ci && npm run build && npx tsc --noEmit` all succeed.
3. `docker-compose config` validates (catches broken mount paths).
4. `docker-compose up -d postgres redis kafka` boots without error.
5. `./scripts/dev/start-dev.sh` successfully starts backend + frontend.
6. `.github/workflows/ci.yml` passes on the cleanup branch.
7. `grep -rn 'config/\|^lib/\|^prometheus.yml\|^railway.json\|^render.yaml'` across kept files returns zero matches that refer to the deleted locations.
8. `git status` is clean after a full build — no new untracked artifacts (proves `.gitignore` works).
9. Root non-dot file count is ≤ 15 (matches the EARS criterion).

## 10. Error handling and rollback

**Rollback at PR level.** Because each commit in the PR is independent, any single commit can be reverted standalone with `git revert <sha>`. If the post-merge build breaks unexpectedly, `git revert <merge-commit>` restores the entire layout.

**File recovery.** Every removed file remains recoverable via:

```bash
git log --diff-filter=D --name-only --since="2026-05-13"
git checkout <sha>~1 -- <path>
```

**Risk register.**

| Risk | Mitigation |
|---|---|
| CI breaks on `lib/` rename | Verification gate 6 catches it; rename + CI update bundled in commit 10 |
| Docker mount breaks for prometheus | Verification gates 3 and 4 catch it before merge |
| Open feature branches conflict with moves | One-PR strategy minimises rebase pain; team is asked to land or abandon stale branches first |
| Skill loader breaks if `.skill` files were referenced | Audit confirmed zero references in `skills-lock.json`; re-verified in commit 3 message |
| Team member has scripts bookmarked at old paths | `CHANGELOG.md` entry in commit 11 lists every relocation |
| Aggressive delete removes something still in use | `git log` + `git reflog` retain everything; recovery procedure documented above |

## 11. Testing strategy

This is a structural refactor — no application logic changes. The "tests" are the verification gates in section 9, plus:

- **Smoke test post-merge**: an engineer pulls `main`, runs `./scripts/dev/start-dev.sh`, opens the frontend, signs in as SuperAdmin, navigates one page. If that flow works, the move did not break the developer loop.
- **CI on the cleanup branch**: must complete green before merge.
- **No new tests are added** as part of this PR — adding test code would mix concerns.

## 12. Out of scope (explicit non-goals revisited)

- Reorganising `backend/src/main/java/...` package structure.
- Reorganising `frontend/app/`, `frontend/components/`, `frontend/lib/`.
- Authoring new documentation; only moves and consolidating overlapping files (e.g., the seven agent docs become four).
- Touching `.github/workflows/` content beyond path edits.
- Any deploy or infra behaviour change (`infra/deployment/` contents are byte-equivalent to `deployment/`).
- Touching open feature branches; team is asked to land or abandon them first.

## 13. Deferred follow-up ADRs (out of scope for this PR)

The deep audit surfaced architectural drift that genuinely needs addressing but cannot ride on a layout-cleanup PR without ballooning risk. Each item below becomes its own ADR + implementation cycle:

| ADR # | Topic | Why deferred |
|---|---|---|
| `adr-010` | Documentation consolidation — `docs/architecture/` vs `docs/build-kit/` | Editorial decision; needs an owner to pick canonical source and deprecate the other |
| `adr-011` | QA / e2e / fix-loop skill rationalisation | 10 overlapping skills; needs user to declare which is canonical for each axis |
| `adr-012` | Frontend route consolidation | `calendar/nu-calendar`, `goals/okr`, `letters/letter-templates`, `statutory/statutory-filings`, time-tracking family, `app/app/*` rename — sidebar, redirects, per-consumer audit |
| `adr-013` | Backend test coverage strategy | 363 domain classes / 1 test; 311 infra / 1 test; 27 `api/` modules with no tests |
| `adr-014` | Java package naming — `com.hrms` vs `com.nulogic` | Mass rename if `com.nulogic` is canonical; needs decision |
| `adr-015` | Backend package rationalisation | `domain/{kafka,ai,file,event,…}` misplacement; `application/` modules with no domain pair; `config/` consolidation |
| `adr-016` | Frontend API layer unification | `lib/api/` (12) + `lib/services/` (113) — pick one, migrate every consumer |
| `adr-017` | Auth hooks consolidation | `useAuth`, `useAuthStatus`, `usePermissions`, `useSessionTimeout`, `useTokenRefresh` — define boundaries |
| `adr-018` | CI workflow expansion | Add PR validation, security scan, deploy workflows (currently only `ci.yml` + `cosign-sign.yml`) |

Each ADR will be drafted post-merge of this cleanup PR, prioritised in `MEMORY.md`, and scheduled by the team.

## 14. Open questions for user

Before this spec is implementation-ready, two answers are needed:

1. **`com.hrms` vs `com.nulogic`** — is CLAUDE.md stale (we just fix the doc), or should the package be renamed (defer to `adr-014`)?
2. **Tabling deferred items as ADR stubs?** — should I create empty ADR markdown files (`docs/adr/adr-010-…md` … `adr-018-…md`) with just title + status=Proposed as part of this PR, so they're visible in the backlog?

If you don't answer, the defaults are: CLAUDE.md is stale (we fix the doc, leave `com.hrms`), and yes, I create ADR stubs so the deferred work is visible.
