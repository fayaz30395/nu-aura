# 1-Week Aggressive Sprint: Approval Engine Wiring + Full QA for 15-Person Pilot

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the generic approval engine to all modules, stabilize project management, and QA every module end-to-end — preparing NU-AURA for a 15-person internal pilot replacing Keka.

**Architecture:** The generic workflow engine (WorkflowService) is 95% complete but only Recruitment uses it. Leave, Expense, and Loan have separate approval systems. 6 entity types (Asset, Travel, Onboarding, Timesheet, Document, Training) are configured in the enum but not wired. This plan integrates all modules into the unified engine, then runs comprehensive E2E QA.

**Tech Stack:** Spring Boot 3.4.1 (Java 17), Next.js 14, Playwright 1.57, PostgreSQL (Neon), Mantine UI, React Query, Zustand

**Demo Accounts:** All NuLogic users use password `Welcome@123`. Key users: `fayaz.m@nulogic.io` (SuperAdmin/CEO), `sumit@nulogic.io` (Manager), `jagadeesh@nulogic.io` (HR Manager), `suresh@nulogic.io` (Recruitment Admin), `mani@nulogic.io` / `dhanush@nulogic.io` (Team Leads), + 7 employees.

**Tenant:** NuLogic (`660e8400-e29b-41d4-a716-446655440001`)

---

## Parallel Execution Strategy

This plan is designed for **maximum parallelization**. Tasks are grouped into 5 independent tracks that can run simultaneously:

| Track | Focus | Dependencies |
|-------|-------|-------------|
| **Track A** | Approval engine wiring (backend) | None — independent backend work |
| **Track B** | Project management stabilization | None — independent module |
| **Track C** | E2E test infrastructure + auth tests | None — test scaffolding |
| **Track D** | E2E tests for all modules (parallel sub-agents per module) | Track C (test infra ready) |
| **Track E** | Bug fixes from QA findings | Tracks A-D (reactive) |

```
Day 1-2: Track A + Track B + Track C (parallel)
Day 2-4: Track D (parallel sub-agents per module, 6-8 agents)
Day 4-5: Track E (bug fixes based on QA findings)
Day 5-6: Regression testing + approval flow integration QA
Day 7:   Final smoke test + sign-off
```

---

## File Structure

### Backend Files to Modify (Approval Wiring)

| File | Responsibility | Change |
|------|---------------|--------|
| `backend/src/main/java/com/hrms/application/leave/service/LeaveRequestService.java` | Leave approval | Wire to WorkflowService instead of standalone approval |
| `backend/src/main/java/com/hrms/application/expense/service/ExpenseClaimService.java` | Expense approval | Wire to WorkflowService |
| `backend/src/main/java/com/hrms/application/loan/service/LoanService.java` | Loan approval | Wire to WorkflowService |
| `backend/src/main/java/com/hrms/application/asset/service/AssetManagementService.java` | Asset approval | Add WorkflowService integration |
| `backend/src/main/java/com/hrms/application/travel/service/TravelService.java` | Travel approval | Add WorkflowService integration |
| `backend/src/main/java/com/hrms/application/onboarding/service/OnboardingManagementService.java` | Onboarding approval | Add WorkflowService integration |
| `backend/src/main/java/com/hrms/application/workflow/service/WorkflowService.java` | Core engine | Add auto-delegation to next-higher-position logic + callback mechanism |
| `backend/src/main/java/com/hrms/application/project/service/ProjectTimesheetService.java` | Timesheet approval | Wire to WorkflowService |

### Backend Files to Create

| File | Responsibility |
|------|---------------|
| `backend/src/main/resources/db/migration/V54__seed_default_workflow_definitions.sql` | Seed default workflow definitions for leave, expense, asset, travel, onboarding, timesheet |

### Frontend E2E Files to Create

| File | Responsibility |
|------|---------------|
| `frontend/e2e/approval-flow.spec.ts` | End-to-end approval chain tests across modules |
| `frontend/e2e/assets.spec.ts` | Asset management E2E |
| `frontend/e2e/loans.spec.ts` | Loan management E2E |
| `frontend/e2e/travel.spec.ts` | Travel management E2E |
| `frontend/e2e/org-chart.spec.ts` | Org chart E2E |
| `frontend/e2e/onboarding-offboarding.spec.ts` | Onboarding/offboarding E2E |
| `frontend/e2e/notifications.spec.ts` | Notification delivery E2E |
| `frontend/e2e/timesheets.spec.ts` | Timesheet submission + PM approval E2E |
| `frontend/e2e/resource-allocation.spec.ts` | Resource allocation + over-allocation E2E |

### Existing E2E Files to Enhance

| File | Change |
|------|--------|
| `frontend/e2e/leave.spec.ts` | Add approval chain validation |
| `frontend/e2e/expenses.spec.ts` | Add multi-level approval chain |
| `frontend/e2e/projects.spec.ts` | Add allocation + timesheet flows |

---

## Track A: Approval Engine Wiring (Backend)

### Task A1: Seed Default Workflow Definitions

**Files:**
- Create: `backend/src/main/resources/db/migration/V54__seed_default_workflow_definitions.sql`

**Context:** The workflow engine is data-driven. Before modules can use it, workflow definitions must exist in the database for each entity type. These define the approval chains.

- [ ] **Step 1: Write the migration SQL**

