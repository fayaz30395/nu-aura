# 1-2 Day Parallel Claude Agent Plan (Codebase-Aligned)

## Codebase Reality Check

After scanning the repo, the system is already significantly built:

| Layer              | Tech                                                                                             | Status                                   |
|--------------------|--------------------------------------------------------------------------------------------------|------------------------------------------|
| **Frontend**       | Next.js 14, TypeScript, Mantine UI, Tailwind, React Query, Zustand, Axios, React Hook Form + Zod | 50+ pages scaffolded in `/frontend/app/` |
| **Backend**        | Spring Boot (Java), PostgreSQL, Redis                                                            | Full monolith in `/backend/src/`         |
| **Infrastructure** | Docker Compose, Kafka, Redis                                                                     | `docker-compose.yml` at root             |

> **Do NOT start from scratch.** The agents must extend the existing codebase. Each agent reads the
> current files in their domain first, then completes what is missing.

---

## Pre-Flight (You do this — 15 mins)

1. Identify which modules are most incomplete: run `ls frontend/app/` and
   `ls backend/src/main/java/` to get the current state.
2. Start the stack: `docker-compose up -d` from root, then `cd backend && ./start-backend.sh`, then
   `cd frontend && npm run dev`.
3. Confirm the app loads in the browser. Note any broken pages or 500 errors.
4. Open 5 Cursor/Claude sessions.

---

## Parallel Agent Tracks (All Launch Simultaneously)

---

### 🤖 Agent A — RBAC, SuperAdmin & Auth (3-4 hrs)

**Mission:** Ensure the JWT-based RBAC works end-to-end and the SuperAdmin role bypasses all
scoping.

**Prompt:**
> "You are working on the existing HRMS codebase in `/frontend` (Next.js 14, Mantine UI, Tailwind,
> Zustand) and `/backend` (Spring Boot + PostgreSQL).
>
> Step 1: Read `frontend/app/auth/`, `frontend/middleware.ts`, and `backend/src/main/java/` (find
> the Auth/Security filter chain classes). Understand the existing JWT flow.
>
> Step 2: The `SUPER_ADMIN` role must bypass ALL permission checks. In the Spring Security filter
> chain, add a condition: if the authenticated user's role contains `SUPER_ADMIN`, skip the RBAC
> annotation checks and proceed. In the Next.js middleware, ensure `SUPER_ADMIN` users can access
> ALL
> routes including `/admin/*`.
>
> Step 3: Build or complete the `/admin` frontend page (`frontend/app/admin/`). It must show all
> employees across all tenants, all active pending approvals, and a 'Manage Roles' section to
> assign/revoke roles from users.
>
> Step 4: Ensure all frontend sidebar links are conditionally rendered based on the `permissions[]`
> array in the Zustand auth store.
>
> Do not start from scratch. Extend the existing code."

---

### 🤖 Agent B — Employee Module (3-4 hrs)

**Mission:** Make the Employee module fully functional end-to-end (List, View, Create, Edit,
Terminate).

**Prompt:**
> "You are working on the existing HRMS codebase. Read `frontend/app/employees/` and find the
> corresponding backend Controller and Service classes in `backend/src/`.
>
> Step 1: Review the current state of `frontend/app/employees/`. Identify what is a placeholder/mock
> vs. what calls real APIs.
>
> Step 2: Find the backend `EmployeeController` REST endpoints. Complete any missing ones:
`GET /employees` (paginated), `POST /employees`, `PUT /employees/{id}`,
`PATCH /employees/{id}/status`.
>
> Step 3: Wire the frontend to the real backend API using the existing Axios client in
`frontend/lib/`. Replace all mock data with real React Query `useQuery` and `useMutation` hooks.
>
> Step 4: Ensure the 'Add Employee' and 'Edit Employee' forms use `react-hook-form` + `zod`
> validation with all required fields from the DB schema (Name, Email, Department, Designation, Bank
> Details).
>
> Extend existing code only. Do not rewrite what already works."

---

### 🤖 Agent C — Leave & Attendance (4-5 hrs)

**Mission:** Make the Leave and Attendance modules fully functional with real approval flows.

