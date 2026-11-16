# Defects found by agent `pay` (2026-11-15, local stack, HEAD 568b6aa3 + uncommitted tree)

Running backend jar: target/hrms-backend-1.0.0.jar (built 2026-10-15 19:20). Verified by javap that its Payslip.calculateTotals already includes employeeEsi (the uncommitted Payslip change), so the running behaviour matches the working tree for that file.
Every defect below was reproduced at least twice unless marked otherwise.

| ID | Sev | Title |
|---|---|---|
| DEF-PAY-04 | Critical | LOP leave and expense reimbursement never reach payroll (adjustment write lost after commit) |
| DEF-PAY-05 | Critical | Every payslip PDF is 0 bytes |
| DEF-PAY-06 | High | All statutory filings (PF ECR, ESI, PT, 24Q, Form 16, LWF) fail with HTTP 400 |
| DEF-PAY-08 | High | TDS uses FY2024-25 slabs, no standard deduction, no YTD projection |
| DEF-PAY-09 | High | Payroll run does not compute statutory deductions; ESI absent; manual per-payslip apply only |
| DEF-PAY-10 | High | No proration for mid-month joiners (full month paid) |
| DEF-PAY-01 | High | Employee create/update with bank IFSC fails (encrypted value overflows varchar(50)) |
| DEF-PAY-02 | High | PUT /users/{id}/roles returns 500 under RLS (user_roles insert has no tenant_id) |
| DEF-PAY-11 | Medium | Negative net pay payslips are created and released |
| DEF-PAY-13 | Medium | No maker-checker: same user processes and approves |
| DEF-PAY-14 | Medium | Audit gaps: run create, payslip create/statutory apply, adjustments not audited |
| DEF-PAY-07 | Medium | Payroll runs page shows period shifted by one day and gross Rs 0.00 |
| DEF-PAY-03 | Medium | createEmployee assigns no role (import does) |
| DEF-PAY-15 | Medium | Payslip PDF header hardcoded "COMPANY NAME / 123 Business Street" |
| DEF-PAY-16 | Medium | No payroll register / run summary report endpoint |
| DEF-PAY-17 | Medium | Timesheet: no period lock; only a rolling 3-month entry window and per-entry lock after submit |
| DEF-PAY-12 | Low | 404 (unreleased) vs 403 (released) lets a user probe release state of others' payslip ids |

## DEF-PAY-04 Critical: LOP leave and expense reimbursement lost
- Symptom: B's unpaid-leave (LOP) leaves 13-14 Apr and 20 Apr approved (status APPROVED, 3 days); payroll_adjustments rows with source_module LEAVE = 0; April/B payslip net 48000.00 = full pay (expected 48000 - 3 x 2272.73 = 41181.81, using code's per-day rate gross/working days = 50000/22). Expense claim EXP-202611-0001 (INR 750) approved; listener logs "Created payroll adjustment 5c1599d6-..." but 0 rows exist for that id.
- Root cause (confirmed from log + code): domain events are published from inside an afterCommit callback. Leave: LeaveRequestService.java ~268-276 registers afterCommit then calls publishLeaveApprovedEvent -> DomainEventPublisher.publish sees an active tx and "defers until AFTER_COMMIT" a second time (log: "deferring domain event LEAVE_APPROVED"); that late registration never fires, so the event is never published. Expense: event is published, listener PayrollIntegrationListener.onExpenseApproved (@EventListener @Transactional REQUIRED) runs after the commit, joins the already-committed transaction, and its save is never flushed/committed.
- Files: backend/src/main/java/com/nulogic/application/payroll/listener/PayrollIntegrationListener.java (all three listeners); application/event/DomainEventPublisher.java:50-70; application/leave/service/LeaveRequestService.java:268-276, 672.
- Evidence: evidence/logs/NU-PAY-021-lop-event-dropped.txt, NU-PAY-022-expense-adjustment-lost.txt. Overtime uses the same publish path (NOT TESTED).
- Impact: employees paid for unpaid leave; approved reimbursements silently not paid. Wrong pay math.
- Fix: listeners use @TransactionalEventListener(phase = AFTER_COMMIT) + @Transactional(propagation = REQUIRES_NEW), or publish BEFORE_COMMIT; stop publishing from inside afterCommit; add an integration test against a real DB (Testcontainers) asserting the adjustment row exists. Effort: S-M.

