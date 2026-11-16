# Test data created by agent `pay` (NUAURA_TEST_ prefix, local dev DB only)

Created 2026-11-15 via API as admin@nulogic.io (HR_ADMIN). Passwords: [REDACTED] (synthetic, local only). No bank/email/SMS sends.
Bank IFSC deliberately omitted (DEF-PAY-01: encrypted IFSC overflows varchar(50)).

| Key | Employee code | employee id | Joining | State | Gender | Purpose |
|---|---|---|---|---|---|---|
| A | NUAURA_TEST_PAY_A | 6bb90b00-b046-43ac-bf75-0149be1839e2 | 2026-01-01 | Karnataka | M | standard full month, employee-side visibility tests |
| B | NUAURA_TEST_PAY_B | ab57ed9e-af01-469d-a72c-bd4f0705502c | 2026-01-01 | Karnataka | F | LOP leave + expense reimbursement |
| C | NUAURA_TEST_PAY_C | 9d8e4546-6613-4b00-a51a-5f94c05acb57 | 2026-04-16 | Karnataka | M | mid-month joiner |
| D | NUAURA_TEST_PAY_D | 3717e7b7-9910-4d7d-8936-6a9cb2e1d151 | 2026-01-01 | Maharashtra | F | high earner, PT/TDS |
| E | NUAURA_TEST_PAY_E | 03e45547-a1b2-4d03-83bb-67ec71126ee6 | 2026-01-01 | Karnataka | M | ESI-eligible (gross 20000) |
| F | NUAURA_TEST_PAY_F | 4f428f8a-91f3-4ed4-96a7-94c794b32a74 | 2026-01-01 | Tamil Nadu | M | null components, negative net edge |

Users: nuaura_test_pay_{a..f}@nulogic.io (role EMPLOYEE, created with employee).
Further rows (salary structures, payroll runs for periods 2026-04.., payslips, adjustments, loan, timesheets) are appended below as created.

## Setup log
- 2026-11-15 16:21 salary structures A-F created via finance@nulogic.io (PAYROLL_PROCESS). Ids in scratchpad; effective 2026-01-01 (C: 2026-04-16). Extra inactive structure for F (basic 0, 2025-01-01..02) created by the zero-basic validation probe.
- B.managerId set to Sumit's employee (48000000-e001-0000-0000-000000000001) so leave approval can resolve an approver.
- Role EMPLOYEE linked to the 6 test users by SQL (superuser, setup only) because PUT /api/v1/users/{id}/roles returns 500 under RLS (DEF-PAY-02) and createEmployee assigns no role (DEF-PAY-03).
- 2026-11-15 payroll_adjustments rows inserted by SQL (superuser, setup only; source_module NUAURA_TEST): A expense 1500.00; E overtime 3.00 effective-hours; D LOP 0.5 day. No API/UI exists to create adjustments manually (only event listeners), see NU-KEKA-003.
- Payroll run 2026-04 created via API as finance@ (id a3af27a8-f614-4879-b9b8-987fe96bbbdb, payrollDate 2026-04-30).
- 2026-11-15 later: leave requests B (LOP) 13-14 Apr and 20 Apr (approved by sumit); expense claim EXP-202611-0001 (A, INR 750, approved); loan LN-1794771772838 (A, 120000, ACTIVE); A set manager=Sumit, B set manager=Sumit; E set RESIGNED; A changed password via API (new value [REDACTED]); A added to project PROJ-001 as DEVELOPER (member id dd9eac31-...); time entries 2026-10-08 (APPROVED), 2026-10-09 (DRAFT).
- Payroll runs: 2026-04 a3af27a8-... (LOCKED), 2026-05 bd860d83-... (PROCESSED), 2026-06 291e3fc9-... (PROCESSED). Payslips A-F (April), A,C,F (May), A (June).
