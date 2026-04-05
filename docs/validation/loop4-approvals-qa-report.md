# Loop 4: Approvals & Workflows QA Report

> QA Agent | Generated 2026-03-31
> Scope: `/approvals`, `/approvals/inbox`, `/workflows`, `/workflows/[id]`
> Backend: `com.hrms.api.workflow`, `com.hrms.application.workflow`, `com.hrms.domain.workflow`

---

## Executive Summary

The approval workflow engine is the most architecturally mature subsystem in NU-AURA. The generic
`workflow_def -> workflow_step -> approval_instance -> approval_task` pattern is correctly
implemented as data-driven, tenant-configurable, multi-step approval chains. The frontend Approval
Inbox (`/approvals/inbox`) is production-quality with module filtering, WebSocket real-time updates,
delegation, and proper RBAC gating. The Workflow Builder (`/workflows`) supports full CRUD for 21
entity types across 5 workflow types.

**However, the audit uncovered 7 defects (1 HIGH, 4 MEDIUM, 2 LOW) across security, data integrity,
and UX gaps.**

---

## 1. Test Matrix Results

### 1.1 Approval Inbox

| #  | Test Case                                        | Result   | Notes                                                                                                                                                                                                                                                                                                                                    |
|----|--------------------------------------------------|----------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1  | Approval types in inbox                          | **PASS** | 21 entity types supported: LEAVE_REQUEST, EXPENSE_CLAIM, TRAVEL_REQUEST, LOAN_REQUEST, ASSET_REQUEST, TIMESHEET, RESIGNATION, SALARY_REVISION, PROMOTION, TRANSFER, ONBOARDING, OFFBOARDING, DOCUMENT_REQUEST, POLICY_ACKNOWLEDGMENT, TRAINING_REQUEST, REIMBURSEMENT, OVERTIME, SHIFT_CHANGE, WORK_FROM_HOME, RECRUITMENT_OFFER, CUSTOM |
| 2  | Module filtering tabs                            | **PASS** | `/approvals/inbox` has 7 filter tabs: All, Leave, Expense, Asset, Travel, Recruitment, Others. Backend `findInboxForUser` native query supports `entityType` param.                                                                                                                                                                      |
| 3  | Status filtering                                 | **PASS** | Toggle between PENDING and ALL. Backend resolves `StepStatus.PENDING` or null (all).                                                                                                                                                                                                                                                     |
| 4  | Search                                           | **PASS** | Debounced 400ms, searches title, requester_name, reference_number via SQL LIKE.                                                                                                                                                                                                                                                          |
| 5  | Date range filtering                             | **PASS** | Backend supports `fromDate`/`toDate` via `@DateTimeFormat(iso = DateTimeFormat.ISO.DATE)`.                                                                                                                                                                                                                                               |
| 6  | Pagination                                       | **PASS** | Page size 20, server-side pagination via native query.                                                                                                                                                                                                                                                                                   |
| 7  | Summary counts (pending/approved/rejected today) | **PASS** | `getInboxCounts()` uses `countPendingForUser` + `countTodayActionsByUser`. Polls every 60s.                                                                                                                                                                                                                                              |
| 8  | WebSocket real-time refresh                      | **PASS** | `onApprovalTaskAssigned` listener invalidates `approvalInbox` and `approvalInboxCount` queries on new task assignment.                                                                                                                                                                                                                   |
| 9  | Detail panel (split view)                        | **PASS** | `/approvals/inbox` has list-detail layout with Module, Title, Requester, Current Step, Created, Due, Reference.                                                                                                                                                                                                                          |
| 10 | Approve with optional comment                    | **PASS** | Modal with optional textarea. Calls `POST /api/v1/workflow/executions/{id}/approve`.                                                                                                                                                                                                                                                     |
| 11 | Reject with required comment                     | **PASS** | Modal requires comment (button disabled when empty). Calls `POST /api/v1/workflow/executions/{id}/reject`.                                                                                                                                                                                                                               |
| 12 | Return for modification                          | **PASS** | Backend supports `RETURN_FOR_MODIFICATION` action. Frontend does NOT expose this action. See DEF-44.                                                                                                                                                                                                                                     |

