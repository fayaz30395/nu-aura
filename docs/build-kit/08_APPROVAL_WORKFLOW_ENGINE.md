# Approval Workflow Engine Architecture

The Approval Workflow Engine is a centralized, domain-agnostic macroservice designed to evaluate
conditions and route actionable requests (Instances) through a multi-tier chain of decision-makers (
Approvers).

By abstracting approval logic out of domain services (Leave, Expense, Requisition), the platform
achieves a unified "Manager Inbox" and single pane of glass for all pending actions.

## 1. Domain Entities & Database Schema

The system relies on four core tables to represent the static definitions and runtime trajectories
of a workflow.

### A. `approval_workflows`

The static blueprint for a business process.

- `id` (UUID)
- `tenant_id` (UUID)
- `entity_context` (VARCHAR) - e.g., 'LEAVE_REQUEST', 'EXPENSE_CLAIM'
- `name` (VARCHAR) - "Standard Employee Leave Approvals"
- `conditions_json` (JSONB) - e.g., `{"department": "Engineering"}`

### B. `approval_steps`

The ordered sequence of actions within a workflow definition.

- `id` (UUID)
- `workflow_id` (UUID) - FK to `approval_workflows`
- `step_sequence` (INTEGER) - 1, 2, 3...
- `approver_type` (VARCHAR) - Defines the resolution strategy: `REPORTING_MANAGER`, `SPECIFIC_USER`,
  `ROLE`, `DEPARTMENT_HEAD`.
- `approver_value` (VARCHAR) - e.g., the UUID of a specific user, or the code of a Role ('
  HR_ADMIN').

### C. `approval_instances`

The runtime execution context of a specific request.

- `id` (UUID)
- `workflow_id` (UUID) - Which blueprint is this running?
- `target_entity_id` (UUID) - ID of the original record (e.g., the Leave Request ID).
- `status` (VARCHAR) - `IN_PROGRESS`, `APPROVED`, `REJECTED`, `CANCELLED`.
- `current_step_sequence` (INTEGER) - Tracks progress through the chain.

### D. `approval_decisions` (or Tasks)

The specific granular tasks assigned to an actual human user.

- `id` (UUID)
- `instance_id` (UUID) - FK to `approval_instances`
- `assigned_to` (UUID) - Resolves the `approver_type` down to a specific user ID.
- `decision` (VARCHAR) - `PENDING`, `APPROVED`, `REJECTED`, `DELEGATED`.
- `comments` (TEXT) - Justification for the decision.
- `acted_at` (TIMESTAMP)

## 2. Dynamic Routing Core

When a domain service (e.g. Leave Service) needs an approval, it makes a synchronous gRPC/REST call
or emits a Kafka event to the Approval Engine.

The engine executes the following algorithm:

1. **Match Definition:** Queries `approval_workflows` matching the `entity_context` (Leaves) and
   evaluates `conditions_json` against the requester's context.
2. **Create Instance:** Generates a new `approval_instances` record marking
   `current_step_sequence = 1`.
3. **Resolve Approver:** Looks at `approval_steps` where `sequence = 1`.

- If `REPORTING_MANAGER`, it queries the Organization Service for the requester's direct manager.

4. **Create Task:** Inserts a row into `approval_decisions` assigned to the resolved user.
5. **Notify:** Emits an `approval.task.created` event, consumed by Notification Service to send
   emails/push notifications.

## 3. Advancing the Chain

When a manager logs in and approves a task via their Inbox:

1. Updates `approval_decisions.decision = 'APPROVED'`.
2. Engine checks if another step exists in `approval_steps` for
   `sequence = current_step_sequence + 1`.

- **If YES:** Increments `current_step_sequence` on the instance. Resolves the next approver (
  e.g., Step 2 = HR_ADMIN). Creates a new `approval_decisions` task for Step 2.
- **If NO:** The chain is complete. Updates `approval_instances.status = 'APPROVED'`. Emits
  `approval.instance.approved` Kafka event. The domain service consumes this event and commits the
  actual domain logic (e.g., deducts the leave balance).

## 4. Complexities & Edge Cases

- **Rejection Short-Circuit:** If any step rejects, the entire `approval_instances` is immediately
  moved to `REJECTED` and the original requester is notified. Subsequent steps are aborted.
- **Auto-Approval Configurations:** Some workflows have a `MAX_AMOUNT` threshold condition.
  Example: "Expense Claims < $50 require no approval." The engine immediately moves the instance to
  APPROVED.
- **Delegation (Out of Office):** Approvers can configure a delegation mapping in their profile (
  `Delegate ALL tasks to user Y between Date A and Date B`). The resolver automatically re-assigns
  tasks.
- **Parallel Approvals:** `approval_steps` with the same `step_sequence` are executed concurrently.
  Rule evaluated: "Require All" vs "Require Any".

## 5. Typical SaaS Workflows Modeled

**Workflow A: Leave Request (Hierarchical)**

```text
Step 1: REPORTING_MANAGER (Line Manager evaluates team bandwidth)
Step 2: HR_ADMIN (Evaluates policy compliance, final stamp)
```

**Workflow B: Expense Reimbursement (Role-Based)**

```text
Step 1: REPORTING_MANAGER (Verifies business necessity)
Step 2: PROJECT_MANAGER (Evaluates against project budget allocation)
Step 3: FINANCE_ADMIN (Verifies receipts and okays payout)
```
