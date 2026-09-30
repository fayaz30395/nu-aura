# Locked state — 2026-09-24

**Commit:** `2b4832cb69c641e6c95d880e912fba5187461505` (branch `main`, not advanced)
**Working tree:** dirty — classified below. Nothing committed or pushed this cycle.

## Pre-existing (NOT from this cycle)

Three modified files under the faylo delivery-state directory (two ledger files and one story
file), plus four untracked items: `scripts/faylo-build-map.mjs`,
`scripts/faylo-build-map.template.html`, `scripts/faylo-qa-verify.mjs`, and
`qa-reports/playwright-rbac/`. None of these were touched this cycle.

## Changed BY this remediation cycle

Production code — 4 files:

| File | Why |
|---|---|
| `frontend/lib/utils/format/date.ts` | B1 root-cause fix |
| `backend/…/api/document/controller/FileUploadController.java` | B3 repository access removed |
| `backend/…/api/employee/EmployeeDocumentController.java` | B3 repository access removed |
| `backend/…/application/document/service/FileStorageService.java` | B3 service-layer accessors |

Tests / config / tooling:

| File | Why |
|---|---|
| `frontend/lib/utils/format/__tests__/date.test.ts` | 6 timezone regression tests |
| `backend/pom.xml` | TestContext cache 32 → 256 |
| `backend/…/WikiPageControllerTest.java` | B2 missing mock |
| `backend/…/OnboardingManagementControllerTest.java` | B4 |
| `backend/…/application/performance/dto/GoalRequestTest.java` | B4 |
| `backend/…/FluenceSearchControllerTest.java` | B5 routing now asserted |
| `backend/…/architecture/LayerArchitectureTest.java` | B3 exemptions |
| `backend/…/e2e/PayrollE2ETest.java` | B6 salary-structure fixture |
| `frontend/playwright.config.ts` | `cred-free` project |
| `frontend/e2e/nu-rbac.spec.ts` | fail-loud auth diagnostics |
| `.github/workflows/pr-validation.yml` | verify-contract gate |
| `backend/src/main/resources/db/migration/V331__refresh_demo_password_expiry.sql` | new, unapplied to prod |
| `frontend/e2e/credential-free.smoke.spec.ts` | new |
| `scripts/faylo-verify-contract.mjs` | new |
| `scripts/security/pre-commit-secret-scan.sh` | new, not installed |
| `qa-reports/verification-2026-09-24/` | all reports |

## Results

| Check | Command | Result |
|---|---|---|
| Backend suite | `cd backend && mvn test` | **BUILD SUCCESS** — 4,503 run, 0 failures, 0 errors, 2 skipped |
| Frontend unit | `cd frontend && npm run test:run` | **2,400 / 2,400**, 90/90 files |
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Lint | `npm run lint` (`--max-warnings=0`) | clean |
| Production build | `npm run build` | exit 0 (requires `NEXT_PUBLIC_API_URL`) |
| Migration chain | backend boot on a virgin DB | **321 migrations applied, now at v331** |
| CI verify contract | `pr-validation.yml` job `verify-contract` | wired, self-tested |
| Faylo sheet | artifact | **v7** |

## Open release blockers

1. **V316** checksum drift unverified in prod — Railway project auth expired. Gate 1 BLOCKED.
2. **5 live credentials** unrotated (`MINIO_ROOT_PASSWORD` confirmed dead). Gate 3.
3. **`APP_SECURITY_ENCRYPTION_KEY`** migration not started. Gate 3.
4. **Coverage** — measured this pass; see `route-coverage.md`, `rbac-matrix.md`, `authenticated-e2e.md`.

## Disposable local verification stack raised this pass

- Postgres container `nuaura-e2e-pg` on **55432** — isolated; NOT the dev DB, NOT prod.
- Backend on **8081** — port 8080 belongs to unrelated PID 92233, untouched.
- Full Flyway chain applied from scratch; demo credentials enabled.
- **Authenticated login verified working** — HR_ADMIN, permissions returned, cookie set.
- All 9 RBAC roles confirmed to have seeded ACTIVE demo identities.
