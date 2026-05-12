# Changelog

All notable changes to NU-AURA are documented here. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Repo layout cleanup (Phase 1 — 2026-05-13)

#### Changed

- Top-level `deployment/`, `monitoring/`, `lib/`, `prometheus.yml` moved to `infra/{deployment,monitoring,mvn-local-deps}`.
- `themes/` → `docs/design-system/`
- `AGENTS.md` → `docs/agents/overview.md`
- `SETUP.md` content merged into `README.md`
- `db/seed/V001__seed_data.sql` → `backend/src/main/resources/db/migration/V171__seed_data.sql`
- `scripts/` namespaced into `dev/`, `db/`, `docker/`, `qa/`, `setup/`
- `.claude/skills/nu-aura-team-roles/` → `docs/team/roles/`
- `backend/DEVELOPER_CHECKLIST.md`, `TESTING_GUIDE.md` → `docs/runbooks/`
- `backend/docs/assets/` → `docs/architecture/backend-assets/`
- `frontend/docs/DESIGN_SYSTEM_REDESIGN.md` → `docs/architecture/frontend/design-system-redesign.md`

#### Removed

- 4 byte-identical duplicate root scripts (`setup-claude-personal.sh`, `start-dev.sh`, `stop-dev.sh`, `promote-superadmin.sql`)
- 3 stale root `.skill` files + `nu-aura-dev/`, `nu-aura-qa/` dirs (not referenced in `skills-lock.json`)
- `config/` (byte-identical to `deployment/config/`)
- `railway.json`, `render.yaml` (zero functional refs; project ships via GCP cloudbuild)
- `tools/` (only contained byte-identical duplicate of `scripts/test_ui_with_ai.py`)
- `script.sh` (one-off zshrc installer)
- 33+ MB of committed runtime logs in `backend/` and `backend/logs/`
- Stray `backend/.next/`, `backend/.github/`, `backend/anthropic-ai-sdk-0.78.0.tgz`, ad-hoc API result JSONs
- `frontend/sessions/` (~120 .next-dev cache files), `spinner-mega-preview.html`, `spinner-preview-v2.html`, runtime log files
- `qa-reports/` (full history, gitignored), `docs/validation/` (47 loop logs), `docs/qa/*` loose files
- `NU-AURA-QA-Report-2026-04-01.xlsx`, `docs/architecture/NU_AURA_PLATFORM_ARCHITECTURE.docx`, `docs/assets/Nu Talent Management System*.pdf` (pre-rename project name)
- `docs/screenshots/qa-sweep-2026-05-02/`, `.github/java-upgrade/2026*/` (committed tool runs)
- `.claude/skills/rails-backend/` (wrong stack), `.claude/skills/nu-usecase-runner/` (incomplete)
- `scripts/migrate-nuhire-to-nuaura.mjs` (one-time migration, completed)
- `backend/docker-compose.yml` (diverges from root, unreferenced)
- All `.DS_Store` files

#### Added

- New top-level `infra/` directory (`deployment/`, `monitoring/`, `mvn-local-deps/`) with `infra/README.md` describing the bucket
- `docs/team/roles/` (formerly `.claude/skills/nu-aura-team-roles/`)
- `docs/qa/README.md` stub for new retention policy
- Naming convention: `lower-kebab-case` for files/dirs; `UPPER-CASE.md` for root meta only
- Expanded `.gitignore` for logs, build outputs, runtime artifacts (`*.tgz`, `nohup.out`, `**/.next/`, `**/test-results/`, `**/playwright-report/`, `**/.claude-flow/`, `**/.playwright-mcp/`, `frontend/sessions/`, `.vercel/`, `.claude/skills/nu-chrome-e2e/runs/`, `.github/java-upgrade/2*/`)

#### Updated references

- `.github/workflows/ci.yml`: 3 `mvn install:install-file` paths → `infra/mvn-local-deps/`
- `docker-compose.yml`: prometheus mount path → `./infra/monitoring/prometheus.yml`
- `infra/deployment/cloudbuild.yaml`: 14 `'deployment/...'` refs → `'infra/deployment/...'`
- `frontend/package.json`: `test:e2e:autonomous` → `bash ../scripts/qa/qa-orchestrator/run.sh`

### Security (Sprint 3 — 2026-05-12)

- Closed regressions from sprint-2: DataScope CUSTOM scope strict allowlist,
  `UnsupportedOperationException` → HTTP 501, JWT tenant-status caching,
  AsyncContext IP/UA propagation.
- PayrollController mass-assignment: 8 endpoints converted to typed DTOs.
- Field-level AES-GCM encryption applied to `BenefitDependent` PII,
  `TaxDeclaration` previous-employer PAN, and `User.mfaSecret` (V147).
- Wall `PostReaction` unique constraint + Wiki `version_number` race fix (V148).
- Postgres FTS GIN indexes restored (V149).

### Documentation (Sprint 3 — 2026-05-12)

- Wave-4 documentation audit: stale codebase stats refreshed across `README.md`,
  `AGENTS.md`, `CONTRIBUTING.md`, and `MEMORY.md` (Flyway V0–V146, 173
  controllers, 228 services, ~285 entities, 261 pages).
- Governance files added: `LICENSE`, `SECURITY.md`, `CHANGELOG.md`,
  `.github/CODEOWNERS`.

### Security (Sprint 2 — earlier 2026-05-12)

- 50 wave-2 findings closed across config, RBAC, mobile/integration stubs,
  edge cases, frontend a11y, RBAC scope, mass-assignment, impersonation
  (commit `2ac7218d`).

### Security (Sprint 1 — 2026-05-12)

- 79 wave-1 audited findings closed across auth, IDOR, injection, SSRF,
  Drive tenant isolation, dependencies (commit `a93d4093`).

### Quality (April 2026)

- QA app-readiness report: 95% → 100% (commit `740cf937`).
- Frontend service-layer mocks: 102 failures fixed, 100% suite passing
  (commit `1461c421`).
- Studio Slate v2 drift: 33 stale fixtures repaired (commit `713d1995`).

### QA (April 2026)

- Multi-round QA sweeps: 22,620 probes, 0 real bugs (`21e2f661`, `e882742d`,
  `85757ba4`, `39c2b4f0`).
- Autonomous QA orchestrator with severity classification (`0923e72c`).

### Refactor (April 2026)

- Studio Slate v2 design system overhaul: flat surfaces, `#2563EB` accent,
  warm dark sidebar (`a4a40c7a`).

### Tests (April 2026)

- Comprehensive full-platform E2E test suite + helpers (`eec35300`).
- `ui-ux-deep` and `rbac-matrix` Playwright spec suites (`5d6163b9`).

### Fixes (April 2026)

- Production-readiness sweep: backend 100%, e2e 99.3%, ~45 prod bugs
  (`4731db10`).
- QA+DEV loop: 13 bugs fixed, 28 pages verified, 0 blocking bugs (`b8fde457`).
