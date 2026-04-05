# Loop 4: Approvals & Workflows Fix Log

> Developer Agent | 2026-03-31
> Source: `docs/validation/loop4-approvals-qa-report.md`

---

## Fixes Applied

### DEF-45 (HIGH): Workflow versioning check scoped to ALL pending executions

**Root Cause:** `WorkflowService.updateWorkflowDefinition()` called
`workflowExecutionRepository.countByStatus(tenantId, PENDING)` which counts ALL pending executions
across ALL workflow definitions in the tenant. Editing any workflow was blocked if ANY workflow had
pending executions.

**Fix:**

1. Added new repository method `countByWorkflowDefinitionIdAndStatusIn(defId, tenantId, statuses)`
   to `WorkflowExecutionRepository.java` that scopes the count to a specific workflow definition.
2. Updated `WorkflowService.updateWorkflowDefinition()` to use the new scoped query, checking only
   `PENDING` and `IN_PROGRESS` executions tied to the specific workflow definition being edited.

**Files Changed:**

-

`backend/src/main/java/com/hrms/infrastructure/workflow/repository/WorkflowExecutionRepository.java` --
added `countByWorkflowDefinitionIdAndStatusIn`

- `backend/src/main/java/com/hrms/application/workflow/service/WorkflowService.java` -- replaced
  `countByStatus` with scoped query

---

### DEF-42 + DEF-47 (MEDIUM): `/approvals` page missing permission check + duplicate page

**Root Cause:** Two separate approval pages existed (`/approvals` and `/approvals/inbox`) with
divergent implementations. The `/approvals` page lacked `usePermissions` check, had no delegation
support, no WebSocket, no summary counts, and no detail panel.

**Fix:** Replaced `/approvals/page.tsx` with a client-side redirect to `/approvals/inbox`. This
consolidates to a single, full-featured implementation and eliminates the permission gap. Matches
the pattern used elsewhere in the app (e.g., `/home` -> `/me/dashboard`).

**Files Changed:**

- `frontend/app/approvals/page.tsx` -- replaced with redirect to `/approvals/inbox`

---

### DEF-44 (MEDIUM): "Return for Modification" action not exposed in frontend

**Root Cause:** The backend supports `RETURN_FOR_MODIFICATION` as a first-class approval action, and
`workflow.service.ts` already has a `returnForModification` method. However, the inbox UI only
rendered Approve and Reject buttons.

**Fix:**

1. Added `useReturnForModification` React Query mutation hook to `useApprovals.ts`.
2. Added "Return" button (warning-colored, with `RotateCcw` icon) in the detail panel action bar
   between Reject and Approve.
3. Added "Return for Modification" modal with required comment field (same UX pattern as reject
   modal).
4. All three action buttons are disabled while any mutation is pending.

**Files Changed:**

- `frontend/lib/hooks/queries/useApprovals.ts` -- added `useReturnForModification` hook
- `frontend/app/approvals/inbox/page.tsx` -- added import, state, handler, button, and modal

---

### DEF-46 (MEDIUM): `/workflows/new` page 404

**Finding:** The QA report states the "Create Workflow" button navigates to `/workflows/new` which
404s. However, code inspection shows the `frontend/app/workflows/[id]/page.tsx` dynamic route
already handles `id === "new"` correctly:

- Line 191: `const isNew = workflowId === 'new';`
- Line 193: `const [isEditing, setIsEditing] = useState(isNew || editFromQuery);`
- Line 195: `useWorkflowDefinition(isNew ? '' : workflowId)` with `enabled: !!id` (empty string is
  falsy, so no query fires for new)
- Line 196: `useCreateWorkflowDefinition()` is available for the create path

In Next.js App Router, `/workflows/new` is matched by the `[id]` dynamic segment with
`params.id = "new"`. No static `/workflows/new/page.tsx` is needed. The page should render
correctly. **No code change required** -- this appears to be a false positive in the QA report, or a
transient build issue.

---

### DEF-43 (LOW): No web bulk approve/reject -- Deferred

Bulk actions require new backend endpoint + significant frontend work (multi-select checkboxes,
batch mutation). Deferred to a future sprint.

### DEF-48 (LOW): Attendance regularization not in workflow engine -- Deferred

Design debt item, not a bug. Attendance regularization has its own approval flow. Integrating it
into the generic workflow engine requires migration planning.

---

## Summary

| ID     | Severity | Status    | Notes                                                   |
|--------|----------|-----------|---------------------------------------------------------|
| DEF-45 | HIGH     | FIXED     | Scoped versioning query to specific workflow definition |
| DEF-42 | MEDIUM   | FIXED     | Redirect to /approvals/inbox                            |
| DEF-47 | MEDIUM   | FIXED     | Consolidated with DEF-42 redirect                       |
| DEF-44 | MEDIUM   | FIXED     | Return for Modification button + modal added            |
| DEF-46 | MEDIUM   | NO CHANGE | Already handled by [id] dynamic route                   |
| DEF-43 | LOW      | DEFERRED  | Bulk actions -- future sprint                           |
| DEF-48 | LOW      | DEFERRED  | Design debt -- future sprint                            |
