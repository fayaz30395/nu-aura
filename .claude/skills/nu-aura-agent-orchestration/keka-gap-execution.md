# NU-AURA — Production Hardening Gap Analysis & Execution Prompts

> **Purpose:** Consolidated audit findings from 3 deep analyses (Frontend UX, Backend Depth, Cross-Module Integration). These are REAL gaps verified against the codebase — not surface-level feature comparisons.
> **Generated:** 2026-04-01 | **Flyway next:** V101 | **TypeScript errors:** 0

---

## GAP SUMMARY

### Status Legend
- **BROKEN** = Integration path exists in code but doesn't work end-to-end
- **MISSING** = Expected behavior/feature not implemented at all
- **SHALLOW** = Feature exists but lacks production-quality depth

---

## PHASE 1: CROSS-MODULE INTEGRATION FIXES (P0 — Broken Workflows)

These are workflows where data is supposed to flow between modules but the event/integration wiring is missing. Users will encounter dead ends.

### FIX-001: Overtime → Payroll Integration (BROKEN)
**Problem:** Overtime hours are recorded in attendance module but no event fires to payroll. Approved overtime doesn't appear as an earning component in payslips.
**Root cause:** Missing `DomainEventPublisher.publish()` call in OvertimeService on approval completion. No `OvertimeApprovedEvent`. No `PayrollOvertimeListener`.
**Fix scope:**
- Backend: Create `OvertimeApprovedEvent`, publish via `DomainEventPublisher` in `OvertimeService.approve()`
- Backend: Create `PayrollOvertimeListener` in `com.hrms.application.payroll/` that listens for event and creates/updates overtime earning component
- Backend: Add overtime earning component type to payroll formula engine (SpEL)
- Test: Approve overtime → verify payslip includes overtime amount
**Effort:** 1 agent session
**Migration:** None (event wiring only, no schema change)

### FIX-002: Expense Reimbursement → Payroll (BROKEN)
**Problem:** Approved expense claims don't create a reimbursement earning in payroll. Employees get approval but never see reimbursement in payslip.
**Root cause:** `ExpenseApprovalCallback` completes the workflow but doesn't publish to payroll. No `ExpenseReimbursementEarning` component.
**Fix scope:**
- Backend: Publish `ExpenseApprovedEvent` from `ExpenseApprovalCallback`
- Backend: Create `PayrollExpenseListener` to insert reimbursement line into next payroll cycle
- Backend: Handle partial reimbursement (policy limits) vs full amount
- Test: Submit expense → approve → run payroll → verify reimbursement line in payslip
**Effort:** 1 agent session
**Migration:** None

### FIX-003: Performance Review → Compensation Revision (BROKEN)
**Problem:** When a performance review cycle closes, there's no automated trigger to create salary revision recommendations. The compensation module exists but isn't connected to performance outcomes.
**Root cause:** `PerformanceReviewService.closeCycle()` doesn't publish a domain event. No `CompensationRevisionTriggerListener`.
**Fix scope:**
- Backend: Create `ReviewCycleClosedEvent` with cycle ID and aggregated ratings
- Backend: Create `CompensationRevisionService` that generates revision recommendations based on rating-to-increment mapping
- Backend: Rating-to-increment config table (already has `compensation_settings` — extend it)
- Frontend: "Generate Revisions from Reviews" button on compensation page
- Test: Close review cycle → verify revision records created with correct increment %
**Effort:** 2 agent sessions
**Migration:** V101__compensation_revision_config.sql (rating bands → increment % mapping table)

### FIX-004: Training Completion → Performance (BROKEN)
**Problem:** When an employee completes a training course, it doesn't reflect in their performance profile or skill matrix. Training and performance are siloed.
**Root cause:** `TrainingService.markComplete()` updates training record but doesn't publish event. No skill matrix update.
**Fix scope:**
- Backend: Publish `TrainingCompletedEvent` from `TrainingService`
- Backend: Create `PerformanceTrainingListener` that updates employee skill assessments
- Backend: Link training courses to competency/skill IDs
- Frontend: Show "Completed Training" section in performance review form
- Test: Complete training → verify skill score updated → verify visible in next review
**Effort:** 1 agent session
**Migration:** V102__training_skill_mapping.sql (link training_courses to skills)