### 1.2 Approve/Reject Actions

| #  | Test Case                      | Result   | Notes                                                                                                                             |
|----|--------------------------------|----------|-----------------------------------------------------------------------------------------------------------------------------------|
| 13 | Approve endpoint               | **PASS** | `POST /api/v1/workflow/executions/{id}/approve` with `@RequiresPermission(WORKFLOW_EXECUTE)`. Wraps `processApprovalAction`.      |
| 14 | Reject endpoint                | **PASS** | `POST /api/v1/workflow/executions/{id}/reject` with same permission.                                                              |
| 15 | Action on completed workflow   | **PASS** | `execution.isCompleted()` check throws `BusinessException("This approval has already been processed")`. Idempotent.               |
| 16 | Authorization check on step    | **PASS** | `currentStep.canBeActedUponBy(currentUser)` verifies `assignedToUserId == currentUser` OR `alternativeApprovers` contains userId. |
| 17 | Advance to next step           | **PASS** | `advanceToNextStep` finds next step by `stepOrder`, creates `StepExecution`, publishes `ApprovalTaskAssignedEvent`.               |
| 18 | Auto-approve on empty workflow | **PASS** | `createFirstStepExecution` auto-approves if `workflow.getSteps().isEmpty()`.                                                      |
| 19 | Callback on terminal state     | **PASS** | `ApprovalCallbackHandler` interface dispatches `onApproved`/`onRejected` to module-specific handlers. Wrapped in try-catch.       |
| 20 | Kafka event publication        | **PASS** | `ApprovalDecisionEvent` published for APPROVE and REJECT actions. `ApprovalTaskAssignedEvent` published when step is assigned.    |

### 1.3 Delegation

| #  | Test Case                         | Result   | Notes                                                                                                                             |
|----|-----------------------------------|----------|-----------------------------------------------------------------------------------------------------------------------------------|
| 21 | Create delegation                 | **PASS** | `POST /api/v1/workflow/delegations` with `WORKFLOW_EXECUTE` permission. Zod-validated form with delegate, start/end date, reason. |
| 22 | View my delegations               | **PASS** | `GET /api/v1/workflow/delegations/my`. Shows active delegation count in inbox header.                                             |
| 23 | View delegations to me            | **PASS** | `GET /api/v1/workflow/delegations/to-me`.                                                                                         |
| 24 | Revoke delegation                 | **PASS** | `POST /api/v1/workflow/delegations/{id}/revoke`. Only delegator can revoke.                                                       |
| 25 | Delegation period validation      | **PASS** | Zod schema enforces `endDate >= startDate` with `.refine()`.                                                                      |
| 26 | Auto-delegation on leave          | **PASS** | `checkDelegation` -> `autoDelegateIfOnLeave` walks reporting chain up to 5 levels. Falls back to SUPER_ADMIN.                     |
| 27 | Entity-type scoped delegation     | **PASS** | `ApprovalDelegate.entityType` allows restricting delegation to specific workflow types.                                           |
| 28 | Amount-limited delegation         | **PASS** | `ApprovalDelegate.maxApprovalAmount` allows capping financial approvals for the delegate.                                         |
| 29 | Duplicate delegation check        | **PASS** | `findExistingDelegation` prevents duplicate active delegations for the same delegate.                                             |
| 30 | Delegation in approver resolution | **PASS** | `determineApprover` calls `checkDelegation` which checks explicit delegations first, then auto-delegation.                        |

### 1.4 Multi-Step Workflows

