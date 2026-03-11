% 🤖 Agent C — Unified Approval Inbox
**Priority: HIGH | Est. Time: 4–5 hours**  
**Paste this entire prompt into a Cursor Composer session.**

---

You are working on an existing production HRMS codebase.

- Frontend: `frontend/` — Next.js 14 (App Router), TypeScript, Mantine UI, Tailwind, Zustand, React Query, Axios
- Backend: `backend/` — Java Spring Boot monolith, PostgreSQL, Kafka
- Approval engine is generic and data‑driven (`approval_service`), NOT hardcoded per workflow.

**Read these files first before writing any code:**
- `CLAUDE.md` — coding rules and locked‑in architecture
- `MEMORY.md` — architecture decisions and current module status
- `docs/build-kit/08_APPROVAL_WORKFLOW_ENGINE.md` — core approval engine concepts
- `docs/build-kit/04_RBAC_PERMISSION_MATRIX.md` — permissions for approval actions
- `backend/src/main/java/**/security/**` — how we resolve the authenticated user + tenant

---

## Objective

Build a **unified Approval Inbox** so an authenticated user can see and act on all pending approval tasks assigned to them (or to their role) across modules (leave, attendance, payroll, onboarding, etc.), with strict tenant isolation and RBAC enforcement.

---

## Domain Clarification (Do NOT change)

