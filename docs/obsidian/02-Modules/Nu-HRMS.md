---
title: NU-HRMS
tags: [module, nu-hrms]
---

# NU-HRMS

> Core HR sub-app of [[System-Overview|NU-AURA]]. The default landing experience and the
> record-of-truth for the employee lifecycle. See [[Nu-Hire]], [[Nu-Grow]], [[Nu-Fluence]]
> for the sibling apps and [[Shared-Platform]] for the cross-cutting services every module
> leans on. Grounding doc: `docs/apps/nu-hrms.md`.

## Purpose

NU-HRMS owns day-to-day HR: employee master data, the self-service portal, attendance &
time tracking, shifts, leave, payroll/compensation/benefits, expenses, loans, assets,
Indian statutory/tax handling, letters, helpdesk, and the organization structure. It is the
largest of the four bundle apps and the one all employees touch daily.

The sub-app boundary is **declared**, not inferred, in `frontend/lib/config/apps.ts`
(`PLATFORM_APPS.HRMS`): flat routes (`/leave`, `/payroll`, ...) are mapped to HRMS at
runtime by `routePrefixes`, gated by `permissionPrefixes`. Entry route is `/me/dashboard`.

## Business Capability

- **Employee lifecycle of record** — master data, directory, documents, skills, change
  requests, bulk import; the destination of the [[Nu-Hire]] hire-to-onboard handoff.
- **Time & attendance** — check-in/out, regularization, comp-off, biometric sync, holidays,
  shifts/rosters/swaps, timesheets, overtime.
- **Leave management** — apply / approve / encash / carry-forward against tenant leave types.
- **Compensation & payroll** — payroll runs, payslips, salary structures, bonuses, benefits.
- **Expense & spend** — claims, mileage, OCR receipts, advances, loans, asset assignment.
- **Statutory compliance** — TDS, PF, ESI, PT, LWF, tax declarations, statutory filings.
- **Servicing** — letters, HR helpdesk/ticketing, announcements, calendar, reports/analytics.

## Entry Points

### Key frontend routes (`frontend/app/...`)

| Area | Routes |
|------|--------|
| Self-service | `/me/dashboard`, `/me/profile`, `/me/leaves`, `/me/attendance`, `/me/payslips`, `/me/documents`, `/me/assets`, `/me/skills` |
| Attendance / shifts | `/attendance`, `/attendance/regularization`, `/attendance/comp-off`, `/attendance/shift-swap`, `/shifts`, `/time-tracking`, `/timesheets`, `/overtime` |
| Leave | `/leave`, `/leave/apply`, `/leave/approvals`, `/leave/encashment`, `/leave/admin/carry-forward` |
| Employees / org | `/employees`, `/employees/[id]`, `/employees/import`, `/departments` |
| Payroll / comp | `/payroll`, `/payroll/runs/[id]`, `/payroll/salary-structures`, `/compensation`, `/benefits` |
| Expense / loans / assets | `/expenses`, `/expenses/mileage`, `/loans`, `/assets` |
| Statutory / tax | `/statutory`, `/statutory/filings`, `/tax/declarations`, `/lwf` |
| Servicing | `/letters`, `/helpdesk/tickets/[id]`, `/announcements`, `/reports`, `/analytics` |

Frontend wiring is React Query hooks + `PermissionGate`; see [[Pages]], [[Routes]],
[[Components]]. Example: `app/leave/apply/page.tsx` uses RHF+Zod (`leaveFormSchema`),
`useActiveLeaveTypes`, `useEmployeeBalancesForYear`, `useCreateLeaveRequest`.

### Backend controllers / packages (`backend/src/main/java/com/nulogic/api/...`)

| Domain | Controllers |
|--------|-------------|
| `attendance` | `AttendanceController`, `MobileAttendanceController`, `CompOffController`, `BiometricDeviceController`, `HolidayController`, `OfficeLocationController` |
| `timetracking` / `shift` / `overtime` | `TimeTrackingController`, `ShiftManagementController`, `ShiftSwapController`, `OverTimeManagementController` |
| `leave` | `LeaveRequestController`, `LeaveBalanceController`, `LeaveTypeController` |
| `payroll` | `PayrollController`, `GlobalPayrollController`, `BonusController`, `PayrollStatutoryController`, `StatutoryFilingController` |
| `compensation` / `benefits` | `CompensationController`, `BenefitManagementController`, `BenefitEnhancedController` |
| `expense` | `ExpenseClaimController`, `ExpenseItemController`, `ExpensePolicyController`, `MileageController`, `OcrReceiptController`, `ExpenseAdvanceController` |
| `loan` / `asset` | `LoanController`, `AssetController` |
| `employee` / `selfservice` | `EmployeeController`, `EmployeeDirectoryController`, `EmployeeImportController`, `EmployeeDocumentController`, `EmployeeSkillController`, `TalentProfileController`, `SelfServiceController` |
| `organization` | `OrganizationController`, `DepartmentController`, `DesignationController` |
| `statutory` / `tax` | `TDSController`, `ProvidentFundController`, `ESIController`, `ProfessionalTaxController`, `LWFController`, `TaxDeclarationController` |
| `letter` / `helpdesk` | `LetterController`, `HelpDeskController`, `HelpDeskSLAController` |