Create workflow definitions for each approval chain agreed upon:
- `LEAVE_REQUEST`: Employee → Reporting Manager (1 step, auto-resolve manager)
- `EXPENSE_CLAIM`: Employee → Reporting Manager → Finance Head (2 steps)
- `ASSET_REQUEST`: Employee → Reporting Manager → IT Admin (2 steps)
- `ONBOARDING`: HR → Department Head (1 step)
- `TIMESHEET`: Employee → Project Manager (1 step, resolved per-project)
- `TRAVEL_REQUEST`: Employee → Reporting Manager (1 step)
- `LOAN_REQUEST`: Employee → Reporting Manager → Finance Head (2 steps)

Each definition needs: `workflow_definitions` row + `approval_steps` rows with approver type (REPORTING_MANAGER, DEPARTMENT_HEAD, ROLE-based for Finance/IT).

Reference the existing Recruitment workflow definition pattern in V0 or V19 seed data.

- [ ] **Step 2: Validate migration runs cleanly**

Run: `cd backend && ./mvnw flyway:migrate -Dflyway.target=54`
Expected: Migration V54 applied successfully.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/db/migration/V54__seed_default_workflow_definitions.sql
git commit -m "feat(workflow): seed default workflow definitions for all approval chains (V54)"
```

---

### Task A2: Implement Approval Callback Mechanism

**Files:**
- Create: `backend/src/main/java/com/hrms/application/workflow/callback/ApprovalCallbackHandler.java`
- Modify: `backend/src/main/java/com/hrms/application/workflow/service/WorkflowService.java`
- Create: `backend/src/test/java/com/hrms/application/workflow/callback/ApprovalCallbackHandlerTest.java`

**Context:** The WorkflowService can process approval actions, but there is no callback mechanism to notify the originating service (Leave, Expense, etc.) when a workflow reaches a terminal state (APPROVED/REJECTED). Before wiring any module, we need this callback pattern.

**Reference pattern:** Read `RecruitmentManagementService.java` (lines 401-419) to see how Recruitment integrates with WorkflowService. It uses a fire-and-forget `startWorkflow()` call. For callbacks, we need the reverse — WorkflowService notifying the module when a decision is made.

- [ ] **Step 1: Read the existing WorkflowService `processApprovalAction()` method**

Understand where the workflow reaches terminal states (final step approved → execution APPROVED, any step rejected → execution REJECTED). This is where callbacks should fire.

- [ ] **Step 2: Design the callback interface**

Create `ApprovalCallbackHandler` interface:
```java
public interface ApprovalCallbackHandler {
    WorkflowDefinition.EntityType getEntityType();
    void onApproved(UUID tenantId, UUID entityId, UUID approvedBy);
    void onRejected(UUID tenantId, UUID entityId, UUID rejectedBy, String reason);
}
```

Each module will implement this interface. WorkflowService will maintain a `Map<EntityType, ApprovalCallbackHandler>` auto-wired via Spring's `List<ApprovalCallbackHandler>` injection.

- [ ] **Step 3: Write failing test**

Test: When workflow reaches APPROVED state, the registered callback handler's `onApproved()` is invoked with correct entityId.

- [ ] **Step 4: Run test — expect FAIL**

- [ ] **Step 5: Implement**

1. Create the interface
2. Modify WorkflowService to inject `List<ApprovalCallbackHandler>`
3. Build a map keyed by `EntityType` in `@PostConstruct`
4. In `processApprovalAction()`, after setting execution to APPROVED/REJECTED, invoke the callback
5. Wrap callback in try-catch to prevent callback failures from rolling back the approval

- [ ] **Step 6: Run test — expect PASS**

- [ ] **Step 7: Commit**

```bash
git commit -m "feat(workflow): add ApprovalCallbackHandler interface for module-specific approval callbacks"
```

---

### Task A3: Add Auto-Delegation to Next-Higher-Position

**Files:**
- Modify: `backend/src/main/java/com/hrms/application/workflow/service/WorkflowService.java`

**Context:** When an approver is unavailable (on leave, inactive), the system should auto-delegate to the next higher position in the reporting chain. Currently, delegation is time-bound and manual via `approval_delegates` table. We need automatic fallback that runs AFTER explicit delegation check fails.

**Delegation resolution order (critical):**
1. Resolve initial approver (REPORTING_MANAGER, DEPARTMENT_HEAD, ROLE, etc.)
2. Check `approval_delegates` table for explicit manual delegation → if found, use delegate
3. If no explicit delegate AND approver has active approved leave overlapping today → walk up reporting chain
4. If chain exhausts (no higher manager), fall back to any SUPER_ADMIN user

- [ ] **Step 1: Read the current approver resolution logic**

Read WorkflowService.java — both `resolveApprover()` and `checkDelegation()` methods. Understand the existing flow.

- [ ] **Step 2: Read the employee reporting chain**

Find how reporting manager / department head lookups work. Check `EmployeeService` or `EmployeeRepository` for `getReportingManager()` or `getManagerChain()` methods.

- [ ] **Step 3: Write the failing tests**

Create test in `backend/src/test/java/com/hrms/application/workflow/service/WorkflowServiceAutoDelegationTest.java`:
- Test: Explicit delegate exists → use delegate (existing behavior preserved)
- Test: No explicit delegate + approver on leave → resolve to approver's reporting manager
- Test: No explicit delegate + approver on leave + manager also on leave → resolve to manager's manager
- Test: Chain exhausts (no higher manager) → fall back to SuperAdmin
- Test: Explicit delegate exists AND approver on leave → explicit delegate wins (not chain walk)

- [ ] **Step 4: Run test to verify it fails**

Run: `cd backend && ./mvnw test -pl . -Dtest=WorkflowServiceAutoDelegationTest -Dsurefire.failIfNoTests=false`
Expected: FAIL

- [ ] **Step 5: Implement auto-delegation logic**

Add a new method `resolveAvailableApprover(UUID tenantId, UUID initialApproverId)` that:
1. First checks `approval_delegates` for explicit delegation → return delegate if found
2. Then checks if approver has active approved leave overlapping today
3. If on leave, get approver's reporting manager via employee repository
4. Repeat steps 1-3 for new approver (up to 5 levels to prevent infinite loops)
5. If chain exhausts, query for any user with SUPER_ADMIN role
6. Log each delegation hop with reason

Call this method from the step assignment logic, after `resolveApprover()` determines the initial approver.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && ./mvnw test -pl . -Dtest=WorkflowServiceAutoDelegationTest`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/hrms/application/workflow/service/WorkflowService.java
git add backend/src/test/java/com/hrms/application/workflow/service/WorkflowServiceAutoDelegationTest.java
git commit -m "feat(workflow): auto-delegate to next higher position when approver unavailable"
```

---

### Task A4: Wire Leave Requests to Generic Workflow Engine

**Files:**
- Modify: `backend/src/main/java/com/hrms/application/leave/service/LeaveRequestService.java`
- Modify: `backend/src/test/java/com/hrms/application/leave/service/LeaveRequestServiceTest.java`

**Context:** Leave currently has its own approval system (PENDING → APPROVED/REJECTED with manager validation). Need to route through WorkflowService while preserving the leave-specific balance deduction on approval. Follow the Recruitment module's pattern (see `RecruitmentManagementService.java` lines 401-419) for the `startWorkflow()` call. Implement `ApprovalCallbackHandler` (from Task A2) for the approval/rejection callback.

**Note:** The entity type enum is `WorkflowDefinition.EntityType.LEAVE_REQUEST` (nested enum in `domain/workflow/WorkflowDefinition.java`).

- [ ] **Step 1: Read current LeaveRequestService approval flow**

Read `submitLeaveRequest()`, `approveLeaveRequest()`, `rejectLeaveRequest()`. Identify where balance deduction happens.

- [ ] **Step 2: Read RecruitmentManagementService as reference pattern**

Read `backend/src/main/java/com/hrms/application/recruitment/service/RecruitmentManagementService.java` lines 401-419.

- [ ] **Step 3: Write failing test**

Test: When leave request submitted, `workflowService.startWorkflow()` called with `LEAVE_REQUEST` entity type.

- [ ] **Step 4: Run test — expect FAIL**

- [ ] **Step 5: Implement**

a) Make `LeaveRequestService` implement `ApprovalCallbackHandler`:
- `getEntityType()` → `WorkflowDefinition.EntityType.LEAVE_REQUEST`
- `onApproved()` → deduct leave balance + publish Kafka event
- `onRejected()` → update status to REJECTED

b) On `submitLeaveRequest()`: build `WorkflowExecutionRequest`, call `workflowService.startWorkflow()` (wrapped in try-catch).

c) **Frontend compatibility:** Check if `frontend/lib/services/leave.service.ts` approval endpoints need updating.

- [ ] **Step 6: Run tests — expect PASS**

- [ ] **Step 7: Commit**

```bash
git commit -m "feat(leave): wire leave approval to generic workflow engine with callback handler"
```

---

### Task A5: Wire Expense Claims to Generic Workflow Engine

**Files:**
- Modify: `backend/src/main/java/com/hrms/application/expense/service/ExpenseClaimService.java`
- Modify: `backend/src/test/java/com/hrms/application/expense/service/ExpenseClaimServiceTest.java`

**Context:** Expense has own status flow (DRAFT → SUBMITTED → PENDING_APPROVAL → APPROVED → REIMBURSED). Wire to 2-step workflow: Employee → Manager → Finance Head. Implement `ApprovalCallbackHandler`.

- [ ] **Step 1: Read current ExpenseClaimService approval methods**
- [ ] **Step 2: Write failing test** — `startWorkflow()` called with `WorkflowDefinition.EntityType.EXPENSE_CLAIM`
- [ ] **Step 3: Run test — expect FAIL**
- [ ] **Step 4: Implement** — implement `ApprovalCallbackHandler`, `onApproved()` marks for reimbursement, `onRejected()` returns to employee. Check `frontend/lib/services/expense.service.ts` for API compatibility.
- [ ] **Step 5: Run tests — expect PASS**
- [ ] **Step 6: Commit**

```bash
git commit -m "feat(expense): wire expense approval to generic workflow engine"
```

---

### Task A6: Wire Asset Requests to Generic Workflow Engine

**Files:**
- Modify: `backend/src/main/java/com/hrms/application/asset/service/AssetManagementService.java`
- Create: `backend/src/test/java/com/hrms/application/asset/service/AssetManagementServiceWorkflowTest.java`

**Context:** Asset requests have `WorkflowDefinition.EntityType.ASSET_REQUEST` but no service integration. Wire to 2-step: Employee → Manager → IT Admin. Implement `ApprovalCallbackHandler`.

- [ ] **Step 1: Read AssetManagementService** to understand current flow
- [ ] **Step 2: Write failing test**
- [ ] **Step 3: Run test — expect FAIL**
- [ ] **Step 4: Implement** — `ApprovalCallbackHandler`, call `startWorkflow()` on submission. Check `frontend/lib/services/asset.service.ts` for API compatibility.
- [ ] **Step 5: Run tests — expect PASS**
- [ ] **Step 6: Commit**

```bash
git commit -m "feat(asset): wire asset request approval to generic workflow engine"
```

---

### Task A7: Wire Travel Requests to Generic Workflow Engine

**Files:**
- Modify: `backend/src/main/java/com/hrms/application/travel/service/TravelService.java`
- Create: `backend/src/test/java/com/hrms/application/travel/service/TravelServiceWorkflowTest.java`

- [ ] **Step 1: Read TravelService**
- [ ] **Step 2: Write failing test**
- [ ] **Step 3: Run test — expect FAIL**
- [ ] **Step 4: Implement** — `ApprovalCallbackHandler` with `TRAVEL_REQUEST`. Check `frontend/lib/services/travel.service.ts`.
- [ ] **Step 5: Run tests — expect PASS**
- [ ] **Step 6: Commit**

```bash
git commit -m "feat(travel): wire travel request approval to generic workflow engine"
```

---

### Task A8: Wire Onboarding to Generic Workflow Engine

**Files:**
- Modify: `backend/src/main/java/com/hrms/application/onboarding/service/OnboardingManagementService.java`
- Create: `backend/src/test/java/com/hrms/application/onboarding/service/OnboardingManagementServiceWorkflowTest.java`

- [ ] **Step 1: Read OnboardingManagementService**
- [ ] **Step 2: Write failing test**
- [ ] **Step 3: Run test — expect FAIL**
- [ ] **Step 4: Implement** — HR initiates → workflow starts with `ONBOARDING` → Department Head approves. Check `frontend/lib/services/onboarding.service.ts`.
- [ ] **Step 5: Run tests — expect PASS**
- [ ] **Step 6: Commit**

```bash
git commit -m "feat(onboarding): wire onboarding approval to generic workflow engine"
```

---

### Task A9: Wire Loan Requests to Generic Workflow Engine

**Files:**
- Modify: `backend/src/main/java/com/hrms/application/loan/service/LoanService.java`
- Create: `backend/src/test/java/com/hrms/application/loan/service/LoanServiceWorkflowTest.java`

- [ ] **Step 1: Read LoanService** approval methods
- [ ] **Step 2: Write failing test**
- [ ] **Step 3: Run test — expect FAIL**
- [ ] **Step 4: Implement** — `ApprovalCallbackHandler`, 2-step: Employee → Manager → Finance Head. Check `frontend/lib/services/loan.service.ts`.
- [ ] **Step 5: Run tests — expect PASS**
- [ ] **Step 6: Commit**

```bash
git commit -m "feat(loan): wire loan approval to generic workflow engine"
```

---

### Task A10: Wire Timesheet Approval to Workflow Engine (PM-Based)

**Files:**
- Modify: `backend/src/main/java/com/hrms/application/project/service/ProjectTimesheetService.java`
- Create: `backend/src/test/java/com/hrms/application/project/service/ProjectTimesheetWorkflowTest.java`

**Context:** Timesheet approval must route to the Project Manager of the specific project, not the reporting manager. If employee is on 2 projects (50/50), each PM approves their portion independently. The service is in the `application/project` package (NOT `timetracking`).

- [ ] **Step 1: Read ProjectTimesheetService** approval flow (lines 163-180)
- [ ] **Step 2: Write failing tests**

Tests needed:
- Submit timesheet → workflow starts with `TIMESHEET` type, approver resolved to project manager
- Employee on 2 projects → 2 separate workflow executions created, one per project
- PM1 approves, PM2 rejects → PM1's entries stay approved, PM2's entries rejected

- [ ] **Step 3: Run tests — expect FAIL**
- [ ] **Step 4: Implement**

On weekly timesheet submission:
1. Group time entries by project
2. For each project, start a workflow execution with `TIMESHEET` type
3. Resolve approver as project manager (lookup `projects.project_manager_id`)
4. Each workflow is independent — PM approves/rejects only their project's entries
5. Check `frontend/lib/services/timesheet.service.ts` for API compatibility.

- [ ] **Step 5: Run tests — expect PASS**
- [ ] **Step 6: Commit**

```bash
git commit -m "feat(timesheet): wire timesheet approval to workflow engine with per-project PM routing"
```

---

### Task A11: Backend Integration Test — Full Approval Chain

**Files:**
- Create: `backend/src/test/java/com/hrms/integration/ApprovalChainIntegrationTest.java`

- [ ] **Step 1: Write integration test**

Test the complete flow:
1. Employee submits leave request → workflow created → step assigned to reporting manager
2. Reporting manager approves → leave status APPROVED, balance deducted
3. Employee submits expense → workflow created → step 1 assigned to manager
4. Manager approves → step 2 assigned to finance head
5. Finance head approves → expense APPROVED

- [ ] **Step 2: Run integration test**

Run: `cd backend && ./mvnw test -pl . -Dtest=ApprovalChainIntegrationTest`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git commit -m "test(workflow): add integration test for full approval chain across modules"
```