**Prompt:**
> "You are working on the existing HRMS codebase. Read `frontend/app/leave/`,
`frontend/app/attendance/`, and their backend counterparts.
>
> Step 1: Audit what is mocked vs. real. List what you find.
>
> Step 2 (Leave): Complete the backend Leave approval flow — when a manager POSTs to approve (
`/leaves/{id}/approve`), the service must: (a) update `leave_request` status, (b) deduct from
`leave_balance` in a DB transaction, (c) publish a Kafka event `leave.approved` if Kafka is set up.
> Wire the frontend approval UI (manager inbox) to this real endpoint.
>
> Step 3 (Attendance): Complete the web Check-In / Check-Out flow. The backend must record a
> timestamp to `punch_log`. The frontend `attendance` page must show the employee's current status (
> In / Out) and today's working hours in real time.
>
> Step 4: Wire the attendance summary into `frontend/app/dashboards/` home page KPI cards (Present
> Today count, Absent Today count).
>
> Extend existing code only."

---

### 🤖 Agent D — Payroll & Approvals (4-5 hrs)

**Mission:** Make payroll run-able and the generic approval inbox functional.

**Prompt:**
> "You are working on the existing HRMS codebase. Read `frontend/app/payroll/`, and the backend
> Payroll and Approval service classes.
>
> Step 1 (Approvals): Find the existing approval workflow tables and backend. Build or complete a
> unified `/dashboard/approvals` Inbox page in the frontend. It must list all pending approval tasks
> for the logged-in manager across ALL modules (Leave, Expense, Assets) using a single API endpoint.
> Each row must have 'Approve' and 'Reject' buttons with a comments field.
>
> Step 2 (Payroll): Complete the backend `PayrollService.runPayroll(month, year, tenantId)` method.
> It must fetch attendance data, calculate gross and net pay per employee, and insert into the
`payslip` table.
>
> Step 3: Complete the Payroll HR Admin UI — a 'Run Payroll' UI for the selected month, and a list
> of generated payslips below it. Each payslip row must link to a PDF download using the existing
`jspdf` library already in the project.
>
> Extend existing code only. Use the existing DB schema and Axios client."

---

### 🤖 Agent E — UI Polish, Missing Pages & Error States (2-3 hrs)

**Mission:** Fix rough edges so the app looks production-ready; complete any `page.tsx` placeholder
stubs.

**Prompt:**
> "You are working on the existing HRMS codebase in `frontend/`. Your job is to polish and complete
> the UI.
>
> Step 1: Run
`grep -r 'TODO\|placeholder\|mock data\|Coming Soon' frontend/app/ --include='*.tsx' -l` and list
> every file with incomplete content.
>
> Step 2: For each listed file, replace stub content with a proper page shell: correct heading, a
> Mantine `Skeleton` loading state, an empty state illustration (use a Tabler icon), and a
> placeholder
> table/card structure ready for real data wiring.
>
> Step 3: Ensure EVERY page that fetches data has a loading state (Mantine `Skeleton` or
`LoadingOverlay`) and an error state (Mantine `Alert` with error icon).
>
> Step 4: Verify the main dashboard (`frontend/app/dashboards/`) shows real KPI data using the
> existing React Query hooks. If KPI cards show hardcoded numbers, find the real backend endpoints
> and
> wire them up.
>
> Step 5: Ensure the `framer-motion` micro-animations are applied consistently on card enter and
> modal open transitions across the 5 most-used pages: Employees, Leave, Attendance, Payroll,
> Dashboard."

---

## Integration Session (Day 2 — 2-3 hrs, after agents finish)

**Prompt for one final Claude session:**
> "The HRMS codebase in `/frontend` (Next.js, Mantine, Tailwind) and `/backend` (Spring Boot) has
> just had 5 parallel agents extend it.
>
> Task 1: Run `cd frontend && npx tsc --noEmit` and fix ALL TypeScript errors.
> Task 2: Run `cd frontend && npm run lint` and fix errors (warnings are acceptable).
> Task 3: Test the 5 critical user flows manually in the browser and fix any broken pages:
>   - Employee Login → Dashboard KPI rendering
>   - Apply for Leave → Manager Approve → Balance deducts
>   - HR runs Payroll → Payslip PDF downloads correctly
>   - SuperAdmin logs in → Can see the `/admin` all-tenants view
>   - New Employee is created → Appears in the employee list table
      > Task 4: Fix any CORS issues between the frontend (`localhost:3000`) and backend (usually
      `localhost:8080`)."

---

## Timeline

| Phase                                      | Duration        |
|--------------------------------------------|-----------------|
| Pre-flight (stack running, tasks assigned) | 30 mins         |
| 5 agents run in parallel                   | 4-6 hours       |
| Integration, TypeScript fixes, smoke test  | 2-3 hours       |
| **Total**                                  | **~1 full day** |
