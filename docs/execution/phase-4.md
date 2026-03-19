# Phase 4: API Contract Normalization

**Date:** 2026-03-19
**Scope:** Fix frontend-to-backend API contract mismatches identified in Phase 0 baseline report (sections 2a and 2b).

---

## Key Discovery: Base URL Already Includes `/api/v1`

The Axios client (`frontend/lib/api/client.ts`) uses `baseURL = NEXT_PUBLIC_API_URL` which is set to `http://localhost:8080/api/v1` in `.env.local`. A `normalizeUrl()` method strips `/api/v1` from URLs that start with it when the baseURL already ends with `/api/v1`, preventing double-prefixing.

**Impact:** The 3 services flagged in section 2b (resource-management, tax, timesheet) are NOT broken. Their relative paths (e.g., `/resource-management`) correctly resolve to `/api/v1/resource-management` because the base URL already includes the prefix. No fixes needed for these.

---

## Changes Made

### Task 4: Non-Existent Backend Endpoints (Section 2a)

- [x] **`frontend/lib/services/spotlight.service.ts`** -- Fixed double `/api` prefix bug. Paths changed from `/api/spotlights/*` to `/spotlights/*` (base URL already includes `/api/v1`). Added `STUB: Backend endpoint not implemented` comment at class level.
- [x] **`frontend/lib/services/spotlight.service.test.ts`** -- Updated all test assertions to match new paths (`/spotlights/*` instead of `/api/spotlights/*`).
- [x] **`frontend/lib/services/linkedin.service.ts`** -- Added `STUB: Backend endpoint not implemented` comment. Paths already correct (normalizeUrl handles the `/api/v1` prefix).
- [x] **`frontend/lib/services/task.service.ts`** -- Added `STUB: Backend endpoint not implemented` comment. Not imported by any page or hook (only referenced in comments in `projects/calendar/page.tsx`).

### Task 5: Core Module Contract Audit

#### Payroll (`PayrollController` vs `payroll.service.ts`)

- [x] **Removed `approveSalaryStructure()`** -- No `POST /payroll/salary-structures/{id}/approve` endpoint exists in backend. Removed method from service, removed `useApproveSalaryStructure` hook, removed test cases.
- [x] **Fixed `deactivateSalaryStructure()`** -- Changed HTTP method from `PATCH` to `POST` to match backend `@PostMapping("/{id}/deactivate")`. Updated test expectations.
- [x] **Fixed `getPayslipsByPayrollRun()`** -- Changed path from `/payroll/payslips/run/{id}` to `/payroll/payslips/run/{id}/paged`. The original path returns `List<Payslip>`, not `Page<Payslip>`.
- [x] **Added `getPayslipsByPayrollRunList()`** -- New method for the non-paged `GET /payroll/payslips/run/{id}` endpoint.
- [x] **Added `getPayslipByEmployeeAndPeriod()`** -- Wires to `GET /payroll/payslips/employee/{id}/period?year=&month=`.
- [x] **Added `getPayslipsByEmployeeAndYear()`** -- Wires to `GET /payroll/payslips/employee/{id}/year/{year}`.
- [x] **Added `getActiveSalaryStructure()`** -- Wires to `GET /payroll/salary-structures/employee/{id}/active`.
- [x] **Added `getActiveSalaryStructures()`** -- Wires to `GET /payroll/salary-structures/active`.
- [x] **Marked `getPayslipsByPeriod()` as STUB** -- No `GET /payroll/payslips/period` endpoint exists. Kept method (used by `usePayroll` hook) with STUB comment.
- [x] **Marked `bulkProcessPayroll()`, `getBulkProcessingStatus()`, `previewBulkProcessing()` as STUB** -- No `/payroll/bulk-process/*` endpoints exist.

#### Leave (`LeaveRequestController` / `LeaveBalanceController` / `LeaveTypeController` vs `leave.service.ts`)

