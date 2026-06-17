---
title: QA / Release Readiness — NU-AURA
date: 2026-06-17
branch: main
agent: QA/RELEASE (production-readiness swarm)
---

# QA / Release Readiness — 2026-06-17

## Summary

NU-AURA's engineering baseline is broadly green (4,055 backend tests + 2,419 frontend
Vitest reported green in CI; live Vercel FE 200 / Railway BE health UP), but it is **NOT
release-ready** today. Three things block a clean release:

1. **The frontend lint gate is RED.** `npm run lint` (`eslint . --max-warnings=0`) exits
   **1** because of **82 `no-restricted-syntax` design-system warnings** — and that exact
   command is a blocking step in BOTH `ci.yml` (line 119) and `pr-validation.yml` (line 60).
   These warnings are emitted by ESLint itself (a custom `no-restricted-syntax` rule in
   `eslint.config.mjs`), NOT by the always-exit-0 `lint:design-system` drift script. Any push
   to `main` or PR to `main`/`develop` would fail the frontend CI job. **This is the single
   most concrete release blocker and it is verifiable locally.**
2. **Production security gate is open.** Per `PRODUCTION_READINESS_BREAKDOWN.md` (2026-06-14,
   verdict **NO-GO**), the Railway production backend still runs with
   `DEMO_CREDENTIALS_ENABLED=true` — violating the deploy-gate in
   `docs/obsidian/08-Security/Security-Audit.md:149`. [RUNTIME-NEEDED] to confirm current
   Railway env var value (docs say it must be flipped manually via the Railway dashboard).
3. **Regression depth is shallow.** Backend JaCoCo line coverage is ~0.19 (gate is a 0.10
   ratchet floor, not 0.80); frontend Vitest gate is 60%. Test *breadth* is high (308 backend
   test files, 90 Vitest, 117 Playwright e2e) but measured line coverage is far below the org
   80% standard, and several critical boundaries (FINANCE_ADMIN, NOBYPASSRLS-live) have no
   positive automated proof.

Coverage percentages were NOT independently re-measured this session (Docker down → no
Testcontainers/JaCoCo run); figures are cited from `backend/pom.xml` comment, the QA docs,
and the release reports as labelled.

## Findings