---

## Track B: Project Management Stabilization

### Task B1: Consolidate Dual Project Employee Tables

**Files:**
- Read: `backend/src/main/resources/db/migration/V0__init.sql` (find both table definitions)
- Modify: Backend services that reference both tables

**Context:** There are two tables: `project_employees` (older) and `project_members` (current). This creates data consistency risks.

- [ ] **Step 1: Audit which services use which table**

Grep for `project_employees` and `project_members` across all backend Java files. Determine which is authoritative.

- [ ] **Step 2: Determine consolidation strategy**

If `project_members` is the current standard (has NUMERIC precision for allocation), migrate references from `project_employees` to `project_members`.

- [ ] **Step 3: Create migration if needed**

Create `V55__consolidate_project_member_tables.sql` using the **view-aliasing approach** (non-destructive): create a view on `project_members` aliased as `project_employees` so both names resolve to the same data. Do NOT drop the old table in this sprint — defer table drop to a future sprint after validation.

- [ ] **Step 4: Update repository references**

Update any JPA repositories or queries that reference the deprecated table.

- [ ] **Step 5: Run all project-related tests**

Run: `cd backend && ./mvnw test -pl . -Dtest="*Project*"`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git commit -m "refactor(projects): consolidate dual project employee tables into project_members"
```

---

### Task B2: Validate Over-Allocation (>100%) Approval Flow

**Files:**
- Read: `backend/src/main/java/com/hrms/application/resourcemanagement/service/ResourceManagementService.java`
- Modify: If validation is missing

**Context:** Allocation >100% is allowed but must require Reporting Manager approval. Verify the AllocationApprovalRequest is created when total exceeds 100%.

- [ ] **Step 1: Read ResourceManagementService allocation logic** (line 106)
- [ ] **Step 2: Write test for over-allocation scenario**

Test: Allocate employee to Project A at 70%, then Project B at 50% → total 120% → should create AllocationApprovalRequest with status PENDING.

- [ ] **Step 3: Run test**
- [ ] **Step 4: Fix if needed** — ensure approval is enforced, not just flagged
- [ ] **Step 5: Commit**

```bash
git commit -m "fix(resources): enforce approval requirement for over-allocation >100%"
```

---

### Task B3: Validate Billing Rate Calculation

**Files:**
- Read: `backend/src/main/java/com/hrms/application/project/service/ProjectTimesheetService.java` (lines 75-88)

- [ ] **Step 1: Write unit test for billing calculation**

Test: Time entry with 8 hours, billing rate ₹2000/hr → billed_amount = ₹16,000
Test: Non-billable entry → billed_amount = null
Test: Entry with no explicit rate → inherits from project_members.billing_rate

- [ ] **Step 2: Run tests**
- [ ] **Step 3: Fix if needed**
- [ ] **Step 4: Commit**

```bash
git commit -m "test(timesheet): validate billing rate calculation logic"
```

---

## Track C: E2E Test Infrastructure Setup

### Task C1: Verify Playwright Setup and Auth Flow

**Files:**
- Read: `frontend/playwright.config.ts`
- Read: `frontend/e2e/auth.setup.ts`
- Read: `frontend/e2e/fixtures/testData.ts`

- [ ] **Step 1: Start the backend and frontend**

```bash
cd /Users/macbook/IdeaProjects/nulogic/nu-aura
docker-compose up -d  # Redis, Kafka, MinIO
cd backend && ./start-backend.sh &
cd frontend && npm run dev &
```

Wait for both to be healthy (backend: `curl http://localhost:8080/actuator/health`, frontend: `curl http://localhost:3000`).