### FIX-005: Leave Without Pay → Payroll LOP Deduction (BROKEN)
**Problem:** Leave marked as "Loss of Pay" (LOP) in leave module doesn't create a deduction in payroll. Payroll runs without accounting for unpaid leave days.
**Root cause:** `LeaveApprovalCallback` doesn't distinguish LOP from paid leave for payroll impact. No event to payroll for LOP days.
**Fix scope:**
- Backend: In `LeaveApprovalCallback`, check if leave type is LOP → publish `LopLeaveApprovedEvent`
- Backend: Create `PayrollLopListener` that inserts LOP deduction (daily_salary × lop_days) into payroll
- Test: Apply LOP leave → approve → run payroll → verify deduction
**Effort:** 1 agent session
**Migration:** None

### FIX-006: Approval Notifications Missing (BROKEN)
**Problem:** Several approval workflows don't send notifications. Expense approvals, asset request approvals, and overtime approvals complete silently — approvers aren't notified, requesters aren't notified of outcomes.
**Root cause:** `ApprovalCallbackHandler` implementations for expense, asset, overtime don't call `NotificationService`. Only leave and recruitment callbacks have notification wiring.
**Fix scope:**
- Backend: Add `notificationService.send()` calls to `ExpenseApprovalCallback`, `AssetApprovalCallback`, `OvertimeApprovalCallback`
- Backend: Create notification templates for each: "Your {type} request was {approved/rejected}"
- Backend: Notify approvers when new requests arrive: "New {type} request from {employee} pending your approval"
- Test: Submit each type → verify notifications sent to approver → approve → verify requester notified
**Effort:** 1 agent session
**Migration:** None (notification templates can be seeded via data migration if needed)

---

## PHASE 2: BACKEND HARDENING (P0/P1 — Production Quality)

### FIX-007: DTO Validation Gap — 40% of Endpoints Missing @Valid (P0)
**Problem:** ~40% of POST/PUT controller methods accept request DTOs without `@Valid` annotation. Invalid data can reach the service layer and corrupt state.
**Fix scope:**
- Backend: Audit ALL controllers (143). Add `@Valid` to every `@RequestBody` parameter
- Backend: Add proper validation annotations to DTOs (`@NotNull`, `@Size`, `@Email`, `@Pattern`, etc.)
- Backend: Verify `MethodArgumentNotValidException` handler exists in `@ControllerAdvice`
- Priority DTOs: PayrollRunRequest, LeaveRequest, ExpenseClaimRequest, PerformanceReviewSubmission
**Effort:** 2 agent sessions (one for audit + critical DTOs, one for remaining)
**Migration:** None

### FIX-008: Pagination Gap — 34% of List Endpoints Return List Not Page (P1)
**Problem:** ~34% of list endpoints return `List<T>` instead of `Page<T>`. On tenants with thousands of records, these endpoints return unbounded result sets causing memory spikes and slow responses.
**Fix scope:**
- Backend: Convert all `List<T>` return types on list endpoints to `Page<T>` with `Pageable` parameter
- Backend: Update repository methods from `findAll()` to `findAll(Pageable)`
- Frontend: Add pagination controls to matching data tables (if not already present)
- Priority: Employee list, attendance records, leave requests, payroll runs, expense claims
**Effort:** 2 agent sessions
**Migration:** None

### FIX-009: Audit Logging Gap — 89% of Services Don't Log (P1)
**Problem:** Only ~11% of service methods publish audit log events. Sensitive operations (salary changes, role assignments, data exports, bulk operations) happen silently.
**Fix scope:**
- Backend: Identify all sensitive operations: write/update/delete on employee data, payroll, permissions, settings
- Backend: Add `auditLogService.log()` calls with: userId, actionType, resourceType, resourceId, description, ipAddress
- Backend: Create an `@Audited` annotation + aspect for declarative audit logging on service methods
- Priority: PayrollService, PermissionService, EmployeeService, CompensationService, RoleService
**Effort:** 2 agent sessions
**Migration:** None (audit_logs table already exists)

### FIX-010: Soft Delete @Where Missing on Entities (P1)
**Problem:** Entities use `is_active` for soft deletes but many JPA entities lack `@Where(clause = "is_active = true")`. Queries can return deleted records.
**Fix scope:**
- Backend: Audit all 265 entities. Add `@Where(clause = "is_active = true")` to every entity with `is_active` column
- Backend: Verify `findAll`, `findById` repository methods respect the filter
- Backend: Add explicit `is_active = true` to custom JPQL/native queries that bypass @Where
**Effort:** 1 agent session
**Migration:** None

### FIX-011: Kafka Event Publishing Absent (P1)
**Problem:** 5 Kafka topics defined but most domain events use only `DomainEventPublisher` (Spring `@TransactionalEventListener`). Kafka producers are wired but rarely called. External consumers and async processing don't receive events.
**Fix scope:**
- Backend: For each domain event type, add Kafka publish alongside Spring event
- Backend: Priority events to wire: EmployeeCreated, LeaveApproved, PayrollCompleted, ReviewCycleClosed, AttendanceMarked
- Backend: Verify DLT (Dead Letter Topic) handlers work for failed events
- Backend: Add event schema versioning header for future compatibility
**Effort:** 1 agent session
**Migration:** None

