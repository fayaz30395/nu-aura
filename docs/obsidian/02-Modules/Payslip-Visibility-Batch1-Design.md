---
title: Payslip visibility batch 1 design
tags: [module, payroll, design, approval-pending]
summary: Requirements, root cause, proposed design, tests and open decisions for fixing /me/payslips totals and the dashboard payroll status. Awaiting approval; nothing implemented.
---

# Batch 1: `/me/payslips` correctness and release visibility

Status: **awaiting approval. Nothing is implemented.** Follows [[Payroll-Open-Issues-Investigation]]. Evidence is
from static reading on 2026-10-10 unless marked otherwise.

## 1. What is actually wrong (two problems, not one)

### Problem A: the page reads fields the API does not send (new finding)
- The backend returns the `Payslip` entity as-is (`PayrollController` list and get endpoints). Its JSON fields,
  confirmed by the generated OpenAPI model `frontend/lib/generated/api/model/payslip.ts`, are `payDate`,
  `payPeriodMonth`, `payPeriodYear`, `basicSalary`, `grossSalary`, `totalDeductions`, `netSalary`. There is **no
  `status` field**.
- `frontend/app/me/payslips/page.tsx` uses the stale type `Payslip` from `lib/types/hrms/payroll.ts:37`, which has
  `paymentDate`, `netAmount`, `grossAmount` and `status: 'DRAFT' | 'FINALIZED' | 'PAID' | 'PENDING'`.
- The response interceptor does not rename fields (`lib/api/client.ts:103`, success path returns the response
  untouched), and the service passes the entity through (`payroll.service.ts` `getPayslipsByEmployee`).
- A correct type already exists: `RunPayslip` (`payDate`, `netSalary`, ...) in the same file, used by the payroll
  run page.
- **Predicted effect on real data (not yet reproduced):** `new Date(undefined)` gives Invalid Date so the year
  filter and month labels are wrong; `p.netAmount` is undefined so the yearly total and average are `NaN`; and
  typing in the search box would throw on `payslip.status.toLowerCase()`.
- Other consumers of the stale type: `app/payroll/payslips/page.tsx`, `app/payroll/_components/types.ts`,
  `components/payroll/PayslipCard.tsx`. Existing Vitest tests mock the stale shape, which is why they cannot
  catch this.
- **Step zero of implementation is a failing test with a backend-shaped fixture** that reproduces the above. If it
  does not reproduce, the plan below shrinks.

### Problem B: unreleased months disappear without a signal (the originally reported issue)
- Server-side gating (commit `bfbba0b7`) filters silently. Totals shrink, a year containing only unreleased runs
  vanishes from the year filter, and nothing tells the employee the list is incomplete.
- Dashboard: an unreleased month renders `0` and `payslipStatus` is hardcoded `"PAID"`
  (`EmployeeDashboardService.buildPayrollSummary`). The field has **no frontend consumer** (grep), so the effect is
  API-only today.

## 2. Requirements

| # | Requirement |
|---|---|
| R1 | WHEN an employee opens `/me/payslips`, the system SHALL list each released payslip with the correct period, gross, deductions and net taken from the API fields. |
| R2 | The page SHALL compute totals from released payslips only and SHALL state when one or more periods in the selected year are not yet released. |
| R3 | The system SHALL NOT expose amounts of unreleased payslips to a self-view caller, in any endpoint (already enforced server-side; keep it so). |
| R4 | The release-status endpoint SHALL require the same access check as the other payslip reads, SHALL return no amounts, and SHALL list only months that have a payslip. |
| R5 | The dashboard SHALL NOT report a payslip as `PAID` unless a released payslip exists for that month. |
| R6 | Callers with `PAYROLL_VIEW_ALL` and super admins SHALL see unchanged behaviour. |
| R7 | Payroll preview (`persist=false`) behaviour SHALL be unchanged. This batch does not touch run processing. |
| R8 | The page SHALL not crash when the search box is used. |

## 3. Proposed design

### Backend (no migration)
1. `GET /api/v1/payroll/payslips/employee/{employeeId}/release-status?year=YYYY`
   - Same `determineViewPermission()` and `validateEmployeeAccess()` as the sibling reads.
   - Response: `[{ "month": 3, "released": true }, ...]` for months that have a payslip. No amounts.
   - One tenant-scoped JPQL projection joining `Payslip` to `PayrollRun` and comparing against
     `PayslipService.RELEASED_STATUSES`. A payslip with no run counts as unreleased.
   - A small response DTO (record), not the entity.
