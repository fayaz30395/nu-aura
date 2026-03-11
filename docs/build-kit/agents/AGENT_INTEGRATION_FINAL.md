# 🤖 Integration Session — Final Cleanup & Smoke Test
**Run this AFTER all 5 agents have finished.**
**Paste this entire prompt into a single Cursor Composer session.**

---

You are working on an existing production HRMS codebase.

- Frontend: `frontend/` — Next.js 14, TypeScript, Mantine UI, Tailwind
- Backend: `backend/` — Java Spring Boot monolith
- Key reference files: `CLAUDE.md`, `MEMORY.md`

5 parallel agents have just extended this codebase. Your job is to integrate, fix issues, and validate the final result.

---

## Your Tasks

### Task 1: TypeScript — Zero Errors
```bash
cd frontend && npx tsc --noEmit
```
Fix EVERY error. Do not suppress with `// @ts-ignore` unless absolutely unavoidable. Prefer proper type definitions.

### Task 2: Lint — Zero Errors
```bash
cd frontend && npm run lint
```
Fix all lint errors. Warnings are acceptable.

### Task 3: Smoke Test — 5 Critical User Flows
Open the browser at `http://localhost:3000` and manually test each flow. Fix any issue you encounter:

**Flow 1 — SuperAdmin Access**
1. Log in as a user with `SUPER_ADMIN` role.
2. Navigate to `/admin`. Confirm the page loads with all employees and the role management panel.
3. Navigate to `/payroll`, `/recruitment`, `/approvals`. Confirm no "Forbidden" or blank pages.

**Flow 2 — Leave Approval**
1. Log in as an employee. Apply for 2 days of leave.
2. Log in as their manager. Go to `/approvals`. Confirm the request appears.
3. Approve it. Confirm the leave balance decreases.
4. Confirm a notification appears in the employee's notification bell.

**Flow 3 — Payroll Run**
1. Log in as HR Admin. Go to `/payroll`. Click "Run Payroll" for current month.
2. Confirm payslips are generated (appear in the table below).
3. Click "Download PDF" on a payslip. Confirm the PDF opens/downloads correctly.

**Flow 4 — Recruitment ATS**
1. Log in as HR Admin. Go to `/recruitment`. Confirm the full dashboard loads (not blank).
2. Create a new Job Requisition. Confirm it appears in the table.
3. Go to Candidates tab. Confirm the pipeline/table renders.

**Flow 5 — Dashboard KPIs**
1. Log in as any user. Go to the main dashboard.
2. Confirm the KPI cards show real numbers pulled from the API (not hardcoded).
3. Confirm the notification bell shows a real count (or 0) — not "undefined" or a broken badge.

### Task 4: CORS Check
If any API call fails with a CORS error in the browser:
- Find the Spring Boot CORS configuration (usually in `WebMvcConfigurer` or `SecurityConfig`).
- Ensure `http://localhost:3000` is in the allowed origins.

### Task 5: Final Git Commit
Once all 5 flows pass:
```bash
cd /path/to/repo
git add .
git commit -m "feat: MVP completion - RBAC, recruitment ATS, approval inbox, dashboard KPIs, notifications"
```