| #  | Test Case                                | Result   | Notes                                                                                                                                                                                |
|----|------------------------------------------|----------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 31 | Workflow definition CRUD                 | **PASS** | Create, read, update, deactivate (soft-delete). `WORKFLOW:MANAGE` permission required for write operations.                                                                          |
| 32 | Workflow types                           | **PASS** | SEQUENTIAL, PARALLEL, CONDITIONAL, HIERARCHICAL, HYBRID.                                                                                                                             |
| 33 | Approval step types                      | **PASS** | 12 approver types: SPECIFIC_USER, ROLE, REPORTING_MANAGER, SKIP_LEVEL_MANAGER, DEPARTMENT_HEAD, HR_MANAGER, FINANCE_MANAGER, CEO, CUSTOM_HIERARCHY, DYNAMIC, COMMITTEE, ANY_OF_ROLE. |
| 34 | Step SLA and escalation                  | **PASS** | Per-step `slaHours`, `escalationEnabled`, `escalateAfterHours`, `escalateToUserId`/`escalateToRoleId`.                                                                               |
| 35 | Auto-approve/reject on timeout           | **PASS** | `autoApproveOnTimeout`/`autoRejectOnTimeout` flags on `ApprovalStep`.                                                                                                                |
| 36 | Workflow versioning on active executions | **PASS** | `updateWorkflowDefinition` creates new version if `countByStatus(PENDING) > 0`. See DEF-45 for scope issue.                                                                          |
| 37 | Default workflow per entity type         | **PASS** | `isDefault` flag with mutual exclusion enforced in `createWorkflowDefinition`.                                                                                                       |
| 38 | Department/location scoped workflows     | **PASS** | `departmentId`, `locationId`, `applicableGrades` on `WorkflowDefinition`. `findApplicableWorkflow` checks department, amount range, then default.                                    |
| 39 | Escalation scheduler                     | **PASS** | `ApprovalEscalationJob` + `WorkflowEscalationScheduler` handle stale steps. `ApprovalEscalationService` resolves escalation targets via 4 strategies.                                |

### 1.5 RBAC

| #  | Test Case                                      | Result   | Notes                                                                                                                                           |
|----|------------------------------------------------|----------|-------------------------------------------------------------------------------------------------------------------------------------------------|
| 40 | Backend workflow permissions                   | **PASS** | `WORKFLOW:VIEW` on read endpoints, `WORKFLOW:MANAGE` on definition CRUD, `WORKFLOW_EXECUTE` on action endpoints. All via `@RequiresPermission`. |
| 41 | Frontend `/approvals` RBAC                     | **FAIL** | DEF-42. No `PermissionGate` or `usePermissions` check. See defect detail.                                                                       |
| 42 | Frontend `/approvals/inbox` RBAC               | **PASS** | Checks `WORKFLOW_VIEW` or `WORKFLOW_EXECUTE` via `usePermissions`. Shows access-denied if missing.                                              |
| 43 | Frontend `/workflows` RBAC                     | **PASS** | Checks `WORKFLOW_VIEW` or `WORKFLOW_MANAGE` via `usePermissions`. Shows access-denied if missing.                                               |
| 44 | Frontend `/workflows/[id]` RBAC                | **PASS** | Checks `WORKFLOW_VIEW`/`WORKFLOW_MANAGE` via `usePermissions`. Edit mode gated by `WORKFLOW_MANAGE`.                                            |
| 45 | Data scoping (manager sees only own approvals) | **PASS** | Inbox query filters by `assigned_to_user_id = :userId`. A manager only sees steps assigned to them, not all department approvals.               |
| 46 | Requester cannot approve own request           | **PASS** | `canBeActedUponBy` checks `assignedToUserId` which is the approver, not the requester. Requester is never auto-assigned as their own approver.  |
| 47 | Cancel only by requester                       | **PASS** | `cancelWorkflow` checks `execution.getRequesterId().equals(currentUser)`.                                                                       |

### 1.6 Data Scope & Tenant Isolation

| #  | Test Case                                | Result   | Notes                                                                                                   |
|----|------------------------------------------|----------|---------------------------------------------------------------------------------------------------------|
| 48 | Tenant isolation on workflow definitions | **PASS** | All repository queries use `tenantId` parameter. `findByIdAndTenantId` on reads.                        |
| 49 | Tenant isolation on executions           | **PASS** | `findByIdAndTenantId` on all reads. `findInboxForUser` native query includes `s.tenant_id = :tenantId`. |
| 50 | Tenant isolation on step executions      | **PASS** | `setTenantId(execution.getTenantId())` on step creation. Native inbox query includes tenant filter.     |
| 51 | Tenant isolation on delegations          | **PASS** | `findByDelegatorIdAndTenantId`, `findActiveDelegationsForDelegate` all tenant-scoped.                   |
| 52 | SuperAdmin cross-tenant visibility       | **PASS** | `countAllPendingCrossTenant()` exists for SuperAdmin overview. Regular endpoints are tenant-scoped.     |