- [ ] **Step 2: Run existing auth E2E test**

```bash
cd frontend && npx playwright test auth.spec.ts --project=chromium
```

Expected: Auth tests pass. If they fail, debug and fix before proceeding.

- [ ] **Step 3: Run existing smoke test**

```bash
cd frontend && npx playwright test smoke.spec.ts --project=chromium
```

- [ ] **Step 4: Document any failures**

Create a file `docs/superpowers/plans/qa-findings.md` to track all failures found during QA.

- [ ] **Step 5: Commit any fixes**

```bash
git commit -m "fix(e2e): stabilize auth and smoke tests for QA sprint"
```

---

### Task C2: Update Test Fixtures for Approval Flow Testing

**Files:**
- Modify: `frontend/e2e/fixtures/testData.ts`

**Context:** Test fixtures need users that map to the NuLogic demo hierarchy for approval chain testing.

- [ ] **Step 1: Add approval-chain-specific test users**

Add entries for:
- `fayaz.m@nulogic.io` — SuperAdmin (CEO)
- `sumit@nulogic.io` — Engineering Manager (approver for engineering employees)
- `jagadeesh@nulogic.io` — HR Manager
- `mani@nulogic.io` — Team Lead (has direct reports: raj, gokul)
- `raj@nulogic.io` — Employee (submitter)
- `saran@nulogic.io` — Employee (submitter)