- [x] **Audited -- no mismatches found.** All frontend paths match backend `@RequestMapping` values. Frontend `approveLeaveRequest` sends an extra `approverId` param that the backend ignores (extracts from `SecurityContext`), which is harmless.

#### Attendance (`AttendanceController` vs `attendance.service.ts`)

- [x] **Audited -- no mismatches found.** All paths and HTTP methods align correctly.

#### Contract (`ContractController` / `ContractTemplateController` vs `contract.service.ts`)

- [x] **Audited -- no mismatches found.** All CRUD, status transitions, signature, and template operations match.

#### Payment (`PaymentController` / `PaymentConfigController` vs `payment.service.ts`)

- [x] **Fixed `processRefund()`** -- Changed from `POST /payments/refunds` (non-existent) to `POST /payments/{paymentId}/refund?reason=...` to match backend. Kept `ProcessRefundRequest` interface for backward compatibility with hook.
- [x] **Fixed `testConnection()`** -- Changed path from `/payments/config/test` to `/payments/config/test-connection` to match backend `@PostMapping("/test-connection")`. Changed return type from `TestConnectionResponse` to `string`.
- [x] **Marked `updatePayment()` as STUB** -- No `PUT /payments/{id}` endpoint exists.
- [x] **Marked `getPaymentsByStatus()`, `getPaymentsByType()`, `getPaymentsByProvider()` as STUB** -- No filter endpoints exist.
- [x] **Marked `getRefund()`, `getRefunds()`, `getRefundsByTransaction()` as STUB** -- No refund query endpoints exist.
- [x] **Marked `getConfig()`, `getAllConfigs()`, `toggleConfigActive()` as STUB** -- Only `POST /payments/config` and `POST /payments/config/test-connection` exist in `PaymentConfigController`.
- [x] **Marked `getStats()`, `getStatsByType()` as STUB** -- No stats endpoints exist.

---

## Section 2b: Wrong Base Path -- Confirmed Non-Issue

| Frontend Service | Path Used | Resolution |
|-----------------|-----------|------------|
| `resource-management.service.ts` | `/resource-management` | Correct. Base URL adds `/api/v1`. |
| `tax.service.ts` | `/tax-declarations` | Correct. Base URL adds `/api/v1`. |
| `timesheet.service.ts` | `/psa/timesheets` | Correct. Base URL adds `/api/v1`. |

---

## Files Modified

| File | Change Type |
|------|------------|
| `frontend/lib/services/spotlight.service.ts` | Fixed path bug + added STUB comment |
| `frontend/lib/services/spotlight.service.test.ts` | Updated path assertions |
| `frontend/lib/services/linkedin.service.ts` | Added STUB comment |
| `frontend/lib/services/task.service.ts` | Added STUB comment |
| `frontend/lib/services/payroll.service.ts` | Fixed methods, added new methods, marked stubs |
| `frontend/lib/services/payroll.service.test.ts` | Removed dead test, fixed HTTP method |
| `frontend/lib/hooks/queries/usePayroll.ts` | Removed `useApproveSalaryStructure` |
| `frontend/lib/services/payment.service.ts` | Fixed paths, marked stubs |

---

## Summary of STUB Endpoints (Backend Not Yet Implemented)

These frontend service methods call backend endpoints that do not exist. They are marked with `// STUB: Backend endpoint not implemented` and will return 404 at runtime:

| Service | Stub Methods | Backend Status |
|---------|-------------|---------------|
| spotlight | All CRUD operations | No SpotlightController |
| linkedin | All CRUD operations | No LinkedInPostController |
| task | All CRUD operations | modules/pm/ not wired to Spring Boot |
| payroll | `getPayslipsByPeriod`, `bulkProcessPayroll`, `getBulkProcessingStatus`, `previewBulkProcessing` | No endpoint |
| payment | `updatePayment`, `getPaymentsByStatus/Type/Provider`, `getRefund/s`, `getRefundsByTransaction`, `getConfig`, `getAllConfigs`, `toggleConfigActive`, `getStats/ByType` | No endpoint |