---

## PHASE 3: FRONTEND UX DEPTH (P0/P1 — Table & Form Patterns)

### FIX-012: Column Visibility Toggle on All Data Tables (P0)
**Problem:** Data tables across the platform show all columns with no way to hide/show columns. On smaller screens, tables are unreadable. Keka lets users customize visible columns per table.
**Fix scope:**
- Frontend: Create `ColumnVisibilityToggle` component (Mantine Popover + Checkbox list)
- Frontend: Store column preferences in localStorage per table per user
- Frontend: Apply to all major data tables: employees, attendance, leave, payroll, expenses, assets, recruitment
- Frontend: Default visible columns per table (hide less-used columns initially)
**Effort:** 1 agent session
**Migration:** None

### FIX-013: Bulk Action Toolbar on All Data Tables (P0)
**Problem:** No way to perform bulk actions (approve, reject, delete, export, assign) on multiple rows. Users must act on records one by one.
**Fix scope:**
- Frontend: Create `BulkActionToolbar` component that appears when rows are selected
- Frontend: Row selection with checkbox column + "Select All" header checkbox
- Frontend: Module-specific bulk actions:
  - Leave: Bulk approve/reject
  - Attendance: Bulk regularize
  - Payroll: Bulk approve payslips
  - Employees: Bulk status change, bulk department transfer
  - Expenses: Bulk approve/reject
- Backend: Add batch endpoints for each: `POST /api/v1/{module}/batch-{action}` with `@RequiresPermission`
**Effort:** 2 agent sessions (1 frontend component + wiring, 1 backend batch endpoints)
**Migration:** None

### FIX-014: CSV/PDF Export from All Data Tables (P0)
**Problem:** No export functionality on data tables. Users can't extract data for external reporting, compliance, or audits.
**Fix scope:**
- Frontend: Create `ExportMenu` component (Mantine Menu: "Export CSV" | "Export PDF" | "Export Excel")
- Frontend: CSV export using PapaParse (already in package.json)
- Frontend: Excel export using ExcelJS (already in package.json)
- Backend: PDF export endpoints using OpenPDF (already in dependencies) — `GET /api/v1/{module}/export/pdf`
- Frontend: Apply to all data tables
- Backend: Add `@RequiresPermission("module.export")` on export endpoints
**Effort:** 2 agent sessions
**Migration:** None (but add export permissions to permission seed)

### FIX-015: Unsaved Changes Warning on Forms (P1)
**Problem:** Navigating away from a form with unsaved changes silently discards input. No "You have unsaved changes" confirmation dialog.
**Fix scope:**
- Frontend: Create `useUnsavedChangesWarning` hook using React Hook Form's `formState.isDirty`
- Frontend: Browser `beforeunload` event for tab close/refresh
- Frontend: Next.js router event interception for in-app navigation
- Frontend: Mantine Modal confirmation dialog: "You have unsaved changes. Discard?"
- Frontend: Apply to all form pages (employee create/edit, leave apply, expense submit, etc.)
**Effort:** 1 agent session
**Migration:** None

### FIX-016: WCAG 2.1 AA Accessibility Baseline (P1)
**Problem:** No systematic accessibility implementation. Missing aria-labels, keyboard navigation gaps, color contrast issues, no skip-to-content link.
**Fix scope:**
- Frontend: Add `aria-label` and `aria-describedby` to all interactive elements
- Frontend: Keyboard navigation: all actions reachable via Tab/Enter/Escape
- Frontend: Focus management: auto-focus first field in modals, return focus on close
- Frontend: Skip-to-content link in AppLayout
- Frontend: Color contrast audit on Sky palette (ensure 4.5:1 ratio for text)
- Frontend: Screen reader testing with VoiceOver/NVDA on key flows
**Effort:** 2 agent sessions
**Migration:** None

---

## PHASE 4: FRONTEND UX ENHANCEMENTS (P1 — Polish)

### FIX-017: Advanced Table Filtering & Saved Filters (P1)
**Problem:** Tables have basic single-field filters. No multi-field filtering, no saved filter presets, no date range pickers.
**Fix scope:**
- Frontend: Create `AdvancedFilterPanel` component with multi-field filter builder
- Frontend: Saved filter presets stored in localStorage
- Frontend: Date range picker filter (Mantine DatePicker) on all date columns
- Frontend: Apply to employee list, attendance, leave history, payroll, expenses
**Effort:** 1 agent session

