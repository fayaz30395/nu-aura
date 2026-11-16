# HRMS agent test data (NUAURA_TEST_* only, local dev DB hrms_dev)

| Created | Kind | Identifier | Notes |
|---|---|---|---|
| 2026-11-15 | employee+user | NUAURA_TEST_001 / nuaura_test_hrms1@nulogic.io (id 0fbcc5e2-8278-4a00-b5f2-38e0d1c4093a) | created by hradmin via UI; dept ENG, mgr Sumit; password [REDACTED] (synthetic) |

Other agents' rows (NUAURA_TEST_PAY_*) are not mine and are untouched. Leave requests / attendance / expense / asset rows made against
demo or NUAURA_TEST_001 employees are listed below as they are created.

## Later rows (all NUAURA_TEST_*)
- Leave requests of NUAURA_TEST_001: all CANCELLED/REJECTED (leave balance CL 7/7/0). Holiday NUAURA_TEST_Holiday: soft-deleted.
- Departments NUAURA_TEST_D1 (inactive, self-parented, cannot be deleted: DEF-HRMS-05), NUAURA_TEST_D2 (deleted).
- Expense claims: 1 APPROVED, 1 REJECTED (NUAURA_TEST). Asset NUAURA_TEST_AST1 (AVAILABLE). Contract "NUAURA_TEST Employment Contract" (DRAFT).
- Attendance rows for NUAURA_TEST_001 (2026-11-16 check-in/out; 2026-11-12 regularized; one future-dated 2030 regularization row).
- NUAURA_TEST_001 is now TERMINATED / user INACTIVE (termination test). Superuser insert of user_roles row logged in logs/config-changes.md.
