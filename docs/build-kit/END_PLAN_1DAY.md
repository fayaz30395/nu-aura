# 1-Day Completion Plan
**Goal:** Close all critical gaps and ship a production-ready internal MVP by end of day.
**Date:** March 10, 2026 | **Stack:** Next.js 14 + Spring Boot + PostgreSQL

---

## Hour-by-Hour Schedule

### 🕗 Hour 0 (30 mins) — You, Before Agents Start
**Actions:**
1. `docker-compose up -d` → confirm Postgres, Redis, Kafka are green.
2. `cd backend && ./start-backend.sh` → confirm backend starts at `:8080`.
3. `cd frontend && npm run dev` → confirm app loads at `:3000`.
4. Open 5 Cursor windows (one per agent).

---

### 🕗 Hours 1–5 — All 5 Agents Run in Parallel

---

#### 🤖 Agent A — RBAC Hardening + SuperAdmin (3 hrs)
**Priority: CRITICAL**

Paste this prompt into Cursor Composer:
> "Read `CLAUDE.md`, `MEMORY.md`, and `docs/build-kit/04_RBAC_PERMISSION_MATRIX.md`.
>
> 1. In Spring Security, add a global bypass: if the authenticated user's granted authorities contain `ROLE_SUPER_ADMIN`, return `true` immediately before any `@PreAuthorize` evaluation.
> 2. In `frontend/middleware.ts`, add: if `user.role === 'SUPER_ADMIN'`, call `NextResponse.next()` immediately, bypassing all route guards.
> 3. Build or complete `frontend/app/admin/page.tsx`. It must show: all employees across all tenants (table), all pending approvals (count card), and a role management panel (assign/revoke roles from users).
> 4. In the frontend sidebar, ensure every nav link is hidden if the user lacks the required permission from their Zustand `permissions[]` array.
> 5. Run `npx tsc --noEmit` and fix any TypeScript errors in the files you touched."

---

#### 🤖 Agent B — Recruitment ATS (4 hrs)
**Priority: CRITICAL** — current `page.tsx` is 481 bytes (empty)

> "Read `CLAUDE.md`, `MEMORY.md`, and `docs/build-kit/02_MODULE_ARCHITECTURE.md §2`.
>
> The `frontend/app/recruitment/` directory has empty pages. Build the full Recruitment module:
> 1. `page.tsx` — Dashboard showing: Open Roles count, Total Candidates, Interviews Today cards. A TanStack Table of active job requisitions with columns: Title, Department, Stage, Applicants count.
> 2. `jobs/page.tsx` — Create Job Posting form (react-hook-form + zod): Title, Department dropdown, Description textarea, is_published toggle.
> 3. `candidates/page.tsx` — Kanban-style pipeline (or table) showing candidates by stage: Applied → Screening → Interview → Offered → Hired.
> 4. `interviews/page.tsx` — Scheduled interviews list with status (Pending / Completed / Cancelled) and an Add Interview modal.
> 5. Wire all pages to real backend Spring Boot endpoints under `/api/v1/recruitment/`. Create the endpoints if they don't exist.
> 6. Run `npx tsc --noEmit` in frontend and fix your errors."

---

#### 🤖 Agent C — Unified Approval Inbox (3 hrs)
**Priority: CRITICAL** — does not exist yet

> "Read `CLAUDE.md`, `MEMORY.md`, and `docs/build-kit/08_APPROVAL_WORKFLOW_ENGINE.md`.
>
> A manager currently has no single place to see all pending approval requests. Build this:
> 1. Create `frontend/app/approvals/page.tsx` — A TanStack Table listing ALL pending `approval_task` records assigned to the logged-in user, across all modules (Leave, Expense, Recruitment Requisitions, Assets). Columns: Type (badge), Requester, Submitted Date, Details, Actions.
> 2. Each row has 'Approve' and 'Reject' buttons. Reject opens a comments modal.
> 3. The 'Details' column shows context: for a Leave request, show dates + leave type. For Expense, show amount + category.
> 4. Wire to the backend `GET /api/v1/approvals/inbox` and `POST /api/v1/approvals/tasks/{id}/decide` endpoints. Create them in Spring Boot if missing.
> 5. Add the Approval Inbox count as a badge on the sidebar nav link (real-time count using React Query with a 30s refetch interval).
> 6. Run `npx tsc --noEmit` and fix your errors."

