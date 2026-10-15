---
title: Payroll open issues investigation
tags: [module, payroll, security, investigation, keka-parity]
summary: Root cause, expected behavior, tests, security impact and plan for Keka P0-2 to P0-5 and two payslip-visibility issues. Investigation only; no code changed. Verified claims are marked.
---

# Payroll open issues investigation (2026-10-10)

Companion to [[Keka-Gap-Analysis]]. **No implementation was done.** Three read-only investigators produced the
detail; the load-bearing claims were then re-checked by a second pass and are marked **verified**. Anything
else is the investigator's claim.

## Recommended order

| Order | Item | Why | Needs migration | Blocked on a human decision |
|---|---|---|---|---|
| 1 | Manager sees a report's payroll on the dashboard | Salary disclosure; small fix; no migration | No | One (scope policy) |
| 2 | Silently shrinking `/me/payslips` totals and the hardcoded `PAID` | Wrong numbers shown to every employee | No | No |
| 3 | P0-5 timesheet period lock and reminders | Narrower than first thought (see correction) | Yes | Yes |
| 4 | P0-4 loan EMI through payroll | Money correctness | Option dependent | Yes (design) |
| 5 | P0-3 arrears | New permission, maker-checker, statutory rule | Not for an enum value | Yes (statutory) |
| 6 | P0-2 bank advice file | Largest PII surface; format unknown | Likely a permission seed | Yes (format, PII) |

Any migration number must be chosen only after `git log --all --diff-filter=A -- '*V3*'` (release branches hold
migrations that `main` does not).

## Corrections to the Keka gap analysis

- **P0-5 was overstated.** Approved and billed project time entries are already immutable by status:
  update only for DRAFT/REJECTED, delete only for DRAFT (`ProjectTimesheetService.java:131-135, 306-317`,
  `TimeEntryValidator.java:196-206`), and invoicing sets BILLED (`ProjectInvoiceGenerationService.java:85-89`).
  The real gaps are a period/cutoff lock, no guard against back-dating into a billed period (**verified**: no such
  check in `createTimeEntry`), no reminders, and a second `timetracking` module (below).
- `docs/pendings.md` has two stale claims already recorded in the gap analysis.

## 1. Manager visibility of payroll on `/dashboards/employee/{employeeId}`

- **Current (verified):** `enforceEmployeeDashboardViewScope` allows super/tenant admin, `EMPLOYEE_VIEW_ALL`,
  self, or `EMPLOYEE_VIEW_TEAM` plus the caller's reportees (`DashboardsController.java:158-182`). It never
  checks a `PAYROLL_VIEW_*` permission, then returns the full response including payroll (`:195-196`).
  `RoleHierarchy.java` grants `EMPLOYEE_VIEW_TEAM` to five role definitions and `PAYROLL_VIEW_ALL` to two, so
  managers hold the first without the second.
- **Contrast (verified):** `PayrollController.validateEmployeeAccess` denies a manager the same data.
- **Root cause:** payroll is its own permission domain but the dashboard gates on employee-view scope. Commit
  `bfbba0b7` hid *unreleased* data and left the report's salary visible.
- **Exposure today:** API only. `useEmployeeDashboardById` has no callers in the frontend (grep, not exhaustive).
- **Expected:** a caller viewing someone else without `PAYROLL_VIEW_ALL` (and not super admin) gets
  `payroll = null`. Self-view unchanged.
- **Tests (matrix):** self present; manager of target null; team lead null; HR with `EMPLOYEE_VIEW_ALL` only
  null; holder of `PAYROLL_VIEW_ALL` present; super admin present; unrelated employee 403.
- **Security:** salary disclosure across a privilege boundary.
- **Open decision:** should a `PAYROLL_VIEW_TEAM` scope ever show a manager the block? If yes, reuse the
  payroll controller's scope logic instead of nulling.

## 2. Silently shrinking `/me/payslips` totals and the dashboard `PAID` label

- **Current:** the list filters silently (`PayrollController.java:306-309`). `app/me/payslips/page.tsx:107-108`
  sums the returned list for `yearlyTotal` and `yearlyAverage`, and "Total Payslips" is the list length
  (~`:179`); nothing says the list is incomplete. The year filter is built from returned dates (`:89-90`), so a
  year with only unreleased runs disappears. On the dashboard an unreleased month renders `0` and
  `payslipStatus("PAID")` is hardcoded (`EmployeeDashboardService.java`, in `buildPayrollSummary`).
- **Root cause:** the gate is applied in the query with no signal to the client.
- **Expected:** each period shows released (with amounts), not yet released (no amounts), or no payslip; totals
  are labelled "released periods only" when any period is unreleased; the dashboard says "Not yet released"
  instead of `PAID` or zero.
- **Smallest API change:** a sibling endpoint, for example
  `GET /payslips/employee/{id}/release-status?year=` returning `[{month, released}]`, using the same access
  check and returning no amounts. The existing `Page<Payslip>` contract stays unchanged.
- **Tests:** Vitest 3.2.4, React Testing Library and Playwright exist. **No test file exists for this page.**
  Add a page test (note shown, dropdown behaviour) and backend tests for the endpoint and the derived status.
- **Security:** the endpoint discloses only that a payslip exists and whether it is released; it must use the
  same access check as the other payslip reads.

## 3. P0-5 timesheet period lock and reminders

- **Current:** see the correction above. No cutoff config and no reminder job exist. Scheduler precedent is
  `HireReminderScheduler` (`@Scheduled`, `@SchedulerLock`, `NotificationService`).