All with password `Welcome@123`.

- [ ] **Step 2: Add helper functions for multi-user approval flows**

Create helpers in `frontend/e2e/fixtures/helpers.ts` as Playwright test fixtures:
- `loginAs(page, email)` — quick login as specific user
- `switchUser(page, fromEmail, toEmail)` — logout + login as different user
- `submitAndApprove(page, submitAs, approveAs, action)` — submit a request, switch user, approve

- [ ] **Step 3: Run auth tests to verify new fixtures work**
- [ ] **Step 4: Commit**

```bash
git commit -m "test(e2e): add approval-chain test fixtures and multi-user helpers"
```

---

## Track D: E2E Tests for All Modules (Parallelizable)

Each task in this track is **independent** and can be assigned to a separate sub-agent. All depend on Track C being complete.

**IMPORTANT dependency note:** Tasks D1-D8 include approval chain tests that depend on their corresponding Track A wiring tasks. Split each D task into two phases:
- **Phase 1 (CRUD smoke tests):** Can run immediately after Track C. Tests page loads, form submissions, data display.
- **Phase 2 (approval chain tests):** Depends on Track A completion. Tests the full submit → approve → status-update flow.

Run Phase 1 for all modules in parallel first. Run Phase 2 after Track A is complete. Tasks D9-D16 have no Track A dependency.