2. `EmployeeDashboardService.buildPayrollSummary`: derive `payslipStatus` instead of hardcoding it.
   Proposed values: `PAID` (a released payslip exists for the month, preserving today's wording),
   `NOT_RELEASED` (a payslip exists but is unreleased), `NOT_AVAILABLE` (none). Amounts stay zero when not released.

### Frontend
3. Fix Problem A at the page boundary: switch `/me/payslips` to the `RunPayslip` shape (or a small mapper
   `normalizePayslip` at the service boundary, as `normalizePayrollRun` already does for runs). Recommendation:
   use `RunPayslip` for the self page only, and **leave the admin page and `PayslipCard` out of scope**.
4. New hook for the release-status call; the page shows, for the selected year, a note such as
   "N of M periods are not yet released; totals cover released periods only" when any entry is `released: false`.
5. Year filter built from `payPeriodYear`, and the search guard fixed (R8).

### Files expected to change (estimate)
Backend: `PayrollController`, `PayslipService`, `PayslipRepository`, a response record,
`EmployeeDashboardService`. Frontend: `lib/types/hrms/payroll.ts` (only if needed), `payroll.service.ts`,
`usePayroll.ts`, `app/me/payslips/page.tsx`. Tests listed below.

## 4. Tests

Backend
- DB-backed (real Postgres, same pattern as `PayslipReleasedQueriesIntegrationTest`): release-status returns
  released and unreleased months correctly; months without a payslip are absent; year filter; tenant isolation;
  a run transitioning to APPROVED flips the flag.
- Controller level: self gets own data; self requesting another employee is denied; `PAYROLL_VIEW_ALL` sees real
  statuses; super admin allowed; unauthenticated rejected; no amount field appears in any response.
- Dashboard unit tests for the three `payslipStatus` values.

Frontend (Vitest and React Testing Library; the page currently has **no test file**)
- Reproduction test with a backend-shaped fixture (fails today if Problem A is real).
- Note shown when some periods are unreleased; hidden when all are released.
- Totals use only returned (released) payslips and are never `NaN`.
- Search input does not throw.

## 5. Security considerations
- The release-status endpoint reveals, to the employee themselves, that a payslip exists for a month and whether it
  is released. No amounts. Same authorization as other payslip reads. A caller cannot query another employee
  without the broad permission.
- No change to who can see amounts. Cross-employee dashboard payroll visibility is a separate, deferred track
  (see section 7).

## 6. Decisions needed from you

1. **Scope of the type fix:** `/me/payslips` only (recommended), or also the admin payslips page and `PayslipCard`
   (same stale type, larger change).
2. **Release-status shape:** per-month list (recommended, enables a clear "not yet released" row) or only an
   unreleased count (reveals less).
3. **Dashboard status values:** `PAID` / `NOT_RELEASED` / `NOT_AVAILABLE` as proposed, or different wording.
4. **Copy** of the "not yet released" note.

## 7. Next tracks (not in this batch)
- **Manager dashboard authorization:** first verify the rules (reporting relationships, role grants, super-admin
  behaviour), default to deny when authorization cannot be established, then add DB-backed tests for authorized
  and unauthorized access. No change to cross-employee payroll visibility until verified.
- **P0-2 to P0-5:** only after business rules are confirmed. Arrears start from the smaller design (an `ARREARS`
  enum value plus origin-period columns); a payslip line-item table only if PDF presentation requires it. The
  tests to include: deleting a payslip and rerunning payroll must not leave orphaned adjustments; preview
  (`persist=false`) stays side-effect free; money conversion of LOP days and overtime hours must be checked so it
  does not misstate the amounts.

---

# Approved decisions and implementation task plan

Plan state: **decisions approved; this task plan awaits approval. No code has been changed.**

## Approved decisions (as given)
1. Type fix on `/me/payslips` only, using `RunPayslip`; no changes to the admin payslips page or `PayslipCard`;
   downstream incompatibilities are recorded as follow-ups.
2. Per-month release-status endpoint; a month without a payroll run is reported unreleased; release only when the
   payslip meets the agreed condition (run `APPROVED` or `LOCKED`); existing access checks and tenant isolation.
3. Dashboard statuses `PAID`, `NOT_RELEASED`, `NOT_AVAILABLE` with distinct meanings; **`PAID` only from an
   authoritative payment record; never derived from approval**.
4. Wording: "Some payslips are not yet available. Your totals include released periods only." With a reliable count:
   "N periods are not yet released. Your totals include released periods only."

## Facts that shape the plan (checked 2026-10-10)
- **No authoritative payment record exists for standard payslips.** `PayrollRun.PayrollStatus` is DRAFT,
  PROCESSING, PROCESSED, APPROVED, LOCKED (no paid state) and `Payslip` has no paid field. The only `PAID`
  statuses (`EmployeePayrollRecord`, `GlobalPayrollRun`) belong to the separate Global Payroll module and do not
  link to `Payslip`. Therefore **`PAID` cannot be emitted for standard payroll.** This limitation is documented
  and tested, not hidden.
- Dashboard `paymentDate` is currently `lastMonth.atEndOfMonth()`, a date nobody confirmed.
- The page uses `payslip.paymentDate`, `baseSalary`, `deductions`, `allowanceDetails`, `deductionDetails` and a
  status badge (`PAID`/`FINALIZED`/other). The API has none of `allowanceDetails`, `deductionDetails`, `status`,
  `employeeName`; it has the flat components (`hra`, `conveyanceAllowance`, `medicalAllowance`,
  `specialAllowance`, `otherAllowances`, `providentFund`, `professionalTax`, `incomeTax`, `otherDeductions`).
- The page also has an admin mode (toggle) that reads the same raw entity through `usePayslips`.
- `usePayslipsByEmployee` and `getPayslipsByEmployee` are used only by this page; `usePayslips` is shared.
- CI builds the frontend from the committed `frontend/openapi-snapshot.json`, which must be refreshed through the
  backend `OpenApiSpecExportIT` when the API surface changes.
- Baselines: frontend 4 payroll test files, 109 tests pass. Backend related suites: 72 pass (previous run).

## Points I need confirmed (defaults shown; I will not assume beyond them)
| # | Point | Default if you say nothing |
|---|---|---|
| C1 | Endpoint returns all 12 months, each `{month, released, reason}`; `reason` is `RELEASED`, `NOT_RELEASED` (payslip exists, run not released) or `NO_PAYSLIP` (including months with no run). `released` is true only for `RELEASED`. No amounts. | As written |
| C2 | The page's "N periods" count counts only `NOT_RELEASED` months. `NO_PAYSLIP` months are not counted, otherwise future months would inflate it. | As written |
| C3 | Dashboard mapping given there is no payment record: no run or an unreleased run gives `NOT_RELEASED`; a released payslip gives `NOT_AVAILABLE` (payment cannot be established). I recommend adding a fourth value `RELEASED` (additive, no current consumer), but it is outside your approved set. | `NOT_AVAILABLE`, no fourth value |
| C4 | Dashboard `paymentDate`: set to `null` because no confirmed payment date exists. | Left unchanged and documented as unreliable, which I consider less honest |
| C5 | Admin mode inside `/me/payslips` gets the same view-model mapping (it uses the same stale shape). Employee names stay empty because the API sends none; recorded as a follow-up. | As written |
| C6 | Status badge: self view shows "Released" (everything returned is released); admin mode shows no status badge (release state is not in the list response). Search by status removed. | As written |

## Ordered task checklist

**Phase 0: preconditions**
- [ ] T0.1 `colima start`; export `DOCKER_HOST=unix://$HOME/.colima/default/docker.sock`,
  `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock`, `TESTCONTAINERS_RYUK_DISABLED=true`.
- [ ] T0.2 Confirm a clean baseline: backend related suites and frontend 109 tests pass (already recorded).
- [ ] T0.3 Record `git status` so unrelated changes are provably untouched at the end.

**Phase 1: red tests first**
- [ ] T1.1 Vitest reproduction `app/me/payslips/page.test.tsx` with a backend-shaped fixture
  (`payDate`, `netSalary`, ...). Expected to fail today (NaN totals, Invalid Date, search throws). If it does not
  fail, stop and report, because the plan shrinks.
- [ ] T1.2 Backend DB-backed `PayslipReleaseStatusIntegrationTest` (real Postgres): 12 months returned; released
  and unreleased and no-payslip cases; no-run month is unreleased; tenant isolation; a run moving to `APPROVED`
  flips its month; amounts absent from the response.
- [ ] T1.3 Controller tests: self own year; self requesting another employee denied; `PAYROLL_VIEW_ALL` allowed;
  super admin allowed; unauthenticated rejected.
- [ ] T1.4 Dashboard unit tests: `NOT_RELEASED`, `NOT_AVAILABLE`, and a test proving `PAID` is never emitted from
  `APPROVED` or `LOCKED`; `paymentDate` per C4.

**Phase 2: backend (no migration)**
- [ ] T2.1 Response record (for example `PayslipReleaseStatusResponse(month, released, reason)`).
- [ ] T2.2 `PayslipRepository`: tenant-scoped projection of month and run status for an employee and year.
- [ ] T2.3 `PayslipService.getReleaseStatus(employeeId, year)`: build all 12 months; reuse
  `RELEASED_STATUSES`; a null `payrollRunId` is `NO_PAYSLIP`/unreleased.
- [ ] T2.4 `PayrollController`: `GET /payslips/employee/{employeeId}/release-status?year=`, using
  `determineViewPermission()` and `validateEmployeeAccess()` exactly like the sibling reads; validate `year`.
- [ ] T2.5 `EmployeeDashboardService.buildPayrollSummary`: derive `payslipStatus` and `paymentDate` per C3 and C4.
- [ ] T2.6 Refresh `frontend/openapi-snapshot.json` via `OpenApiSpecExportIT`; the diff must contain only the new
  endpoint and schema. If it is noisy, stop and report.

**Phase 3: frontend (`/me/payslips` only)**
- [ ] T3.1 Service `getMyPayslips` (returns `Page<RunPayslip>`) and `getPayslipReleaseStatus(employeeId, year)`;
  leave the old shared functions untouched.
- [ ] T3.2 Hooks `useMyPayslips` and `usePayslipReleaseStatus`; no retry on 4xx.
- [ ] T3.3 A small view-model mapper `RunPayslip` to display shape (period from `payPeriodMonth`/`Year`,
  allowance and deduction lines from the flat components, null-safe sums). Applied to both self and admin modes
  inside this page (C5).
- [ ] T3.4 Page: year filter from `payPeriodYear`; totals from returned payslips only; the approved wording; show
  the count only when the endpoint returned data and the count is reliable (C2); "Released" badge (C6); guard the
  search path so it cannot throw.

**Phase 4: verification sequence (in this order)**
1. New tests go green; confirm each failed first for the right reason.
2. Mutation check on the backend gate and on the page note (disable the logic, expect red, restore byte-identical).
3. Related suites: backend `mvn -Dtest='PayslipReleaseStatus*,PayslipReleasedQueries*,PayslipServiceTest*,PayrollControllerTest,EmployeeDashboardService*' test`.
4. Frontend: `npx vitest run app/me/payslips lib/services/hrms/payroll.service.test.ts lib/services/payroll.service.test.ts __tests__/integration/payroll-flow.test.tsx lib/validations/__tests__/payroll.test.ts`; baseline 109 must still pass plus the new tests.
5. `npx tsc --noEmit`; `npx eslint <touched files> --max-warnings=0`.
6. `NEXT_PUBLIC_API_URL=<real deployed API host> npm run build`; then `git checkout -- frontend/next-env.d.ts`
   (build side effect).
7. Confirm with `git diff --stat` that only planned files changed, the admin payslips page and `PayslipCard` are
   untouched, and no migration exists.
8. Stop colima. No commit and no push without your approval.

## Affected files (expected)
Backend: `PayrollController`, `PayslipService`, `PayslipRepository`, new response record,
`EmployeeDashboardService`; tests `PayslipReleaseStatusIntegrationTest`, controller test additions,
`EmployeeDashboardServiceReleaseGatingTest` additions. Frontend: `lib/services/hrms/payroll.service.ts`,
`lib/hooks/queries/usePayroll.ts`, `app/me/payslips/page.tsx` (+ a mapper file and `page.test.tsx`),
`frontend/openapi-snapshot.json`.

## Out of scope (unchanged)
Admin payslips page; `PayslipCard`; manager payroll visibility; P0-2 to P0-5; any migration; credential rotation;
encryption-key migration; deployment; CI configuration changes; the release gate stays NOT_PASS.

## Follow-ups to record (not done)
Admin payslips page and `PayslipCard` use the same stale type; employee names are not sent by the list API; the
"Total Earnings (0)" label when the year filter is "All"; the CI policy change (separate reviewed change).