- The approval engine uses:
  - `workflow_def` → definition of a workflow (e.g., Leave Approval)
  - `workflow_step` → ordered steps with responsible role(s)/assignee logic
  - `approval_instance` → a concrete workflow execution for a specific business object (e.g., LeaveRequest#123)
  - `approval_task` → unit of work assigned to a user or role (what appears in the inbox)
- Tasks can be:
  - **Pending** (action required)
  - **Approved / Rejected** (terminal for that task)
  - **Skipped / Auto‑approved** (engine‑level)
- Every record must be **tenant‑scoped** by `tenant_id` with PostgreSQL RLS enforced (already decided in `CLAUDE.md`).

Do NOT introduce a second approval engine, and do NOT special‑case any one module inside the engine. You are only building the **inbox surface + APIs** against the generic model.

---

## Your Tasks

### Task 1 — Backend: Approval Inbox Query API

Create a backend REST endpoint under the approval module, e.g.:

- `GET /api/v1/approvals/inbox`

**Requirements:**
- Resolve the authenticated user and tenant using the existing Spring Security configuration (no custom auth layer).
- Query **pending** `approval_task` rows that:
  - belong to the current `tenant_id`
  - are either:
    - explicitly assigned to the current user (e.g., `assignee_user_id = currentUserId`), OR
    - assigned to any of the user’s roles (e.g., `assignee_role in userRoles`)
- Support filters via query params:
  - `status` (default `PENDING`, allow `ALL` for history view)
  - `module` (e.g., `leave`, `attendance`, `payroll`, `onboarding`)
  - `fromDate` / `toDate` (creation date range)
  - `search` (free‑text over human‑friendly fields like requester name, reference code)
- Support pagination:
  - `page` (1‑based), `size` (max 100)
  - Return a typed page object: `content[]`, `page`, `size`, `totalElements`, `totalPages`.
- Response item shape (JSON) MUST include at least:
  - `taskId`
  - `instanceId`
  - `module` (string)
  - `title` (short human‑readable summary)
  - `requesterName`
  - `requesterEmail`
  - `createdAt`
  - `dueAt` (nullable)
  - `currentStepName`
  - `status` (enum)

**Security & Constraints:**
- Enforce tenant isolation in the repository/service layer and rely on RLS where already configured.
- Enforce RBAC: user MUST have the corresponding approval permission for the module (e.g., `leave.approval`, `payroll.approval`) otherwise return empty result set, not an error.
- Do NOT expose internal engine tables/IDs directly that could leak cross‑tenant information—only return the minimal fields needed by the UI.

---

### Task 2 — Backend: Approve / Reject Endpoints

Add **command** endpoints under the same controller:

- `POST /api/v1/approvals/tasks/{taskId}/approve`
- `POST /api/v1/approvals/tasks/{taskId}/reject`

**Behavior:**
- Load the `approval_task` by `taskId` and ensure:
  - it belongs to the current tenant
  - it is still `PENDING`
  - the current user is authorized to act (assigned user or has matching role permission)
- For **approve**:
  - Mark the task as approved and advance the underlying `approval_instance` according to the engine rules (next step or complete).
  - Publish a domain event to Kafka (topic already defined in the approval engine doc or use the existing pattern), containing: `tenantId`, `module`, `instanceId`, `taskId`, `action = APPROVED`, `actorUserId`, `timestamp`.
- For **reject**:
  - Mark task as rejected, set rejection reason if provided (JSON body `{ reason: string }`).
  - Update the `approval_instance` to a rejected terminal state according to engine rules.
  - Publish the corresponding rejection event with `action = REJECTED`.

**Safety:**
- Wrap updates in a single DB transaction.
- Idempotency: if the same user calls approve/reject twice on an already‑terminal task, return HTTP 409 with a safe error payload; do NOT change state again.
- Audit logging: integrate with existing audit logging mechanism (if present) to log who took what action on which task and when.

---

### Task 3 — Frontend: Approval Inbox Page

Implement `frontend/app/approvals/inbox/page.tsx` as a **fully functional approval inbox**.

**UI Requirements (Mantine + Tailwind allowed):**
1. **Header & Filters**
   - Page title: “Approval Inbox”.
   - Filters row:
     - Status select (`Pending`, `All`).
     - Module multi‑select (values derived from API response or a static map).
     - Date range picker (from/to).
     - Text search input (debounced).
2. **Table of Tasks**
   - Use TanStack Table via existing table abstractions (if present) or Mantine table styled consistently with the rest of the app.
   - Columns: Module, Title, Requester, Created At, Due, Status, Actions.
   - Pagination controls (page size + next/prev).
   - Row click opens a right‑side **details drawer**.
3. **Task Details Drawer**
   - Shows all metadata from the API plus:
     - Any additional contextual fields exposed by the backend (if you extend the DTO carefully).
   - Two primary buttons:
     - **Approve**
     - **Reject** (opens rejection reason textarea + confirm)

**Data Fetching & State:**
- Use React Query hooks under `frontend/lib/approvals/` (e.g., `useApprovalInboxQuery`, `useApproveTaskMutation`, `useRejectTaskMutation`).
- Reuse the existing Axios client from `frontend/lib/` — do NOT create a new instance.
- Read the authenticated user (and their permissions) from the existing Zustand auth store.
- When approve/reject succeeds:
  - Optimistically update the table state OR invalidate/re‑fetch the inbox query.
  - Show success/error notifications using the app’s standard notification/toast pattern.

**Access Control (Frontend):**
- Users without any approval permission shall:
  - Be redirected away from `/approvals/inbox` to a safe default (e.g., dashboard), OR
  - See an “Access Denied” state following the design system.
- SuperAdmin must see **all** pending tasks across tenants only if the backend already supports cross‑tenant views for SuperAdmin; otherwise, keep them tenant‑scoped but let them act without per‑module permission checks (respect the SuperAdmin behavior from `AGENT_A_RBAC_SUPERADMIN.md` / security config).

---

### Task 4 — UX & Loading/Error States

Polish the page so it feels production‑ready.

- Loading:
  - Show skeletons or shimmer rows for the table while fetching.
- Empty state:
  - When there are **no pending tasks**, show a friendly empty state with icon and copy (“You’re all caught up – no pending approvals.”).
- Errors:
  - Handle network and API errors gracefully with a retry button.
  - If the inbox API returns 401/403, respect the existing auth flow (logout or redirect).

Follow the existing design language and Mantine theming used in other app pages.

---

### Task 5 — Tests & Verification

- **Backend**
  - Add unit tests for:
    - Inbox query service method (filters, tenant isolation, role/user assignment logic).
    - Approve/reject service methods (state transitions, idempotency, authorization failures).
- **Frontend**
  - Add at least one React Testing Library test that:
    - Mocks the inbox API.
    - Renders the `ApprovalInboxPage`.
    - Verifies that actions call the correct approve/reject mutations when buttons are clicked.

**Final checks (mandatory):**
- Run `cd backend && ./mvnw test` (or the repo’s documented test command) and ensure tests you added are green.
- Run `cd frontend && npx tsc --noEmit` and fix ALL TypeScript errors in files you touched.
- Do NOT touch files owned by other agents unless explicitly instructed:
  - `app/recruitment/`
  - `app/attendance/`
  - `app/leave/`
  - `app/payroll/`

# 🤖 Agent C — Unified Approval Inbox
**Priority: CRITICAL | Est. Time: 3 hours**
**Paste this entire prompt into a Cursor Composer session.**

---

You are working on an existing production HRMS codebase.

- Frontend: `frontend/` — Next.js 14, TypeScript, Mantine UI, Tailwind, Zustand, React Query, Axios
- Backend: `backend/` — Java Spring Boot monolith
- Key reference files: `CLAUDE.md`, `MEMORY.md`, `docs/build-kit/08_APPROVAL_WORKFLOW_ENGINE.md`

**Read these files first before writing any code:**
- `CLAUDE.md` — coding rules and stack
- `MEMORY.md` — architecture decisions
- `docs/build-kit/08_APPROVAL_WORKFLOW_ENGINE.md` — approval workflow schema
- `frontend/app/leave/approvals/` — existing leave approval UI (for reference pattern)
- `frontend/app/employees/page.tsx` — reference for Table + action button pattern

---

## Your Tasks

### Task 1: Unified Approval Inbox Page
Create `frontend/app/approvals/page.tsx`. This is the single manager inbox for ALL approval types.

**Header:** Page title "Approval Inbox" + a summary row: Pending (badge count), Approved Today, Rejected Today.

**Filter Tabs:** All | Leave | Expense | Recruitment | Asset (TanStack Table updates based on selected tab).

**Table Columns:**
- Type (Mantine `Badge` with color: Leave=blue, Expense=orange, Recruitment=purple, Asset=gray)
- Requester (employee name + avatar)
- Summary (context string, e.g., "Annual Leave: Jan 10 – Jan 15 (4 days)" or "Expense: $240 for Team Lunch")
- Submitted Date
- Actions: **Approve** button (green) | **Reject** button (red, opens comments modal)

**Reject Modal:** Mantine `Modal` with a comments `Textarea` (required). Submit calls reject endpoint.

### Task 2: Real-Time Badge on Sidebar
Find the sidebar nav component. The "Approvals" nav item must show a live badge with the current pending count. Use React Query with `refetchInterval: 30000` (30 seconds) to keep the count fresh.

### Task 3: Backend Endpoint
In the Spring Boot backend, find or create `ApprovalController.java`:

**GET `/api/v1/approvals/inbox`**
- Returns paginated list of `approval_task` records where `assigned_to = currentUserId` AND `status = PENDING`
- Each record must include: `id`, `entityType` (LEAVE/EXPENSE/ASSET), `requesterName`, `requesterAvatar`, `summary` (human-readable string), `submittedAt`

**POST `/api/v1/approvals/tasks/{id}/decide`**
- Body: `{ "decision": "APPROVED" | "REJECTED", "comments": "..." }`
- Updates `approval_task.status` and `approval_instance` state
- If APPROVED and it's the final step, emits `approval.decision.approved` Kafka event
- The originating domain service (Leave/Expense) must consume this event to commit the final state

### Task 4: Wire Frontend to Backend
Create `frontend/lib/hooks/useApprovals.ts` with:
- `useGetApprovalInbox(page, type)` — React Query useQuery
- `useDecideApproval()` — React Query useMutation, invalidates inbox cache on success

### Task 5: Verify
- Run `cd frontend && npx tsc --noEmit`. Fix ALL TypeScript errors in files you touched.
- Do NOT touch files in: `app/admin/`, `app/recruitment/`, `app/attendance/`, `app/payroll/`.
