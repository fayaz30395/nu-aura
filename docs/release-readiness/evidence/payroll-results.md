# Payroll test results (agent `pay`) - 2026-11-15

Scope: local stack only (FE :3000, BE :8080, DB hrms_dev). HEAD 568b6aa3 plus uncommitted tree. Running jar built 2026-10-15; its Payslip.calculateTotals includes the **uncommitted** `employeeEsi` change (checked with javap), so the uncommitted ESI-in-net-pay behaviour is what ran. PayslipPdfService ESI row change is also uncommitted; PDF could not be rendered (DEF-PAY-05) so that row was not seen.
Accounts: finance@ (FINANCE_ADMIN, processed/approved/locked), admin@ (HR_ADMIN), sumit@ (MANAGER of A and B), arun@ (EMPLOYEE), suresh@ (RECRUITMENT_ADMIN), NUAURA_TEST_PAY_A..F users. Passwords [REDACTED]. No bank/email/SMS sends.
Test data: `evidence/test-data-pay.md`. Scripts: `evidence/scripts/pay/`. Matrix: `evidence/matrix-pay.csv` (35 rows: 12 PASS, 18 FAIL, 3 NOT IMPLEMENTED, 1 NOT TESTED, 1 INCONCLUSIVE). Defects: `evidence/defects-pay.md`.

Verdict for the payroll gate: **NO-GO as it runs today.** Arithmetic of what the run computes is exact, and release gating works, but three Critical/High money or document defects exist: approved LOP leave and expense reimbursements never reach payroll (DEF-PAY-04), every payslip PDF is empty (DEF-PAY-05), statutory returns cannot be generated (DEF-PAY-06). Statutory deductions are not part of a run (DEF-PAY-09), TDS rules are dated (DEF-PAY-08), joiners are not prorated (DEF-PAY-10).

## Part A1: calculation (April 2026: 22 working days, no holidays; pay date 2026-04-30)
Per-day rate used by code = (basic+allowances before adjustments) / working days, rounded to 2dp, then x days (PayrollRunService.applyPendingAdjustments, toMonetaryAmount).

| Emp | Input (structure) | Hand calc | System (DB row) | Match |
|---|---|---|---|---|
| A | 50000+20000+1600+1250+27150 = 100000; PF 1800, PT 200, IT 5000, other 100; expense adj 1500 (SQL) | gross 101500; ded 7100; net 94400 | 101500 / 7100 / 94400 | yes |
| B | gross 50000; PF 1800, PT 200 | no deductions other than 2000; net 48000. **Expected with 3 approved LOP days:** 3 x 2272.73 = 6818.19 -> net 41181.81 | 50000 / 2000 / 48000.00 | arithmetic yes; LOP NOT applied (DEF-PAY-04) |
| C (joined 16-Apr) | gross 35000; PF 1800, PT 200 | expected prorated 11/22 -> 17500 | 35000 / 2000 / 33000 | **no** (DEF-PAY-10) |
| D | gross 350000; LOP 0.5 day (SQL) | 350000/22 = 15909.09; x0.5 = 7954.545 -> 7954.55; ded 1800+200+7954.55 = 9954.55; net 340045.45 | 350000 / 9954.55 / 340045.45 | yes |
| E | gross 20000; PF 1200; OT 3 eff. hours (SQL) | hourly 20000/176 = 113.64 (2dp); x3 = 340.92 (exact 340.91); gross 20340.92; net 19140.92 | 20340.92 / 1200 / 19140.92 | yes (1 paisa intermediate rounding) |
| F | basic 12000 only (nulls elsewhere); other deductions 15000 | net -3000 | 12000 / 15000 / -3000.00 | yes arithmetic; negative net allowed (DEF-PAY-11) |

Statutory via `POST /payroll/statutory/{payslipId}/apply?state=` (the only way they get applied):