| ID | Severity | Title | Evidence | Needs |
|----|----------|-------|----------|-------|
| REL-01 | CRITICAL | **FE lint gate RED** — `npm run lint` exits 1 on 82 design-system warnings; blocks both CI workflows | Ran `npx eslint . --max-warnings=0` → `GATE EXIT=1`; `✖ 82 problems (0 errors, 82 warnings)` all `no-restricted-syntax`. Gate command: `frontend/package.json` `"lint": "eslint . --max-warnings=0"`; invoked at `.github/workflows/ci.yml:119` and `.github/workflows/pr-validation.yml:60` | Fix the 82 off-8px-grid utility classes (gap-3/space-y-3/p-3 → -2/-4), OR downgrade the rule, OR change `--max-warnings`. Then re-run lint. |
| REL-02 | CRITICAL | **`DEMO_CREDENTIALS_ENABLED=true` in Railway prod** — `Welcome@123` demo seeds live; violates deploy gate | `PRODUCTION_READINESS_BREAKDOWN.md` §2 lists `DEMO_CREDENTIALS_ENABLED=true`; deploy-gate requires `=false` (`Security-Audit.md:149`). V270+ neutralizes seeds only when flag is false. | [RUNTIME-NEEDED] Verify/flip Railway env var to `false` via dashboard; redeploy; re-smoke that demo logins are rejected. |
| REL-03 | HIGH | **Shallow line coverage** — backend ~0.19, FE 60% gate vs 80% org standard | `backend/pom.xml:517` JaCoCo `LINE COVEREDRATIO minimum 0.10` (comment: current ~0.19); `frontend/vitest.config.ts:24-29` thresholds 60. Test-Coverage.md "Coverage posture" | Raise JaCoCo floor in 0.05 increments as depth is paid down (T3-15); not a hard blocker but a real risk. |
| REL-04 | HIGH | **B3 — backend never proven on a public host with cross-role E2E + NOBYPASSRLS-live RLS** | `DEPLOY_READINESS_REPORT.md:42` (B3 HIGH), `:139-142`; proven locally on :8090 only. T-3: `RlsTenantGucScopeTest` is a static source scan, not a live NOBYPASSRLS run. | [RUNTIME-NEEDED] Provision `nu_app_rls` (NOBYPASSRLS) role + run cross-role E2E against the public Railway URL. |
| REL-05 | MEDIUM | **FINANCE_ADMIN permission boundary untested (QA-2)** — no seeded FINANCE_ADMIN user; payroll boundary never positively tested | Test-Coverage.md "Gaps" → "FINANCE_ADMIN boundary untested (QA-2)"; [[RBAC-Matrix]] | Seed a FINANCE_ADMIN fixture user + add a positive/negative payroll-permission test. |
| REL-06 | MEDIUM | **~10 e2e specs carry `test.skip`/`fixme`** — silent erosion of e2e safety net | Test-Coverage.md "Gaps"; Test-Catalog counts "~10" skipped (readiness report cites ~33 historical conditional skips) | Track each skip with a ticket; un-skip or delete; don't let them rot. |
| REL-07 | MEDIUM | **Backend full suite + 74 Testcontainers ITs not runnable locally** — CI is sole authority | Docker down this session; `mvn test-compile` clean (JDK 23, jacoco skipped); orchestrator note + Test-Catalog "Latest local run" | [RUNTIME-NEEDED] Trust CI green on the exact frozen release SHA; do not release off a local partial run. |
| REL-08 | MEDIUM | **D-2 — `deploy.yml` uses long-lived `GCP_SA_KEY`** instead of GCP Workload Identity Federation | `DEPLOY_READINESS_REPORT.md:141`; `deploy.yml:67` `credentials_json: secrets.GCP_SA_KEY` | Migrate to GCP WIF (`id-token: write` perm already present at `deploy.yml:38`). |
| REL-09 | LOW | **`ci.yml` security job has a duplicated Trivy step** (lines 157-180, copy-paste) | `.github/workflows/ci.yml:157-180` two identical "Trivy CVE table (debug, non-blocking)" steps | Cosmetic; remove the dupe. Non-blocking (both `continue-on-error`). |
| REL-10 | LOW | **Plaintext PII columns** flagged in deploy gate (PF/ESI numbers, candidate email/phone/resume_url) | `Security-Audit.md:133` (⚠️ Open — review) | Assess encryption-at-rest like bank/tax fields; product/legal call. |
| REL-11 | INFO | **Coverage NOT re-measured this session** — 0.19 / 60% are config/comment values, not fresh runs | Test-Coverage.md honesty note; Docker down | Re-run `mvn jacoco:report` + `npm run test:coverage` when Docker is up for a true number. |

### What is GREEN / satisfied

- **Flyway ≥ V270 deploy-gate item: SATISFIED.** Latest migration on disk is **V294**
  (`ls backend/src/main/resources/db/migration` → V294 tip), well past the V270 floor that
  neutralizes the `Welcome@123` seeds.
- **JDK pin: SATISFIED.** All three Java workflows pin Temurin **21** (`ci.yml:10`,
  `pr-validation.yml:8`, `security-scan.yml:29`).
- **CI gate completeness: GOOD.** `pr-validation.yml` runs FE lint + tsc + `next build` and
  BE `mvn -DskipITs verify` (which runs the JaCoCo `check` floor); `ci.yml` runs full BE
  `mvn test` (ITs included via Testcontainers + Redis service), FE lint/tsc/test/build.
- **Security gates present.** `security-scan.yml`: CodeQL (Java + JS/TS, non-blocking SARIF),
  gitleaks (`--exit-code=2`, blocking), Trivy CRITICAL gate on both images (blocking,
  `exit-code: 1`), Cosign sign + verify in `deploy.yml`, Kyverno image-signature admission.