See [[APIs]] for the full endpoint catalog and [[Services]] for the application layer.

## Dependencies

NU-HRMS consumes [[Shared-Platform]] services end to end:

- **Auth / RBAC** — JWT httpOnly cookie + DB-backed roles/permissions ([[Roles]],
  [[Permissions]], [[RBAC-Matrix]]). Allowed roles include `SUPER_ADMIN`, `HR_ADMIN`,
  `HR_EXECUTIVE`, `MANAGER`, `EMPLOYEE` (`frontend/lib/constants/roles.ts`).
- **Multi-tenancy / RLS** — `TenantFilter` → `TenantContext` ThreadLocal → PostgreSQL RLS
  via `TenantRlsTransactionManager` (`SET LOCAL app.current_tenant_id`). See [[Middleware]],
  [[Schema]], [[Security-Audit]].
- **Redis cache** — `leaveTypes`, `departments`, `designations`, `employees`,
  `leaveBalances` with tiered TTLs (`CacheConfig`).
- **Kafka** — employee-lifecycle, approval, payroll, notification domain events.
- **Notifications** — leave/expense/payroll approvals route through the notification service.
- **File storage** — Google Drive for documents, receipts, generated letters.

## Technical Flow — leave apply → approve → balance update

```mermaid
sequenceDiagram
    actor Emp as Employee
    participant FE as /leave/apply
    participant LR as LeaveRequestController
    participant LB as LeaveBalanceController
    participant Mgr as Manager (/leave/approvals)
    participant DB as PostgreSQL (RLS)
    FE->>LB: GET /leave-balances/employee/{id}/year/{yr}
    LB-->>FE: available balances (Redis-cached)
    Emp->>FE: submit (RHF + Zod leaveFormSchema)
    FE->>LR: POST /api/v1/leave-requests
    LR->>DB: persist PENDING (tenant-scoped)
    LR-->>FE: PENDING request
    Mgr->>LR: POST /leave-requests/{id}/approve
    LR->>LB: decrement balance + evict leaveBalances cache
    LR-->>Mgr: APPROVED (notification emitted)
```

## Ownership

Self-assessed — there are no formal `CODEOWNERS`/owner records in the repo. Treat as the
largest and most cross-cutting module; touching it ripples across [[Shared-Platform]].

## Related Links

- [[System-Overview]] · [[C4-Container]] · [[Module-Relationships]] · [[Data-Flows]] · [[System-Flows]]
- Siblings: [[Nu-Hire]] (hire-to-onboard source) · [[Nu-Grow]] (performance on the same employee) · [[Nu-Fluence]]
- Platform: [[Shared-Platform]] · [[Middleware]] · [[Roles]] · [[Permissions]] · [[RBAC-Matrix]] · [[Schema]] · [[ERD]] · [[APIs]] · [[Services]] · [[Pages]] · [[Routes]] · [[Components]] · [[Security-Audit]]
- Grounding: `docs/apps/nu-hrms.md`

## Risks

- **Tenant isolation surface is huge** — every HRMS table is RLS-scoped; a single
  `set_config(...,false)` regression on a pooled connection leaks cross-tenant (historical
  RLS-leak finding, since fixed). See [[Security-Audit]].
- **Statutory engine is India-specific** — TDS/PF/ESI/PT/LWF logic is jurisdiction-bound and
  drifts with annual budget changes; high correctness risk.
- **Payroll lock semantics** — run lifecycle (`process → approve → lock`) must be idempotent;
  partial runs are financially sensitive.
- **Cache staleness** — leave-balance and employee caches must evict on every mutation path.

## Operational Notes

- Entry route `/me/dashboard`; dev ports frontend `:3000`, backend `:8080`.
- Payslips surface to employees at `/me/payslips`; admin payroll at `/payroll/runs/[id]`.
- Bulk imports (`/employees/import`, KEKA migration) are batched — watch for N+1 saves
  (recently remediated for onboarding/budget/biometric paths).
- Letters and documents depend on the Google Drive `StorageProvider`; mock provider in dev.