| Emp (state) | Hand calc from code formulas | System | Match |
|---|---|---|---|
| A (KA), gross 101500, basic 50000 | PF ee 12% x min(50000,15000) = 1800; er 1800; ESI 0 (gross>21000); PT 200; TDS: annual 1,218,000 -> 15,000+30,000+45,000+3,600 = 93,600 x1.04 = 97,344 /12 = 8,112; total slip ded 1800+200+8112+100 = 10,212; net 91,288 | 1800 / 1800 / 0 / 200 / 8112.00; ded 10212, net 91288 | yes |
| E (KA), gross 20340.92, basic 10000 | PF 1200; ESI ee 0.75% = 152.56 (152.5569), er 3.25% = 661.08; PT 200; TDS 0; ded 1552.56; net 18788.36 | same | yes |
| D (MH, female), gross 350000, basic 125000 | PF 1800; PT 200 (female >25000); TDS: 4,200,000 -> 15,000+30,000+45,000+60,000+810,000 = 960,000 x1.04 = 998,400 /12 = 83,200; ded 1800+200+83200+7954.55 = 93,154.55; net 256,845.45 | same | yes |
| F (TN), gross 12000, basic 12000 | PF 1440; ESI 90.00 / er 390.00; PT 208 flat; TDS 0; ded 1440+208+90+15000 = 16,738; net -4,738 | same | yes |

Against current-law worked examples the TDS and possibly PT results differ (DEF-PAY-08 and compliance notes). Re-applying statutory is idempotent in design (recomputed from gross) but was not run twice.
Evidence: logs/NU-PAY-010..014, NU-PAY-040.

## Part A2: payslip release gating, PDF, authz
Run 2026-04: PROCESSED -> (finance) approve -> APPROVED -> lock -> LOCKED. Payslip rows A-F exist from the start; May/June runs left PROCESSED (unreleased) so the UI check also covers months that must stay hidden.