- **Prod deploy is gated.** `deploy.yml` prod job never auto-runs from push; requires manual
  `workflow_dispatch` + `production` GitHub Environment required-reviewers + staging smoke
  first + cosign signature verify + `/actuator/health` smoke.
- **TypeScript check: present** in both workflows (`npx tsc --noEmit`, heap bumped to 4GB).
- **Release env prebuild guard present** — `frontend/scripts/validate-release-env.mjs` runs on
  `prebuild`, rejecting loopback/placeholder `NEXT_PUBLIC_API_URL`.

## Regression Coverage score (0-100)

**Score: 58 / 100**

Rationale:
- (+) Very broad suite: 308 BE test files, 90 FE Vitest, 117 Playwright e2e; 7 FE integration
  flow suites; tenant-isolation + RBAC boundary suites; ArchUnit layer rules.
- (+) Strongest areas (tenant RLS, RBAC boundaries, payroll/leave state machines) are exactly
  the high-risk ones.
- (−) Measured line depth is low (BE ~0.19, FE 60%) — breadth without depth; the score is
  capped by depth, not file count.
- (−) FINANCE_ADMIN boundary, NOBYPASSRLS-live RLS, and public-host cross-role E2E have **no
  passing automated proof** (REL-04, REL-05).
- (−) ~10 skipped e2e specs erode the net (REL-06).
- (−) Coverage numbers are not freshly measured (REL-11), so the score carries uncertainty.

## Release-readiness blockers

1. **REL-01 (CRITICAL) — FE lint gate is RED.** `npm run lint` exits 1 on 82 design-system
   warnings; this is a blocking step in both `ci.yml` and `pr-validation.yml`. **No clean
   release is possible until this is green** (fix the 82 utilities, relax the rule, or relax
   `--max-warnings`). Verified locally this session.
2. **REL-02 (CRITICAL) — `DEMO_CREDENTIALS_ENABLED=true` in Railway prod.** Demo `Welcome@123`
   logins remain live, violating the deploy gate. Must be flipped to `false` and re-verified
   before go-live. [RUNTIME-NEEDED]
3. **REL-04 (HIGH) — Public-host cross-role E2E + NOBYPASSRLS-live RLS never run.** Proven
   locally only; the live RLS isolation proof and prod-role behavior are unverified.
   [RUNTIME-NEEDED — `nu_app_rls` role + public URL]

(REL-08 GCP WIF and REL-03 coverage depth are real but non-blocking for a conditional release.)

## What has NOT been verified

- **No suite was executed this session.** Backend full suite + 74 Testcontainers ITs are NOT
  runnable locally (Docker down) — CI is authoritative (prior 4,055 green reported, not re-run
  here). Frontend Vitest (2,419) and `next build` were NOT re-run here either; taken as given
  from the orchestrator.
- **Coverage percentages were NOT re-measured.** Backend ~0.19 is from the `pom.xml` comment;
  FE 60% is the configured gate, not an achieved number. A real measurement needs Docker.
- **Live Railway env var values were NOT inspected** — `DEMO_CREDENTIALS_ENABLED`,
  `APP_PAYMENTS_ENABLED` are cited from `PRODUCTION_READINESS_BREAKDOWN.md` (2026-06-14), which
  may be stale. [RUNTIME-NEEDED] to confirm current state.
- **CI status on current HEAD was NOT confirmed** — the green-CI claims (`ac03c6ba`) come from
  `DEPLOY_READINESS_REPORT.md`; HEAD has advanced since. The RED lint gate (REL-01) strongly
  implies CI would currently fail the frontend job, but I did not query GitHub Actions runs.
- **CodeQL / Trivy / gitleaks results were NOT run** — only the workflow configs were read.
- **NOBYPASSRLS-live RLS** is unproven (only the static `RlsTenantGucScopeTest` guard exists).
