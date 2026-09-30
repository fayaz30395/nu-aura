# Nu-Aura — Security Review

Last updated: 2026-09-30 · Base commit: `798f46c8` (§1-4) / `bf5fb0de` (§5) · Owner: SECURITY REVIEWER (orchestrator)

Source material: `qa-reports/verification-2026-09-24/security-audit.md`,
`qa-reports/verification-2026-09-24/RELEASE-GATES.md`,
`.nu-aura/evidence/bf5fb0de/security-scan-verification.md`.

## 1. Secret exposure (P0 — HUMAN_REQUIRED)

A prior commit history (reachable from ~85 refs across two remotes) contains a committed root
`.env` with production-grade credentials. Introducing commits: `d5961fef` (2026-03-23),
`8de12a5f` (2026-03-30); values later changed at `ede44ab0` (2026-04-02).

| # | Credential | Status | Required action |
|---|---|---|---|
| 1 | `JWT_SECRET` | HUMAN_REQUIRED | Rotate first — exposure permits JWT forgery. Rotation ends all sessions; announce first. |
| 2 | `APP_SECURITY_ENCRYPTION_KEY` | HUMAN_REQUIRED | **Do NOT rotate naively.** AES-256-GCM key for many encrypted columns (employees bank/IFSC, users.mfa_secret, benefit_dependents national ID/passport, tax_declarations, PF/ESI, payments, webhooks, connector config). Requires a dual-key read/rewrite migration. |
| 3 | `SPRING_DATASOURCE_URL` | HUMAN_REQUIRED | Rotate DB credentials in a maintenance window. |
| 4 | `SPRING_DATASOURCE_USERNAME` | HUMAN_REQUIRED | as above |
| 5 | `SPRING_DATASOURCE_PASSWORD` | HUMAN_REQUIRED | as above |
| 6 | `MINIO_ROOT_PASSWORD` | HUMAN_REQUIRED | Confirmed dead (MinIO removed) — rotate/delete. |
| 7 | `OPENAI_API_KEY` (Groq) | HUMAN_REQUIRED | Rotate. |
| — | `GRAFANA_ADMIN_PASSWORD` | HUMAN_REQUIRED | Rotate. |

Rotate-only is the recommended path (once values are inert, the ~85-ref/2-remote history rewrite is
not justified). This is a human action; do not mark PASS until rotation is evidenced.

## 2. What is already good (verified by prior pass, re-checked here)

- No secret values are logged (`security-audit.md` §5: 60 logger matches reviewed, none log values).
- Prod hardening flags on: `demoCredentialsEnabled:false`, `virusscan.fail-open=false`,
  cookie `use-host-prefix=true` (`application-prod.yml`).
- Secret-scanning pre-commit hook exists (`scripts/security/pre-commit-secret-scan.sh`) but is
  **NOT INSTALLED** — enable it.
- No new secrets introduced by the current uncommitted working tree (spot-check required before RC).

## 3. RBAC / authorization (P0 — IN_PROGRESS)

Scope flattening fixed in code (see `.nu-aura/evidence/798f46c8/rbac-blocker-001.md`). Not yet
verified by execution or a live RBAC probe. Acceptance gate: all forbidden cross-scope access returns
403 (26/26 denials) with no regression to legitimate access.

## 4. Outstanding security gates

| Gate | Status |
|---|---|
| Credential rotation | HUMAN_REQUIRED |
| APP_SECURITY_ENCRYPTION_KEY dual-key migration | HUMAN_REQUIRED (story US-2G9V0TF3AXX2) |
| Secret-scan pre-commit installed | HUMAN_REQUIRED (ready, not installed) |
| RBAC scope verification (execution + live) | IN_PROGRESS |
| Prod DB `V316` checksum drift verified | BLOCKED (Railway auth expired) |
| Dependency scan (Trivy) | BLOCKED in CI by runner disk exhaustion (see ci-security-scan.md) |
| Static scan findings (`scan-all-standard.json`, 66 findings) | **CODE-CONTROLLED: PASS** (1 fixed, 65 false-positive, verified) — see §5 |

## 5. Static scan findings — verified 2026-09-30 (commit `bf5fb0de`)

Full disposition, per-finding evidence, and drift re-check:
`.nu-aura/evidence/bf5fb0de/security-scan-verification.md`.
Machine-readable status: `.claude/security-scans/security-status-bf5fb0de.json`.

Summary: 66/66 original findings closed or confirmed false-positive. One real fix applied —
`frontend/app/careers/page.tsx:94` JSON-LD `dangerouslySetInnerHTML` was not escaping `<`, allowing
a job posting containing `</script>` to break out of the schema.org script block. Escaped to
`<`. The other 65 (hardcoded-secret scanner hits on test fixtures/placeholders, sanitized
`dangerouslySetInnerHTML` usages, Playwright `$eval`, injection-regression test assertions,
argument-array `execFile` calls, and localhost-only dev-tooling `innerHTML`) are false positives —
see evidence file for the per-finding basis.

This closes the **code-controlled** portion of the security gate. It does **not** close the release
gate overall: the credential-rotation and pre-commit-hook items in §4 remain HUMAN_REQUIRED and are
release-blocking until executed by someone holding live production credentials.