### FIX-018: Inline Editing on Data Tables (P1)
**Problem:** Every edit requires opening a full modal or navigating to a detail page. Simple field updates are cumbersome.
**Fix scope:**
- Frontend: Create `EditableCell` component for inline editing of simple fields
- Frontend: Click-to-edit on text, number, select, and date cells
- Frontend: Auto-save on blur with optimistic update via React Query mutation
- Frontend: Apply to: attendance remarks, leave status notes, employee contact fields
**Effort:** 1 agent session

### FIX-019: Dashboard Widgets — Customizable Layout (P1)
**Problem:** Dashboard pages have fixed layouts. Users can't rearrange, hide, or resize widgets.
**Fix scope:**
- Frontend: Implement drag-and-drop dashboard grid using `@hello-pangea/dnd` (already in dependencies)
- Frontend: Widget show/hide toggle
- Frontend: Store layout in localStorage per user per dashboard
- Frontend: Apply to: HR Dashboard, My Dashboard, Recruitment Dashboard, Analytics Dashboard
**Effort:** 1 agent session

### FIX-020: Real-Time Notifications Bell with Unread Count (P1)
**Problem:** Notification bell exists but doesn't show unread count badge or real-time updates. Users must refresh to see new notifications.
**Fix scope:**
- Frontend: Add unread count badge to notification bell icon in header
- Frontend: Connect to existing STOMP/SockJS WebSocket for real-time push
- Frontend: Mark-as-read on click, mark-all-read action
- Frontend: Notification grouping by type (leave, expense, approval, system)
**Effort:** 1 agent session

### FIX-021: Empty State Illustrations (P1)
**Problem:** Empty tables show blank space or generic "No data" text. No helpful empty states with illustrations or call-to-action buttons.
**Fix scope:**
- Frontend: Create `EmptyState` component with icon, title, description, and optional CTA button
- Frontend: Module-specific empty states: "No employees yet — Add your first employee", "No leave requests — Your team is fully present!", etc.
- Frontend: Apply to all data tables and list views
**Effort:** 1 agent session

---

## EXECUTION ORDER (Recommended)

```
Sprint 1 (CRITICAL — Broken Integrations):
  FIX-001 Overtime→Payroll + FIX-002 Expense→Payroll + FIX-005 LOP→Payroll
  (all payroll integration, can run as 1 agent or 3 parallel)

Sprint 2 (CRITICAL — Broken Integrations):
  FIX-003 Performance→Compensation + FIX-004 Training→Performance + FIX-006 Notifications
  (cross-module event wiring)

Sprint 3 (Backend Hardening — High Impact):
  FIX-007 @Valid on DTOs + FIX-010 @Where soft delete
  (both are annotation sweeps across codebase, parallelizable)

Sprint 4 (Backend Hardening — Depth):
  FIX-008 Pagination + FIX-009 Audit Logging + FIX-011 Kafka wiring
  (3 independent backend improvements)

Sprint 5 (Frontend P0 — Table Infrastructure):
  FIX-012 Column Visibility + FIX-013 Bulk Actions + FIX-014 Export
  (shared table infrastructure, build in order)

Sprint 6 (Frontend P1 — Forms & Accessibility):
  FIX-015 Unsaved Changes + FIX-016 Accessibility
  (cross-cutting frontend improvements)

Sprint 7 (Frontend P1 — Polish):
  FIX-017 Advanced Filters + FIX-018 Inline Editing + FIX-019 Dashboard Widgets + FIX-020 Notifications + FIX-021 Empty States
  (independent UX improvements, all parallelizable)
```

---

## FLYWAY MIGRATION TRACKER

```
V101: compensation_revision_config (rating band → increment % mapping)
V102: training_skill_mapping (link courses to competency/skill IDs)
```

Only 2 migrations needed. Most fixes are code-level (annotations, event wiring, components).

---

## HOW TO EXECUTE

1. **Open Claude Code** in `~/IdeaProjects/nulogic/nu-aura`
2. **Copy the sprint prompt** from autonomous-keka-sprint.md (or use sprint-specific prompts below)
3. **Paste into Claude Code** — it reads CLAUDE.md automatically
4. **Claude spawns agents** based on the prompt
5. **After completion:** run `cd frontend && npx tsc --noEmit` to verify 0 TypeScript errors
6. **Commit per sprint:** `git add . && git commit -m "fix(platform): Sprint N — description"`

Start with **Sprint 1 (Payroll Integration Fixes)** — these are broken production workflows where users see dead ends.