### 1.7 Bulk Actions

| #  | Test Case               | Result   | Notes                                                                             |
|----|-------------------------|----------|-----------------------------------------------------------------------------------|
| 53 | Web bulk approve/reject | **FAIL** | DEF-43. No bulk action support on web. Only mobile API has `bulkActionApprovals`. |

### 1.8 Audit Trail

| #  | Test Case                        | Result   | Notes                                                                                        |
|----|----------------------------------|----------|----------------------------------------------------------------------------------------------|
| 54 | Audit on approve                 | **PASS** | `auditLogService.logAction(WORKFLOW_EXECUTION, id, STATUS_CHANGE, PENDING, APPROVED, ...)`.  |
| 55 | Audit on reject                  | **PASS** | Same pattern with REJECTED status. Includes rejection reason in audit message.               |
| 56 | Audit on return for modification | **PASS** | Logs status change to RETURNED.                                                              |
| 57 | Audit on delegation              | **PASS** | Logs UPDATE action with old/new assignee names.                                              |
| 58 | Audit on cancel                  | **PASS** | Logs STATUS_CHANGE to CANCELLED with cancellation reason.                                    |
| 59 | Audit on workflow advance        | **PASS** | Logs UPDATE with old/new step names.                                                         |
| 60 | Kafka events                     | **PASS** | `ApprovalDecisionEvent` for APPROVE/REJECT, `ApprovalTaskAssignedEvent` for step assignment. |

### 1.9 Cross-Module Integration

| #  | Test Case                           | Result      | Notes                                                                                                                                                                                                                                |
|----|-------------------------------------|-------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 61 | Leave approval -> balance deduction | **PASS**    | `ApprovalCallbackHandler` interface. `LeaveApprovalPayrollImpactTest` integration test exists.                                                                                                                                       |
| 62 | Callback error isolation            | **PASS**    | `invokeCallback` wrapped in try-catch. Callback failure does not roll back the approval.                                                                                                                                             |
| 63 | Attendance regularization workflow  | **PARTIAL** | `ATTENDANCE_REGULARIZATION` is NOT in the `WorkflowDefinition.EntityType` enum. It is not handled through the generic workflow engine. Attendance regularization has its own approval flow in `AttendanceRecordService`. See DEF-48. |

### 1.10 Workflow Builder UI

| #  | Test Case               | Result   | Notes                                                                                                                    |
|----|-------------------------|----------|--------------------------------------------------------------------------------------------------------------------------|
| 64 | Create new workflow     | **FAIL** | DEF-46. `/workflows/new` page does not exist. The "Create Workflow" button navigates to `/workflows/new` which will 404. |
| 65 | View workflow detail    | **PASS** | `/workflows/[id]` shows definition name, entity type, steps, SLA settings.                                               |
| 66 | Edit workflow           | **PASS** | `/workflows/[id]?edit=true` enables edit mode with React Hook Form + Zod.                                                |
| 67 | Deactivate workflow     | **PASS** | Confirmation modal. Mutation invalidates queries.                                                                        |
| 68 | Search/filter workflows | **PASS** | Client-side filter on status (ALL/ACTIVE/INACTIVE), entity type dropdown, search by name/description.                    |

---

## 2. Defect Register

### DEF-42 (MEDIUM):

`/approvals` page has NO permission check — any authenticated user sees approval cards

| Field        | Value                             |
|--------------|-----------------------------------|
| **Bug ID**   | DEF-42                            |
| **Severity** | MEDIUM                            |
| **Module**   | Approvals                         |
| **Route**    | `/approvals`                      |
| **File**     | `frontend/app/approvals/page.tsx` |