## DEF-PAY-05 Critical: payslip PDF is empty
- Repro: GET /api/v1/payroll/payslips/{id}/pdf as owner and as finance -> 200, Content-Type application/pdf, Content-Length 0 (3 payslips). UI "Download" gives Payslip_April_2026.pdf, 0 bytes.
- Root cause: PayslipPdfService.java:111 `return out.toByteArray();` executes before the finally block closes the Document (:116), so the PdfWriter has not flushed. Same in HEAD.
- Evidence: logs/NU-PAY-032-pdf-empty.txt, logs/NU-PAY-070-employee-ui.txt.
- Fix: close the document (try-with-resources / document.close()) before toByteArray(); add a test asserting bytes start with %PDF. Effort: XS.

## DEF-PAY-06 High: statutory filing generation broken
- Repro: POST /api/v1/payroll/statutory-filings/generate {filingType, month 4, year 2026} for all 6 types as finance and HR_ADMIN -> 400 "Invalid file category: statutory-filings" (12/12).
- Root cause: StatutoryFilingService.java:35 uses category "statutory-filings"; FileStorageService.java:81-84 ALLOWED_CATEGORIES does not contain it (same class of bug as BUG-E1 receipts).
- Evidence: logs/NU-PAY-050-lock-probes-filings.txt. Fix: add category constant to the allow-list + test. Effort: XS.

## DEF-PAY-08 High: TDS rules out of date / simplistic
- StatutoryDeductionService.calculateMonthlyTds: FY2024-25 new-regime slabs (code comment BIZ-007 says so), annual = this month's gross x 12, no standard deduction, no declarations/YTD true-up, rebate cliff at 7L without marginal relief.
- Results (code formulas, hand-verified): A gross 101500 -> TDS 8112.00/month; D gross 350000 -> 83200.00/month.
- Independent worked example (ASSUMPTION: Income Tax Act new regime as amended by Finance Act 2025: slabs 0-4L nil, 4-8L 5%, 8-12L 10%, 12-16L 15%, 16-20L 20%, 20-24L 25%, >24L 30%; standard deduction 75,000; rebate 87A nil tax up to 12L taxable; cess 4%. Budget 2026 changes are not verified by me. A CA must confirm): A annual 12,18,000 - 75,000 = 11,43,000 taxable -> tax 0 (system deducts 97,344/yr). D 42,00,000 - 75,000 = 41,25,000 -> 8,17,500 + 4% cess = 8,50,200/yr = 70,850/month (system 83,200).
- Fix: DB-driven slab table by FY (as BIZ-007 proposes), standard deduction, YTD projection, regime choice from tax declaration. Effort: L.

## DEF-PAY-09 High: run does not compute statutory deductions
- PayrollRunService.buildPayslipForEmployee (lines ~512-531) copies providentFund/professionalTax/incomeTax/otherDeductions from the salary structure as typed by HR; employeeEsi is never set. PayslipService.applyStatutoryDeductions is reachable only via POST /payroll/statutory/{payslipId}/apply?state=... (state passed by caller, default "" = PT 0); no UI/frontend call exists (only generated client).
- Repro: E (gross 20340.92, ESI-eligible): run payslip total deductions 1200 (PF only, ESI 0); after manual apply 1552.56 (ESI 152.56, PT 200). LOP-adjusted gross is not used for PF/ESI in the run.
- Evidence: logs/NU-PAY-013, NU-PAY-014. Fix: call the statutory strategy inside buildPayslipForEmployee using the employee's work state; keep structure PF as override only if flagged. Effort: M.

## DEF-PAY-10 High: mid-month joiner not prorated
- C joined 2026-04-16, structure effective 2026-04-16, April run pay date 2026-04-30 -> payslip gross 35000.00 (full month). Expected 17500.00 (11 of 22 working days, equal to 15/30 calendar). Working/present days on slip stay 22/22.
- Cause: PayrollRunService.buildPayslipForEmployee uses structure amounts unscaled; presentDays/leaveDays are informational only. Absent days with no leave record also never reduce pay.
- Fix: proration factor from joining/exit date and LOP days (policy: calendar vs working days). Effort: M. Leaver case INCONCLUSIVE: RESIGNED employee is simply excluded (no payslip) and F&F was not executed.