- **Second module (unverified):** `domain/timetracking/TimeEntry` also has APPROVED and BILLED statuses with its
  own `TimeTrackingService`. Whether it reaches invoicing, and whether the same guard is needed, is unchecked.
- **Unverified:** whether the invoice stores a snapshot of hours and amounts or recomputes from live entries.
- **Expected:** invoiced periods immutable; back-dated create into a locked period rejected or moved to the open
  period; reminders before cutoff; unlock explicit and audited.
- **Tests:** unit guard tests for create/update/delete in a locked period; DB-backed test that editing a billed
  entry fails and back-dated create fails; scheduler idempotency under ShedLock.
- **Security:** lock and unlock limited to finance or approver roles; every unlock writes an audit row.
- **Open decisions:** lock granularity, cutoff day and timezone, reject versus move, fate of `timetracking`.

## 4. P0-4 loan EMI recovery through payroll

- **Current (verified):** `LoanService.recordRepayment` is a manual call and reduces `outstandingAmount`
  (`LoanService.java:205-238`); nothing under `application/payroll` or `domain/payroll` references loans.
  `LoanRepayment` exists as an entity (installment number, due date, `SALARY_DEDUCTION`, `payrollRunId`) but
  **nothing uses it** (verified). `FnFCalculationService` only copies a manually entered `loanRecovery`.
- **Unverified by me:** `recordRepayment` is not idempotent (a retry double-subtracts) and can NPE on a null
  balance; the net-pay floor (can deductions push net below zero?) was not read.
- **Root cause:** no link between the loan schedule and a payroll run.
- **Expected:** each ACTIVE salary-deduction loan yields one deduction `min(emi, outstanding)` in the pay month
  of its due date; once per run even on reprocess; balance reduced when the run is APPROVED/LOCKED, not DRAFT;
  zero balance closes the loan.
- **Options:** A, a `LOAN_RECOVERY` adjustment type (small, no migration, no per-installment ledger).
  B, use the existing `LoanRepayment` as an installment ledger with a unique key on loan and installment
  number (audit trail and idempotency, needs a migration). Investigator recommends B, reusing the adjustment
  mechanics for the payslip line. I agree the wired-but-unused entity makes B attractive.
- **Tests:** final partial EMI; reprocess does not re-deduct; delete-and-regenerate payslip; closed loan drops
  out; net-pay floor; DB-backed approve-then-balance test.
- **Security:** tenant scoping on the new hook; audit row per installment consumed; loan data kept out of logs.
- **Open decisions:** A versus B; first EMI month; defaulted loans; exit mid-tenure (F&F).

## 5. P0-3 arrears and supplementary pay

- **Current (verified):** `PayrollAdjustment.AdjustmentType` has six values and none is arrears. Adjustments are
  created only by `PayrollIntegrationListener` (overtime, expense, LOP) and `PayrollRunService`; **there is no
  REST endpoint and so no manual entry point and no permission gate.** `applyPendingAdjustments`
  (`PayrollRunService.java:515-562`) folds earnings into `otherAllowances` and deductions into
  `otherDeductions`, so a component would be invisible on the payslip. Only `persist=true` marks rows PROCESSED.
- **Reported, unverified:** adjustments bypass `StatutoryDeductionService`; `adjustment_type` is `VARCHAR(30)`
  with no CHECK constraint (an enum value then needs no migration; origin-period columns or a line-item table
  would).
- **Root cause:** arrears have no type and no origin-period concept.
- **Expected:** arrears entered for a past period are applied once in the next run, marked consumed, and shown
  as their own payslip line.
- **Tests:** once-only consumption; reprocess; statutory effect per the chosen rule; permission and tenant
  (IDOR) denial; audit on create and cancel.
- **Security:** new permission separate from `PAYROLL:PROCESS` (for example `PAYROLL:ADJUST`); maker-checker.
- **Open decisions (human):** statutory base for arrears (origin month versus current month, matters for TDS),
  separate payslip line, maker-checker, whether to restrict an `OTHER` type.

## 6. P0-2 bank advice / payment file

- **Current (verified):** no bank-advice or payment-file code exists. Account number and IFSC are encrypted
  (`Employee.java:139-146`, `EncryptedStringConverter`). Generators under
  `application/payroll/service/filing/` and `StatutoryFilingService` are the file-generation precedent. No
  export permission exists (`Permission.java` has only the `PAYROLL:*` set).
- **Expected:** for an APPROVED or LOCKED run, an export listing each employee's net amount, account and IFSC;
  totals reconcile to the run; employees without bank details are listed, not skipped.
- **Proposed shape:** `GET /runs/{id}/bank-advice`, a new service, a new permission such as
  `PAYROLL:BANK_ADVICE`.
- **Tests:** row building and status gate; DB-backed tenant isolation, permission denial, encrypted round trip,
  audit payload.
- **Security:** decrypt in memory only; never log account numbers; mask previews; audit run id, actor, row
  count and file hash.
- **Open decisions (human):** bank file format, which statuses may export, which roles, whether plaintext
  account numbers may leave the server at all.

## What was not verified

Net-pay floor; full-run statutory wiring for adjustments; `timetracking` invoicing path; invoice snapshot
behaviour; whether delete-and-regenerate of a payslip re-consumes adjustments; frontend callers beyond grep.
Role mappings in `RoleHierarchy` were only spot-checked.
