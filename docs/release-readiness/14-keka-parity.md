# Keka parity inventory (agent `pay`) - 2026-11-15

Method: feature list taken from docs/obsidian/02-Modules/Keka-Gap-Analysis.md and Keka-Parity-Roadmap.md (2026-10-10, agent claims, partly "med" confidence) and the brief; each item re-checked against current code and, where marked, executed on the local stack. Prior docs are leads, not proof. Keka capabilities are vendor claims from those notes; I did not access Keka.
Status vocabulary: PASS = executed with evidence and behaves; PARTIAL = executed, works with a defect or gap; FAIL = executed, does not work; NOT IMPLEMENTED = no code found (grep + endpoint probe); NOT VERIFIED = code or route exists, behaviour not executed by me (not counted as parity).

## Parity = 4 of 30 verified PASS (13%). Partial 4, fail 4, not implemented 9, not verified 9.
N = 30 items, listed explicitly below. No claim is made for NOT VERIFIED rows.

| # | Feature | Status | Evidence |
|---|---|---|---|
| 1 | Salary structure / CTC components (flat structure, validation) | PASS | matrix NU-PAY-010/011; formula-driven PayrollComponent engine not executed |
| 2 | Payroll run processing and gross/net calculation | PARTIAL | arithmetic exact (NU-PAY-012) but no proration (DEF-PAY-10), LOP/expense lost (DEF-PAY-04), negative net (DEF-PAY-11) |
| 3 | Payslip release gating | PASS | NU-PAY-030/031, NU-KEKA-001 |
| 4 | Payslip PDF download | FAIL | 0 bytes (DEF-PAY-05) |
| 5 | PF (employee/employer) | PARTIAL | formula correct for cap model, only via manual apply (DEF-PAY-09); EPS/EDLI split absent |
| 6 | ESI | PARTIAL | math correct; not in run (DEF-PAY-09); overtime in base |
| 7 | Professional tax | PARTIAL | KA/MH/TN only, others 0; KA/TN rules need compliance review |
| 8 | TDS / income tax | FAIL | FY2024-25 slabs, no std deduction/declarations (DEF-PAY-08) |
| 9 | Statutory returns: PF ECR, ESI, PT challan, 24Q, Form 16, LWF | FAIL | 12/12 HTTP 400 (DEF-PAY-06) |
| 10 | Payroll lock (APPROVED -> LOCKED, immutability) | PASS | NU-PAY-035, NU-PAY-050 |
| 11 | Arrears / supplementary pay | NOT IMPLEMENTED | NU-KEKA-003 |
| 12 | Loan EMI recovered through payroll | NOT IMPLEMENTED | NU-KEKA-004 (loan lifecycle and EMI math itself works) |
| 13 | Bank advice / payment file | NOT IMPLEMENTED | NU-KEKA-002 |
| 14 | Expense reimbursements paid through payroll | FAIL | adjustment lost (DEF-PAY-04); expense claim workflow itself approved fine |
| 15 | Overtime pay through payroll | NOT VERIFIED | same event path as #14; arithmetic only tested with SQL row |
| 16 | Full and final settlement | NOT VERIFIED | FnFController (/api/v1/exit/{id}/fnf), /exit/settlements 200; not executed |
| 17 | Salary revision / compensation cycles | NOT VERIFIED | /api/v1/compensation/* returned 403 for HR_ADMIN; revision apply not run |
| 18 | Leave encashment | NOT VERIFIED | encashable leave types seeded (EL); LeaveEncashment DTOs exist; not run |
| 19 | Tax declarations / proofs | NOT VERIFIED | /api/v1/tax-declarations 200; not run |
| 20 | Salary hold / withheld salary | NOT IMPLEMENTED | grep "salaryHold" = 0 files |
| 21 | Payroll register / run summary report | NOT IMPLEMENTED | 404 on /runs/{id}/summary,/register (DEF-PAY-16); custom report builder not tested |
| 22 | Accounting export (Tally / Zoho Books) | NOT IMPLEMENTED | no payroll-export code; only webhook references |
| 23 | Flexi / benefits through payroll | NOT IMPLEMENTED | grep flexi benefit = 0; /benefits-enhanced base 404 |
| 24 | Attendance regularisation | NOT VERIFIED | /attendance/pending-regularizations 200; not run |
| 25 | Shifts and shift swaps | NOT VERIFIED | /shifts, /shift-swaps 200; not run |
| 26 | Biometric devices | NOT VERIFIED | /biometric/devices 200; not run |
| 27 | Helpdesk with SLA | NOT VERIFIED | /helpdesk/tickets, /helpdesk/sla 200; not run |
| 28 | Timesheet entry lock after submit/approve | PASS | NU-KEKA-005 (API only; UI not tested) |
| 29 | Timesheet period lock + reminders | NOT IMPLEMENTED | no lock model (DEF-PAY-17); reminder scheduler not found in prior audit and not re-verified |
| 30 | Multi-entity / legal-entity payroll | NOT IMPLEMENTED | per Keka-Gap-Analysis P2; I did not re-verify |

Counts: PASS #1, #3, #10, #28 (4); PARTIAL #2, #5, #6, #7 (4); FAIL #4, #8, #9, #14 (4); NOT IMPLEMENTED #11, #12, #13, #20, #21, #22, #23, #29, #30 (9); NOT VERIFIED #15-#19, #24-#27 (9). Total 30.

## Gaps that matter for replacing Keka payroll (ordered)
1. DEF-PAY-04, 05, 06 (Critical/High, small fixes) then 08, 09, 10 (rules and proration).
2. P0 items still absent: arrears, loan EMI in payroll, bank advice, timesheet period lock (matches Keka-Gap-Analysis P0-2..P0-5). P0-1 (release gating) is closed and verified.
3. Not-yet-verified HR operations (#15-#19, #24-#27) need their own execution pass before any parity claim.

## Stale-claim check against prior docs
- Keka-Gap-Analysis lists "PF/ESI/PT/LWF/TDS, Form 16 and 24Q" and "payroll lock and bulk processing" as present or low-risk. Executed result: PF/ESI/PT/TDS present but not wired into the run and TDS dated; Form 16/24Q/ECR generation fails; lock and bulk processing work.
- Gap doc "P0-1 pushed 2e4f630c": confirmed working at runtime, except the PDF returns empty bytes.