**Description:** The `/approvals` page (line 151, `ApprovalsPage` component) renders without any
`usePermissions` or `PermissionGate` check. While the backend `getApprovalInbox` endpoint requires
`WORKFLOW_VIEW`, an employee without approval permissions will see the full page UI (tabs, search
bar) with an eventual 403 from the API. The sibling `/approvals/inbox` page correctly checks
`WORKFLOW_VIEW || WORKFLOW_EXECUTE` before rendering (line 192-195).

**Impact:** UX confusion for employees who navigate to `/approvals` — they see loading skeletons
then an error card instead of a clean "Access denied" screen. Backend is protected, so no data leak
occurs.

**Fix:** Add `usePermissions` check matching `/approvals/inbox`:

```tsx
const { hasPermission, isReady } = usePermissions();
const canView = isReady && (hasPermission(Permissions.WORKFLOW_VIEW) || hasPermission(Permissions.WORKFLOW_EXECUTE));
if (!canView) return <EmptyState title="Access denied" ... />;
```

---

### DEF-43 (LOW): No bulk approve/reject on web — only mobile API supports batch actions

| Field        | Value                                          |
|--------------|------------------------------------------------|
| **Bug ID**   | DEF-43                                         |
| **Severity** | LOW                                            |
| **Module**   | Approvals                                      |
| **Route**    | `/approvals/inbox`                             |
| **Backend**  | `MobileApprovalController.bulkActionApprovals` |

**Description:** The `MobileApprovalController` (line 70-73) exposes a `bulkActionApprovals`
endpoint for batch approve/reject, but no equivalent exists in the web `WorkflowController`. The
`/approvals/inbox` frontend only allows single-item approve/reject. Managers with 50+ pending
approvals have no efficient way to process them on web.

**Impact:** Productivity blocker for managers with high approval volumes. Feature parity gap between
mobile and web.

**Fix:** Either (a) expose `bulkActionApprovals` on `WorkflowController` and add multi-select
checkboxes + "Approve Selected" / "Reject Selected" buttons to the inbox UI, or (b) reuse the mobile
API endpoint from the web service layer.

---

### DEF-44 (MEDIUM): "Return for Modification" action not exposed in frontend

| Field        | Value                                                                                       |
|--------------|---------------------------------------------------------------------------------------------|
| **Bug ID**   | DEF-44                                                                                      |
| **Severity** | MEDIUM                                                                                      |
| **Module**   | Approvals                                                                                   |
| **Route**    | `/approvals/inbox`                                                                          |
| **Backend**  | `WorkflowController.returnForModification` — `POST /api/v1/workflow/executions/{id}/return` |
| **Frontend** | `frontend/lib/services/workflow.service.ts` (line 105-111)                                  |

**Description:** The backend supports `RETURN_FOR_MODIFICATION` as a first-class approval action (
line 702-715 of `WorkflowService`). The frontend service layer (`workflow.service.ts` line 105) has
a `returnForModification` method. However, neither `/approvals` nor `/approvals/inbox` renders a "
Return" button in the UI. The only actions shown are Approve and Reject.

**Impact:** Approvers who need to send a request back to the requester for corrections (e.g., wrong
leave dates, incomplete expense receipts) are forced to reject and have the employee resubmit from
scratch, losing workflow context.

**Fix:** Add a "Return for Modification" button alongside Approve/Reject in the detail panel. It
should open a modal requiring a comment (similar to reject), calling
`workflowService.returnForModification(id, comments)`.

---

### DEF-45 (HIGH): Workflow versioning check counts ALL pending executions, not just executions using the edited workflow

| Field        | Value                                                                                             |
|--------------|---------------------------------------------------------------------------------------------------|
| **Bug ID**   | DEF-45                                                                                            |
| **Severity** | HIGH                                                                                              |
| **Module**   | Workflows                                                                                         |
| **File**     | `backend/src/main/java/com/hrms/application/workflow/service/WorkflowService.java` (line 266-277) |

**Description:** When updating a workflow definition, the code checks for active executions to
decide whether to create a new version:

```java
long activeExecutions = workflowExecutionRepository.countByStatus(tenantId,
        WorkflowExecution.ExecutionStatus.PENDING);
if (activeExecutions > 0) {
    // Create new version instead of updating
    definition.setActive(false);
    ...
}
```

`countByStatus(tenantId, PENDING)` counts ALL pending executions across ALL workflow definitions in
the tenant — not just executions using the specific workflow being edited. If tenant has ANY pending
leave request, editing an unrelated expense workflow will trigger unnecessary versioning,
deactivating the current definition and creating a clone.

**Impact:** Data integrity issue. Admins editing workflow definitions will see unexpected versioning
behavior. The original workflow gets deactivated when it should not be. Over time, this creates a
proliferation of inactive workflow versions that clutter the definition list.

**Fix:** Replace with a scoped count query:

```java
long activeExecutions = workflowExecutionRepository.countByWorkflowDefinitionIdAndStatusIn(
    id, tenantId, List.of(PENDING, IN_PROGRESS));
```

Add repository method:

```java
@Query("SELECT COUNT(e) FROM WorkflowExecution e WHERE e.workflowDefinition.id = :defId AND e.tenantId = :tenantId AND e.status IN :statuses")
long countByWorkflowDefinitionIdAndStatusIn(@Param("defId") UUID defId, @Param("tenantId") UUID tenantId, @Param("statuses") List<WorkflowExecution.ExecutionStatus> statuses);
```

---

### DEF-46 (MEDIUM):

`/workflows/new` page does not exist — "Create Workflow" button navigates to 404

| Field        | Value                                        |
|--------------|----------------------------------------------|
| **Bug ID**   | DEF-46                                       |
| **Severity** | MEDIUM                                       |
| **Module**   | Workflows                                    |
| **Route**    | `/workflows/new`                             |
| **File**     | `frontend/app/workflows/page.tsx` (line 158) |

**Description:** The "Create Workflow" button on `/workflows` executes
`router.push('/workflows/new')` (line 158). However, there is no
`frontend/app/workflows/new/page.tsx` file. This will result in a Next.js 404 page. The
`/workflows/[id]` page handles both view and edit mode but does not handle the `id = "new"` case for
creation.

**Impact:** Admins cannot create new workflow definitions through the UI. The workflow builder is
read-only + edit-only.

**Fix:** Either:

- (a) Create `frontend/app/workflows/new/page.tsx` that reuses the form from `/workflows/[id]` in
  create mode, OR
- (b) Modify `/workflows/[id]/page.tsx` to detect `id === "new"` and render the create form (calling
  `useCreateWorkflowDefinition` instead of `useUpdateWorkflowDefinition`).

---

### DEF-47 (MEDIUM): `/approvals` and

`/approvals/inbox` are duplicate pages with divergent implementations

| Field        | Value                                                                      |
|--------------|----------------------------------------------------------------------------|
| **Bug ID**   | DEF-47                                                                     |
| **Severity** | MEDIUM                                                                     |
| **Module**   | Approvals                                                                  |
| **Route**    | `/approvals` + `/approvals/inbox`                                          |
| **Files**    | `frontend/app/approvals/page.tsx`, `frontend/app/approvals/inbox/page.tsx` |

**Description:** Two separate pages exist for the approval inbox:

- `/approvals` — Simpler implementation with 3 tabs (Pending/Approved/Rejected), basic card layout,
  no detail panel, no delegation, no summary counts, no WebSocket, no permission check.
- `/approvals/inbox` — Full-featured implementation with module filters, split list-detail view,
  delegation support, WebSocket real-time updates, summary cards, RBAC gating.

Both pages call the same backend `getApprovalInbox` endpoint. The `/approvals` page is a
reduced-functionality duplicate that lacks DEF-42 permission gating and several features available
in `/approvals/inbox`. Having two divergent implementations creates maintenance burden and user
confusion (sidebar likely links to one, direct URL to the other).

**Impact:** Users may land on the inferior `/approvals` page instead of the full-featured
`/approvals/inbox`. Bug fixes applied to one page will not propagate to the other.