## DEF-PAY-01 High: bank IFSC overflow
- POST /api/v1/employees with 11-char bankIfscCode -> 400 DB_INTEGRITY_VIOLATION (value too long for type character varying(50)); without it 201. Encrypted IFSC = 53 chars; employees.bank_ifsc_code and tax_id are varchar(50), encrypted. Any IFSC/PAN > 8 chars fails (also affects PUT /{id}/admin; update path not separately run).
- Evidence: logs/NU-PAY-000-employee-create-ifsc-too-long.txt (backend log lines). Blocks capture of bank details (prerequisite for bank advice). Fix: Flyway migration widening both columns to >= 100 (forward-only, new version). Effort: S.

## DEF-PAY-02 High: role assignment API fails under RLS
- PUT /api/v1/users/{id}/roles {"roleCodes":["EMPLOYEE"]} as HR_ADMIN -> 500 (6/6). Log: new row violates row-level security policy "rls_ctx_required_..." for table user_roles. The Hibernate join-table insert omits user_roles.tenant_id (nullable, no default/trigger), policy requires tenant_id = current_setting.
- Workaround used for test users: SQL insert as superuser (setup only). Fix: add tenant_id to the join mapping or default it from the GUC; add RLS test. Effort: S-M. (Cross-check with tenant-rbac agent.)

## Medium / Low (short)
- DEF-PAY-11: F payslip net -3000.00 persisted and visible once released (-4738.00 after statutory); no guard in Payslip.calculateTotals, run, or approve. Fix: block or flag negative net before approve.
- DEF-PAY-13: approve endpoint accepts the processor (processedBy == approvedBy == finance user). Fix: reject approver == processor.
- DEF-PAY-14: audit_logs has PAYROLL_RUN UPDATE rows but no CREATE, no PAYSLIP rows (statutory apply, manual payslip create/update), no adjustment consumption rows, no time-entry rows. See logs/NU-PAY-060-audit.txt.
- DEF-PAY-07: /payroll/runs lists April run as "Mar 31, 2026 - Apr 29, 2026" (period off by one day, likely local-time Date parsing) and Gross Rs 0.00 for runs with 5 payslips. screenshots/NU-PAY-071-finance-runs-ui.png.
- DEF-PAY-03: EmployeeService.createEmployee (lines 159-230) builds the User without roles and with passwordChangeRequired=true; EmployeeImportService assigns EMPLOYEE. A created employee cannot self-serve until a role is added (and DEF-PAY-02 blocks the API path).
- DEF-PAY-15: PayslipPdfService.addCompanyHeader writes "COMPANY NAME" and "123 Business Street, City, State - 123456" (code-confirmed; not seen rendered because of DEF-PAY-05).
- DEF-PAY-16: GET /payroll/runs/{id}/summary and /register are 404; no payroll register endpoint. Custom report builder with payroll source NOT TESTED.
- DEF-PAY-17: project time entries: edit/delete rejected after SUBMITTED/APPROVED (409), self-approve 403; but new entries are accepted in a period that already has approved entries, and the only date rule is "older than 3 months". No lock model (see 14-keka-parity.md).
- DEF-PAY-12: A requesting B's payslip id gets 404 while unreleased and 403 after release; release-status endpoint also reveals NOT_RELEASED vs NO_PAYSLIP for own months only. Low.

## Possible compliance-rule issues needing a compliance reviewer (not counted as defects; external knowledge, unverified by me)
- Karnataka PT threshold in code: gross >= 15,000 -> 200 (StatutoryDeductionService.java PT_KA_THRESHOLD). A 2025 amendment reportedly raised the exemption to 25,000. Test E (gross 20,340.92) was charged 200.
- Tamil Nadu PT in code: flat 208/month for everyone (F, gross 12,000, charged 208). TN levies half-yearly slabs by half-year income; a 12,000/month earner would fall in a lower slab.
- ESI wages: code includes overtime in the ESI base (E: 152.56 vs 150.00 on 20,000 basic wages); ESI Act excludes overtime from wages.
- Employer PF: EPS/EDLI/admin split not modelled.