### Task D1: E2E — Leave Management (Full Approval Flow)

**Files:**
- Modify: `frontend/e2e/leave.spec.ts`

- [ ] **Step 1: Add approval chain test**

Test flow:
1. Login as `raj@nulogic.io` (Employee)
2. Navigate to Leave → Apply Leave
3. Submit a casual leave request for tomorrow
4. Verify request appears with status PENDING
5. Logout → Login as `mani@nulogic.io` (Team Lead / Reporting Manager)
6. Navigate to Approvals Inbox
7. Verify the leave request appears
8. Approve it with comment
9. Logout → Login as `raj@nulogic.io`
10. Verify leave request shows APPROVED
11. Verify leave balance is deducted

- [ ] **Step 2: Add rejection test**

Same flow but manager rejects → verify employee sees REJECTED status.

- [ ] **Step 3: Run tests**

```bash
cd frontend && npx playwright test leave.spec.ts --project=chromium
```

- [ ] **Step 4: Commit**

```bash
git commit -m "test(e2e): add leave approval chain E2E tests"
```

---

### Task D2: E2E — Expense Management (Multi-Level Approval)

**Files:**
- Modify: `frontend/e2e/expenses.spec.ts`

- [ ] **Step 1: Add multi-level approval test**

Test flow:
1. Login as `saran@nulogic.io` (Employee)
2. Create expense claim (e.g., travel reimbursement ₹5000)
3. Submit for approval
4. Switch to `sumit@nulogic.io` (Manager) → approve
5. Switch to Finance Head (identify from seed data or use SuperAdmin) → approve
6. Switch back to `saran@nulogic.io` → verify APPROVED

- [ ] **Step 2: Add rejection-at-level-2 test**

Manager approves, Finance Head rejects → verify employee sees REJECTED.

- [ ] **Step 3: Run and commit**

```bash
git commit -m "test(e2e): add expense multi-level approval E2E tests"
```

---

### Task D3: E2E — Asset Management (New Spec)

**Files:**
- Create: `frontend/e2e/assets.spec.ts`

- [ ] **Step 1: Write asset CRUD tests**

Tests:
- Navigate to assets page, verify it loads
- Create asset request (e.g., laptop)
- View asset request details
- Search/filter assets

- [ ] **Step 2: Write approval chain test**

Employee requests asset → Manager approves → IT Admin approves → asset assigned.

- [ ] **Step 3: Run and commit**

```bash
git commit -m "test(e2e): add asset management E2E tests with approval flow"
```

---

### Task D4: E2E — Travel Management (New Spec)

**Files:**
- Create: `frontend/e2e/travel.spec.ts`

- [ ] **Step 1: Write travel request tests**

Tests:
- Navigate to travel page, verify it loads
- Create travel request
- Submit for approval
- Manager approves
- Verify status update

- [ ] **Step 2: Run and commit**

```bash
git commit -m "test(e2e): add travel management E2E tests"
```

---

### Task D5: E2E — Loan Management (New Spec)

**Files:**
- Create: `frontend/e2e/loans.spec.ts`

- [ ] **Step 1: Write loan request tests**

Tests:
- Navigate to loans page
- Create loan request
- Submit for approval
- Manager → Finance Head approval chain
- Verify status transitions

- [ ] **Step 2: Run and commit**

```bash
git commit -m "test(e2e): add loan management E2E tests"
```

---

### Task D6: E2E — Onboarding/Offboarding (New Spec)

**Files:**
- Create: `frontend/e2e/onboarding-offboarding.spec.ts`

- [ ] **Step 1: Write onboarding flow test**

Tests:
- HR Admin initiates onboarding for new hire
- Department Head approves
- Verify onboarding checklist/tasks created

- [ ] **Step 2: Write offboarding flow test**

Tests:
- HR initiates offboarding
- Verify offboarding checklist generated

- [ ] **Step 3: Run and commit**

```bash
git commit -m "test(e2e): add onboarding and offboarding E2E tests"
```

---

### Task D7: E2E — Org Chart (New Spec)

**Files:**
- Create: `frontend/e2e/org-chart.spec.ts`

- [ ] **Step 1: Write org chart tests**

Tests:
- Navigate to org chart
- Verify hierarchy renders (Fayaz → Sumit → Mani → Raj/Gokul)
- Verify HR hierarchy (Fayaz → Jagadeesh → Suresh/Dhanush)
- Click on employee node → verify profile card/link
- Search in org chart

- [ ] **Step 2: Run and commit**

```bash
git commit -m "test(e2e): add org chart E2E tests"
```

---

### Task D8: E2E — Timesheets + Resource Allocation (New Specs)

