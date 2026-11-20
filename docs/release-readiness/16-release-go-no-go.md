# NU-AURA: Release GO / NO-GO

Question: can NU-AURA safely replace the paid Keka subscription in production?

## Status update 2026-11-20 (verdict not re-issued)

The verdict below was written on 2026-11-15 and has **not** been re-evaluated. Since then:
- Fixes are committed and pushed to `fayaz-deen/main` (HEAD `3fcc79e3` at time of writing). Migrations now run to V353 (V350-V353 add HR/MANAGER grants: letters, documents, referrals, offer template).
- UI tests: plan `17-e2e-browser-test-plan.md` (A4) and `evidence/bug-register.md`. P0 pass, P1 1494 route loads with 8 Low fails, P2 17/19 pass (2 blocked), P4-P6 re-run with fixes verified, P3 and P7 partial.
- Unit tests: frontend vitest 137 files / 2690 pass; `EmployeeControllerTest` 20 pass; `next build` and `tsc` clean. Backend integration tests need Docker and have not run.
- Not done and needs the owner: external Codex and Grok review (A7, NOT RUN), two-tenant isolation (not testable locally, second tenant has no users), Redis rate-limit mode check, `.env` `NEXT_PUBLIC_API_URL` for real-browser login, deploy-time removal of leftover `NUAURA_TEST_*` data (list in the register), product decisions: H-016 Applicant-to-Candidate status mapping, G-010/G-011 enrolment data, UI-002 PSA project seed, UI-013, `/tasks` Task API.
- Statements below about test counts, "uncommitted" fixes, V342-V345, the 14-check browser run and tenant isolation are from 2026-11-15 and are superseded by this block.

## Decision: NO-GO (today). Path to GO is short and listed below.

Reason in one line: payroll is not yet trustworthy (statutory filings, TDS), the encryption migration cannot finish, production was never inspected, and 40+ fixes made in this audit are uncommitted and undeployed.

## NO-GO conditions checked (from the master prompt)
| Condition | Result |
|---|---|
| Critical security vulnerability | None confirmed locally. R1 (demo logins on prod) BLOCKED, unverified. |
| Cross-tenant access | None found (RLS verified as app role, local only). |
| Unauthorised payroll access | None found. Other employee gets 403 on payslip PDF. |
| Auth bypass | None found. |
| Wrong critical payroll calculation | Was present (unpaid leave, joiner). Fixed and live-verified. TDS slabs still FY2024-25 with no standard deduction: NEEDS-HUMAN (CA). Statutory filings return 400: OPEN. |
| Unsafe migration / encryption migration | OPEN. DEF-03/04: sentinel-prefixed values corrupt on re-save, key rotation cannot finish. 44 old migrations edited after apply (DEF-BE-02), prod checksum state unchecked. |
| Prod credentials exposed | Not found in repo scan. Prod env never inspected (BLOCKED). |
| Prod demo accounts enabled | Unknown. Local bundle clean after fix. Prod BLOCKED. |

## What is now fixed (live-verified on rebuilt local stack)
Payslip PDF (was 0 bytes), unpaid leave deduction, mid-month proration, maker-checker, IFSC length, offer creation, candidate stage CHECK, interviewer PII, OKR key result create, manager review boundaries, wiki/blog/template create + list + read, wiki UI create (slug), draft/private list leak (except TEAM/RESTRICTED), role update, manager leave reject, audit log persistence, employee default permissions, demo login opt-in, auth rate bucket. Full backend suite: 5325 run, 0 failures, 772 Docker-blocked, 3 skipped. FE: tsc 0, vitest 2634 pass, Next 16.4.6 build OK.

## Blockers to GO (in order)
1. Statutory filings 400 (PF/ESI/PT returns) and TDS correctness: needs a CA sign-off. Payroll must be parallel-run against Keka for 2 cycles before cutover.
2. Encryption migration (DEF-03/04): finish re-encrypt tooling, then rehearse on a copy.
3. Production inspection with your authorisation: env vars (APP_SECURITY_ENCRYPTION_KEY set, NEXT_PUBLIC_DEMO_MODE=false, DEMO_CREDENTIALS_ENABLED=false), Flyway checksum state vs the 44 edited migrations, R1.
4. Commit, review and deploy the uncommitted fixes (V342-V345). Re-run Docker-based tests (772 blocked, incl. 11 security classes) on a machine with Docker.
5. Dependency CVE scan with fresh data; Tomcat/Spring/Jackson bumps; zod/uuid breaking bumps.

## Decisions needed from you
Fluence content rights for employees (create vs read-only; read is granted now), payroll totals DTO vs hidden Gross, maker-checker for single-admin tenants, employee code policy, TEAM/RESTRICTED wiki visibility model, which Keka-parity screens to build first (register, arrears, bank advice, loan EMI, period lock), multi-tenant provisioning (DEF-TENANT-01) only if you will host more than one tenant.

## Confidence and limits
Local dev stack only. Docker down, no remote probing, no real-owner accounts. Load test was light reads on one machine. Browser E2E: 14 checks (10 pass, 3 fail since fixed, 1 inconclusive), not the full 123 Playwright specs. Keka parity: 4 of 30 verified.
