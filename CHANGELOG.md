# Changelog

All notable changes to NU-AURA are documented here. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
