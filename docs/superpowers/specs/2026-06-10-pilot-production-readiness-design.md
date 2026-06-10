# Pilot Production Readiness — Design Spec (2026-06-10)

**Goal:** NU-AURA ready for a real pilot tenant (employees, managers, CEO using the deployed app) by 2026-06-11 EOD.
**Approach:** Risk-ranked parallel pipeline (approved Approach A).

## Scope

### Wave 1A — Critical security (migrations V272–V276)
1. **RLS session leak:** `EmployeeService`, `ExpenseClaimService`, `MileageService` call `set_config('app.current_tenant_id', …, false)` — session-scoped, persists on pooled connections → cross-tenant read risk. Fix: remove or make transaction-local; `TenantRlsTransactionManager` is the canonical mechanism. Sweep for any other `set_config(…, false)`.
2. **Demo credentials:** Verify V270 fully neutralizes `Welcome@123` seeds (V49/V173) incl. SUPER_ADMIN outside demo; close gaps via new migration.
3. **Auth/RBAC cluster:** (a) TenantAdmin must not be able to grant SUPER_ADMIN / roles above own; (b) impersonation revoke must actually invalidate tokens (blacklist); (c) MFA enforced server-side at login.

### Wave 1B — Wave-10 P0 correctness (migrations V277–V281)
1. `tenants.timezone` column + tenant-zone utility.
2. Timezone-aware `now()` on critical paths only: payroll, attendance day-boundary, leave accrual. Full 855-callsite sweep **deferred** (tracked backlog).
3. `LeaveAccrualScheduler`: ShedLock + idempotent accrual (no double credit cross-pod).
4. Webhook signing key rotation: dual-secret overlap window.
5. `react-hooks/exhaustive-deps`: error for auth/tenant-critical hooks (fix violations), warn repo-wide; CI enforced.

### Wave 1C — P1 hardening (migrations V282–V286)
Kafka offset-commit-after-persist; currency precision per audit P1-2; Excel import formula sanitization; wall feed N+1; `next/dynamic` for Tiptap/Recharts/ExcelJS; `__Host-` cookie prefix (prod profile only). P1-4 (Helm hostname) report-only — env-specific.

### Wave 2 — Validation gate
`npx tsc --noEmit` = 0 errors; backend build + tests pass; Flyway chain validates; fix fallout.

### Wave 3 — E2E + report
Parallel Chrome E2E sweep on running local stack. Final readiness report: fixed / deferred / go-live env checklist (incl. verify prod datasource user = `nu_app_rls` NOBYPASSRLS, `RLS_PROBE_SKIP` unset).

## Rules
- Read code before editing; MEMORY.md is stale in places — verify on disk.
- Never edit existing migrations V0–V271; new migrations only, in assigned ranges.
- Follow existing patterns (TenantRlsTransactionManager, ShedLock, typed DTOs, React Query, RHF+Zod, existing Axios client, no `any`).
- No git commits — user reviews the diff.

## Exit criteria
All 1A items closed with code evidence; 1B closed pilot-scoped; 1C best-effort; validation gate green; E2E report delivered.