**Files:**
- Create: `frontend/e2e/timesheets.spec.ts`
- Create: `frontend/e2e/resource-allocation.spec.ts`

- [ ] **Step 1: Write timesheet tests**

Tests:
- Employee logs daily hours against a project
- Employee submits weekly timesheet
- Project Manager approves timesheet
- Verify hours reflected in project dashboard

- [ ] **Step 2: Write resource allocation tests**

Tests:
- Allocate employee to project at 60%
- View allocation summary → verify 60% shown
- Attempt over-allocation (>100%) → verify approval request created
- Manager approves over-allocation → verify updated

- [ ] **Step 3: Run and commit**

```bash
git commit -m "test(e2e): add timesheet and resource allocation E2E tests"
```

---

### Task D9: E2E — Performance Reviews

**Files:**
- Modify: `frontend/e2e/performance-pip.spec.ts` (or enhance existing)

- [ ] **Step 1: Verify existing performance tests pass**

```bash
cd frontend && npx playwright test performance --project=chromium
```

- [ ] **Step 2: Add review cycle flow if missing**

Test: HR creates review cycle → Manager submits review for direct report → Employee sees review.

- [ ] **Step 3: Commit if changes made**

---

### Task D10: E2E — Recruitment Pipeline

**Files:**
- Modify: `frontend/e2e/recruitment-kanban.spec.ts` (enhance existing)

- [ ] **Step 1: Verify existing recruitment tests pass**
- [ ] **Step 2: Add offer approval flow** (already wired to workflow engine)

Test: Create job → add candidate → move to offer stage → verify workflow triggers.

- [ ] **Step 3: Commit if changes made**

---

### Task D11: E2E — Training/LMS

**Files:**
- Modify: `frontend/e2e/training.spec.ts` / `frontend/e2e/lms-catalog.spec.ts`

- [ ] **Step 1: Verify existing training tests pass**
- [ ] **Step 2: Add enrollment + completion flow if missing**
- [ ] **Step 3: Commit if changes made**

---

### Task D12: E2E — Admin Panel + RBAC Scenarios

**Files:**
- Modify: `frontend/e2e/admin-roles.spec.ts`

- [ ] **Step 1: Verify existing admin tests pass**
- [ ] **Step 2: Add role-based access test**

Test: Login as Employee → verify admin menu is hidden. Login as SuperAdmin → verify full access.

- [ ] **Step 3: Add permission change test**

Test: SuperAdmin changes employee's role → employee's UI updates on next login.

- [ ] **Step 4: Commit if changes made**

---

### Task D13: E2E — Dashboard, Analytics, Reports

**Files:**
- Modify: `frontend/e2e/dashboard.spec.ts`, `frontend/e2e/analytics.spec.ts`, `frontend/e2e/reports-builder.spec.ts`

- [ ] **Step 1: Verify all existing tests pass**
- [ ] **Step 2: Add data-driven dashboard test**

Test: After creating leave requests and approving them, dashboard metrics update accordingly.

- [ ] **Step 3: Commit if changes made**

---

### Task D14: E2E — Notifications

**Files:**
- Create: `frontend/e2e/notifications.spec.ts`

- [ ] **Step 1: Write notification delivery test**

Test:
1. Employee submits leave request
2. Manager receives notification (bell icon badge increments)
3. Manager clicks notification → navigates to approval page
4. Manager approves → Employee receives approval notification

- [ ] **Step 2: Run and commit**

```bash
git commit -m "test(e2e): add notification delivery E2E tests"
```

---

### Task D15: E2E — App Switcher + Platform Navigation

**Files:**
- Modify: `frontend/e2e/app-switcher.spec.ts`, `frontend/e2e/navigation.spec.ts`

- [ ] **Step 1: Verify existing tests pass**
- [ ] **Step 2: Add app switching flow**

Test: Login → open waffle grid → switch from HRMS to Hire → verify sidebar changes → switch to Grow → verify sidebar changes.

- [ ] **Step 3: Commit if changes made**

---

### Task D16a: E2E Smoke Tests — NU-HRMS Remaining Modules (Documents, Letters, Benefits, Helpdesk)

**Files:**
- Create: `frontend/e2e/documents.spec.ts` (enhance if exists)
- Create: `frontend/e2e/letters.spec.ts`
- Modify: `frontend/e2e/benefits.spec.ts` (enhance if exists)

- [ ] **Step 1: Write smoke tests for each module**

Minimum per module:
1. Navigate to module page → verify it loads without errors
2. If there's a create form → verify it opens
3. If there's a list view → verify data loads (or empty state shows)

- [ ] **Step 2: Run and commit**

```bash
git commit -m "test(e2e): add smoke tests for documents, letters, benefits, helpdesk"
```

---

### Task D16b: E2E Smoke Tests — NU-Grow Modules (Wellness, Recognition, Surveys, OKR, 360 Feedback)

**Files:**
- Create: `frontend/e2e/wellness.spec.ts`
- Create: `frontend/e2e/recognition.spec.ts`
- Create: `frontend/e2e/surveys.spec.ts`
- Create: `frontend/e2e/okr.spec.ts`
- Create: `frontend/e2e/feedback360.spec.ts`

- [ ] **Step 1: Write smoke tests for each module**

Same minimum as D16a: page loads, create form opens, list view works.

- [ ] **Step 2: Run and commit**

```bash
git commit -m "test(e2e): add smoke tests for wellness, recognition, surveys, OKR, 360 feedback"
```