**Fix:** Redirect `/approvals` to `/approvals/inbox` (or consolidate by making `/approvals/page.tsx`
re-export the inbox page). This is the same pattern used by `/home` -> `/me/dashboard`.

---

### DEF-48 (LOW): Attendance regularization not integrated with generic workflow engine

| Field        | Value                                                                    |
|--------------|--------------------------------------------------------------------------|
| **Bug ID**   | DEF-48                                                                   |
| **Severity** | LOW                                                                      |
| **Module**   | Attendance / Workflows                                                   |
| **File**     | `backend/src/main/java/com/hrms/domain/workflow/WorkflowDefinition.java` |

**Description:** The `WorkflowDefinition.EntityType` enum has 21 types but does not include
`ATTENDANCE_REGULARIZATION`. Attendance regularization has its own separate approval logic in
`AttendanceRecordService` and `AttendanceController` rather than flowing through the generic
workflow engine. This means:

- Regularization approvals do NOT appear in the unified approval inbox
- They are not subject to the workflow engine's escalation, delegation, SLA, or audit trail
- No `ApprovalCallbackHandler` is invoked on approval

**Impact:** Managers must check both the approval inbox and the attendance regularization page
separately. Inconsistent approval UX across modules. Regularization approvals lack the
escalation/delegation safety net.

**Fix:** Long-term: Add `ATTENDANCE_REGULARIZATION` to `EntityType` enum and route regularization
through the workflow engine. Short-term: Document as a known gap. This is a design debt item, not a
bug per se.

---

## 3. Security Findings Summary

| Check                                 | Result      | Notes                                                                                                                                                        |
|---------------------------------------|-------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|
| IDOR on approval actions              | **PASS**    | `canBeActedUponBy(currentUser)` + `tenantId` scoping prevents IDOR                                                                                           |
| Tenant isolation                      | **PASS**    | All repository queries include `tenantId`. Native inbox query filters by `s.tenant_id`.                                                                      |
| SuperAdmin bypass                     | **PASS**    | `@RequiresPermission` on all endpoints; SuperAdmin bypasses via `PermissionAspect`. SuperAdmin sees own-tenant data unless using cross-tenant queries.       |
| Rate limiting on workflow endpoints   | **PASS**    | Global API rate limit (100/min) applies. No special workflow-specific rate limit needed.                                                                     |
| Deprecated repository methods flagged | **PASS**    | 4 methods in `StepExecutionRepository` marked `@Deprecated` with SEC-003 notes for missing `tenantId` filter. None are used in active code paths (verified). |
| Approval action idempotency           | **PASS**    | Completed workflow throws BusinessException. Already-acted step throws BusinessException. No double-processing risk.                                         |
| Cancel authorization                  | **PASS**    | Only requester can cancel (`requesterId.equals(currentUser)`).                                                                                               |
| Delegation self-delegation prevention | **PARTIAL** | No explicit check preventing a user from delegating to themselves. Backend will create the delegation. Low risk since it's functionally a no-op.             |

---

## 4. Test Coverage Assessment

| Test File                                 | Coverage Area                      | Status |
|-------------------------------------------|------------------------------------|--------|
| `WorkflowServiceTest.java`                | Core workflow service logic        | EXISTS |
| `WorkflowServiceAutoDelegationTest.java`  | Auto-delegation on leave           | EXISTS |
| `ApprovalServiceTest.java`                | Lightweight approval count service | EXISTS |
| `ApprovalCallbackHandlerTest.java`        | Callback dispatch                  | EXISTS |
| `WorkflowControllerTest.java`             | REST endpoint integration          | EXISTS |
| `ApprovalControllerTest.java`             | Approval endpoints                 | EXISTS |
| `ApprovalChainIntegrationTest.java`       | Multi-step chain integration       | EXISTS |
| `LeaveApprovalPayrollImpactTest.java`     | Cross-module: leave -> payroll     | EXISTS |
| `OfferLetterWorkflowIntegrationTest.java` | Recruitment offer workflow         | EXISTS |

**Assessment:** Good test coverage for the workflow engine. 9 test files covering service layer,
controller, integration, cross-module, and callback scenarios. No obvious gaps in backend test
coverage.