| Check | Result | Evidence |
|---|---|---|
| Owner A, run unreleased: payslip by id, /pdf, period, period/pdf | 404, 404, 404, 404 | NU-PAY-030 |
| Owner list / year list while unreleased | 200 with 0 items | NU-PAY-030 |
| Other employee/ID guess (A->B, B->A) unreleased | payslip by id 404; employee-scoped 403 | NU-PAY-030 |
| Employee: /payslips, /runs, /payslips/run/{id}, /salary-structures, statutory preview | 403 | NU-PAY-030 |
| Employee tries approve/process/lock | 403 x3 | NU-PAY-031 |
| After release: owner by id, by period | 200, values equal DB (gross 101500, net 91288) | NU-PAY-031 |
| After release: owner PDF (id and period) | **200 but Content-Length 0** (also finance; UI download 0 bytes) | NU-PAY-032, NU-PAY-070 |
| After release: manager (sumit, A's manager), other employee, recruiter, B reading A, A reading B | 403 on payslip, pdf, period, period/pdf | NU-PAY-031 |
| UI as A (`/me/payslips`) | shows 1 payslip (April only), no May/June; net 91,288 visible; screenshot | screenshots/NU-PAY-070-employee-payslips-ui.png |
| Post-release mutation (apply statutory, delete payslip, re-approve, re-bulk, delete/update run, create payslip) | 409/409/409/409/409/409/400 | NU-PAY-031 |
| Lock twice, lock non-approved | 409 | NU-PAY-050 |
| Maker-checker | processedBy == approvedBy (finance) accepted | NU-PAY-031 |
| Employee dashboard after release | 200 (body not inspected for amounts) | NU-PAY-031 |

Notes: the backend env for FE is misconfigured for local runs (FE calls `http://backend:8080`, DNS fails); UI tests used Playwright route rewriting to localhost:8080, no config changed. New users have mustChangePassword=true; A changed password through the API before UI login.
Payroll runs UI (finance): April LOCKED with 5 employees but "Gross Rs 0.00" and period "Mar 31 - Apr 29" (DEF-PAY-07).
Tenant-wide async process (`POST /runs/{id}/process`): 400 pre-flight "21 active employee(s) are missing an active salary structure"; the Kafka publish path is BLOCKED (Kafka disabled locally); all runs used the synchronous bulk endpoint. A real tenant run therefore needs every active employee to have a structure.

## Part A3: other
- Payroll reports as payroll admin: statutory filings 12/12 HTTP 400 (DEF-PAY-06); run summary/register endpoints 404 (DEF-PAY-16); custom report builder NOT TESTED. No PAYROLL_ADMIN demo account exists; FINANCE_ADMIN (same payroll permissions plus VIEW) and HR_ADMIN were used.
- Audit trail: logs/NU-PAY-060-audit.txt (DEF-PAY-14).
- Arrears: no code, no API, no UI (NU-KEKA-003). Loan EMI: see Part B.
- Zero/negative: negative structure amounts rejected (400); zero basic accepted on an inactive structure; negative net accepted (DEF-PAY-11); F with null components processed.
- Not tested: overtime event path, F&F with real exit, Form 16 output, bonus module, multi-currency/global payroll, concurrent run creation, Kafka path.

## Part B: five Keka items

| # | Item | Implementation | Executed / verified | Authz | Persistence | Audit | Limits | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | Payslip release gating | PayslipService.java:42 RELEASED_STATUSES, :171-205 released reads; PayrollController.java:286-420; release = run approve (PayrollRun.approve) | Yes: unreleased hidden on all payslip endpoints and UI, released visible, wrong readers 403 | PAYROLL_APPROVE for release; self/ALL view perms | run status column | run UPDATE audit rows | no separate release action (approve = release); no release without approve; release-state oracle (DEF-PAY-12); PDF empty | **PASS** (gating) / PDF FAIL |
| 2 | Bank advice file | none (grep, 8 endpoint probes 404) | n/a | n/a | n/a | n/a | bank details cannot be saved with IFSC anyway (DEF-PAY-01) | **NOT IMPLEMENTED** |
| 3 | Arrears | none; PayrollAdjustment has no arrears type and no API to create rows | n/a | n/a | n/a | n/a | adjustments only from leave/expense/overtime events, which are themselves lost (DEF-PAY-04) | **NOT IMPLEMENTED** |
| 4 | Loan EMI via payroll | LoanService (EMI calc EmployeeLoan.java:105, manual recordRepayment LoanService.java:210); no link in application/payroll | Loan 120000 @12% x12: EMI 10661.85 (matches annuity formula), total 127942.20; approve/disburse/activate OK (finance); May and June runs: no EMI line, outstanding unchanged 127942.20, 0 repayment rows | LOAN:APPROVE needed (sumit 403) | loan row | loan create/approve/disburse audited | isSalaryDeduction flag has no effect | **NOT IMPLEMENTED** (as payroll recovery) |
| 5 | Timesheet locking | TimeEntry status DRAFT/SUBMITTED/APPROVED/REJECTED; ProjectTimesheetService.java:127-129 update guard, :307 delete guard; validator "older than 3 months" | API: edit/delete after submit/approve 409; self-approve 403; manager approve OK; new entry in already-approved period 201; entries >3 months old 400 | TIMESHEET:APPROVE | time_entries | no audit rows seen | no period lock model, no UI test, PSA timesheets not run | **FAIL** (period lock missing; entry lock works) |

## Test ID table
See `evidence/matrix-pay.csv` for all 35 rows with evidence paths. Reproduction scripts: evidence/scripts/pay/{nuapi,mkemp,setup_emps,setup_ss,preview,bulk,statutory,gate,release,may,loan2,ts,misc,probes_c}.py, ui.cjs, ui_fin.cjs (credentials via env vars).

## Cleanup/leftovers (local DB)
NUAURA_TEST_PAY_A..F employees/users, 7 salary structures, runs 2026-04 (LOCKED), 2026-05 and 2026-06 (PROCESSED), payslips, 3 SQL adjustments (PROCESSED), 1 loan (ACTIVE), 2 LOP leave requests, 1 expense claim, time entries, membership of A in PROJ-001. Nothing deleted.