---

#### 🤖 Agent D — Real API Wiring + Notifications (4 hrs)
**Priority: HIGH**

> "Read `CLAUDE.md`, `MEMORY.md`, and `docs/build-kit/10_EVENT_DRIVEN_ARCHITECTURE.md`.
>
> Task 1 — API Wiring: Check `frontend/app/dashboards/page.tsx`. Find any hardcoded numbers (headcount, payroll totals, attendance counts). Replace them with real React Query `useQuery` hooks calling the backend. The backend must expose a `GET /api/v1/analytics/summary` endpoint returning these KPIs.
>
> Task 2 — Notification Bell: Find `frontend/components/` header/navbar component. The notification bell must:
> - Call `GET /api/v1/notifications/inbox` on mount (React Query, 30s refetch).
> - Show an unread count badge.
> - Open a Mantine `Popover` listing the last 10 notifications with timestamps.
> - Have a 'Mark all as read' button calling `PUT /api/v1/notifications/read-all`.
> 
> Task 3 — On the backend, ensure the `NotificationService` Kafka consumer creates a `notification_log` record when it receives `leave.requested`, `expense.submitted`, and `approval.task.assigned` events.
>
> Run `npx tsc --noEmit` and fix your errors."

---

#### 🤖 Agent E — UI Polish + Error & Loading States (2 hrs)
**Priority: MEDIUM**

> "Read `CLAUDE.md` and `docs/build-kit/13_ENTERPRISE_UI_SYSTEM.md`.
>
> 1. Find every `page.tsx` file in `frontend/app/` that does NOT have a `loading.tsx` sibling. Create a `loading.tsx` for each using Mantine `Skeleton` components matching the page layout.
> 2. Find every React Query `useQuery` call that does NOT handle `isError`. Add a Mantine `Alert` with a descriptive error message and a 'Retry' button for each.
> 3. Find every table or list that could be empty. Add a proper empty state: a Tabler icon, a heading ('No employees yet'), and a primary action button ('Add Employee').
> 4. Apply `framer-motion` `AnimatePresence` + `motion.div` fade-in on the 5 most-visited pages: Dashboard, Employees, Leave, Attendance, Payroll."

---

### 🕔 Hours 6–8 — Integration & Testing (One Final Session)

After all agents finish, open one last Claude session:

> "The HRMS codebase just had 5 parallel agents working on it. Help me close it out:
> 1. Run `cd frontend && npx tsc --noEmit`. Fix ALL remaining TypeScript errors.
> 2. Run `cd frontend && npm run lint`. Fix errors (warnings OK).
> 3. Test these 5 flows in the browser and fix any failures:
>    - Login as SuperAdmin → `/admin` page loads with all employees
>    - Employee applies for leave → shows in manager's Approval Inbox → Manager approves → balance decreases
>    - HR runs payroll for current month → payslips appear → PDF downloads
>    - Go to `/recruitment` → full ATS page loads, not blank
>    - Notification bell shows real unread count, not '0' forever
> 4. Commit all changes to git with message: `feat: MVP completion - RBAC, recruitment, approval inbox, notifications`"

---

## End of Day Checklist
- [ ] SuperAdmin can access all pages with no permission errors
- [ ] Recruitment ATS is fully functional
- [ ] Approval Inbox aggregates all pending requests
- [ ] Dashboard shows real, live KPI numbers
- [ ] Notification bell shows real alerts
- [ ] No TypeScript errors (`tsc --noEmit` exits clean)
- [ ] All 5 critical user flows pass manual smoke test