---

## 5. Architecture Quality Notes

### Strengths

- **Generic engine design:** The
  `workflow_def -> approval_step -> workflow_execution -> step_execution` 4-table model is clean and
  extensible. Adding a new approval type requires zero code changes (just data).
- **Callback pattern:** `ApprovalCallbackHandler` interface with Spring DI discovery is elegant.
  Each module registers its own handler. New modules auto-integrate.
- **Auto-delegation:** The leave-aware delegation chain (walk up 5 levels, check each manager's
  leave status, fall back to SUPER_ADMIN) is production-grade.
- **Idempotency:** Double-approve/reject is handled gracefully with clear error messages.
- **Audit completeness:** Every state transition is logged with old/new status, actor, timestamp,
  and comments.
- **Native SQL inbox:** The paginated inbox query is a well-optimized native SQL with proper tenant
  isolation, avoiding N+1 issues.

### Concerns

- **Deprecated methods still in codebase:** 4 `@Deprecated` methods in `StepExecutionRepository`
  with no `tenantId` filter. While not actively called, they should be removed to prevent accidental
  use.
- **Broad exception catches:** 3 `catch(Exception e)` blocks in workflow processing (lines 628, 793,
  1015). Each has a comment explaining the rationale (error boundary), but they could mask
  unexpected failures.
- **Missing workflow types in practice:** PARALLEL, CONDITIONAL, HIERARCHICAL, and HYBRID workflow
  types are defined in the enum but the `advanceToNextStep` logic only implements sequential
  advancement. Parallel approval is not implemented at the execution level.

---

## 6. Route Validation Status Update

| Route              | Module    | Risk | Validated | Defects        |
|--------------------|-----------|------|-----------|----------------|
| `/approvals`       | Approvals | P2   | **YES**   | DEF-42, DEF-47 |
| `/approvals/inbox` | Approvals | P1   | **YES**   | DEF-43, DEF-44 |
| `/workflows`       | Workflows | P1   | **YES**   | DEF-46         |
| `/workflows/[id]`  | Workflows | P1   | **YES**   | DEF-45         |

---

## 7. Defect Summary

| ID     | Severity | Module     | Summary                                                  | Fix Effort  |
|--------|----------|------------|----------------------------------------------------------|-------------|
| DEF-42 | MEDIUM   | Approvals  | `/approvals` page has no permission check                | 15 min      |
| DEF-43 | LOW      | Approvals  | No web bulk approve/reject (mobile-only)                 | 2-4 hours   |
| DEF-44 | MEDIUM   | Approvals  | "Return for Modification" action not in UI               | 1 hour      |
| DEF-45 | HIGH     | Workflows  | Versioning check scoped to ALL pending, not per-workflow | 30 min      |
| DEF-46 | MEDIUM   | Workflows  | `/workflows/new` page missing — Create button 404s       | 2-3 hours   |
| DEF-47 | MEDIUM   | Approvals  | Duplicate approval pages with divergent features         | 30 min      |
| DEF-48 | LOW      | Attendance | Regularization not routed through workflow engine        | Design debt |

**Totals:** 7 defects (1 HIGH, 4 MEDIUM, 2 LOW)

---

## 8. Recommended Fix Priority

1. **DEF-45** (HIGH) — Fix the versioning scope query. Straightforward repository method addition +
   one-line service change. Prevents workflow definition corruption.
2. **DEF-42 + DEF-47** (MEDIUM) — Consolidate `/approvals` into redirect to `/approvals/inbox`.
   Fixes both the permission gap and the duplicate page issue in one change.
3. **DEF-44** (MEDIUM) — Add "Return for Modification" button. Backend + frontend service already
   exist; only UI button + modal needed.
4. **DEF-46** (MEDIUM) — Create `/workflows/new` page or handle `id === "new"` in the existing
   detail page.
5. **DEF-43** (LOW) — Bulk actions. Nice-to-have for manager productivity.
6. **DEF-48** (LOW) — Attendance regularization integration. Design debt, not a bug.