---

### Task D16c: E2E Smoke Tests — Remaining Modules (Calendar, Announcements, Settings, Holidays, Statutory, Tax)

**Files:**
- Create/modify specs for each module

- [ ] **Step 1: Write smoke tests** — page loads, basic interaction works
- [ ] **Step 2: Run and commit**

```bash
git commit -m "test(e2e): add smoke tests for calendar, announcements, settings, holidays, statutory, tax"
```

---

## Track E: Bug Fixes (Reactive)

### Task E1: Triage and Fix Bugs from QA

**Files:**
- Read: `docs/superpowers/plans/qa-findings.md` (populated during Track D)

**Context:** As E2E tests run, failures will be captured. This track is reactive — fix bugs as they're discovered.

- [ ] **Step 1: Categorize findings by severity**

- **P0 (Blocker):** User cannot complete a core flow (login, submit leave, approve request)
- **P1 (Critical):** Feature works but has significant issues (wrong data, broken navigation)
- **P2 (Minor):** UI polish, non-blocking issues

- [ ] **Step 2: Fix all P0 bugs immediately**
- [ ] **Step 3: Fix P1 bugs**
- [ ] **Step 4: Log P2 bugs for later** (don't fix during sprint unless time permits)
- [ ] **Step 5: Re-run failed tests after fixes**
- [ ] **Step 6: Commit each fix separately**

Use commit format: `fix(<module>): <description of fix>`

---

## Track F: Final Validation (Day 6-7)

### Task F1: Full Regression Run

- [ ] **Step 1: Run ALL E2E tests**

```bash
cd frontend && npx playwright test --project=chromium --workers=4
```

- [ ] **Step 2: Run ALL backend tests**

```bash
cd backend && ./mvnw test
```

- [ ] **Step 3: Generate test report**

```bash
cd frontend && npx playwright show-report
```

- [ ] **Step 4: Document final results in qa-findings.md**

---

### Task F2: Manual Smoke Test — 15 Critical User Journeys

**Context:** Automated tests can miss visual/UX issues. These 15 journeys represent what the pilot users will do on day 1.

- [ ] **Journey 1:** SuperAdmin logs in → sees all 4 apps in waffle grid → navigates to Admin → views all roles
- [ ] **Journey 2:** HR Admin logs in → creates new employee → assigns department + role
- [ ] **Journey 3:** Employee logs in → views own profile → updates personal info
- [ ] **Journey 4:** Employee applies for casual leave → Manager approves → balance updates
- [ ] **Journey 5:** Employee submits expense claim → Manager approves → Finance approves
- [ ] **Journey 6:** Employee requests laptop → Manager approves → IT Admin approves
- [ ] **Journey 7:** HR initiates onboarding → Department Head approves → checklist generated
- [ ] **Journey 8:** Manager views team dashboard → sees team attendance + leave calendar
- [ ] **Journey 9:** PM creates project → allocates 3 employees → views resource heatmap
- [ ] **Journey 10:** Employee logs daily timesheet → submits weekly → PM approves
- [ ] **Journey 11:** HR creates performance review cycle → Manager submits reviews
- [ ] **Journey 12:** Recruiter creates job posting → adds candidate → moves through pipeline
- [ ] **Journey 13:** Employee views org chart → clicks on manager → sees profile
- [ ] **Journey 14:** Employee applies for training → views LMS catalog
- [ ] **Journey 15:** SuperAdmin changes employee role → employee sees updated UI on next login

- [ ] **Step 1: Execute each journey manually via Playwright browser**
- [ ] **Step 2: Screenshot any failures**
- [ ] **Step 3: Log results**

---

### Task F3: Sign-Off Checklist

- [ ] All E2E tests passing (target: >95% pass rate)
- [ ] All backend tests passing
- [ ] Approval engine wired for: Leave, Expense, Asset, Travel, Onboarding, Loan, Timesheet
- [ ] Auto-delegation working (approver unavailable → next higher)
- [ ] Project allocation + timesheet + PM approval working
- [ ] Over-allocation (>100%) requires and routes to manager approval
- [ ] 15 critical user journeys validated
- [ ] No P0 bugs open
- [ ] All P1 bugs fixed or documented with workarounds
- [ ] QA findings document complete

---

## Summary: Task Dependency Graph

```
Track A (Approval Wiring):     A1 → A2 → A3 → A4,A5,A6,A7,A8,A9 (parallel) → A10 → A11
Track B (Project Mgmt):        B1 → B2 → B3 (sequential)
Track C (Test Infra):          C1 → C2 (sequential)
Track D Phase 1 (CRUD/Smoke):  [depends on C2] → D1-D16c Phase 1 (all parallel)
Track D Phase 2 (Approvals):   [depends on C2 + Track A] → D1-D8 Phase 2 (all parallel)
Track E (Bug Fixes):           [depends on D findings] → E1 (reactive)
Track F (Final Validation):    [depends on A,B,D,E] → F1 → F2 → F3

Tracks A, B, C run in parallel from Day 1.
Track D Phase 1 starts after C completes (Day 2) — CRUD smoke tests, no approval dependency.
Track D Phase 2 starts after A completes (Day 3-4) — approval chain tests.
Track E starts after D produces findings (Day 3-4).
Track F runs at the end (Day 6-7).

Single agent recommended for Track A (A1-A11) to avoid merge conflicts on WorkflowService.java.
```
