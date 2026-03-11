# 🤖 Agent A — RBAC Hardening + SuperAdmin
**Priority: CRITICAL | Est. Time: 3 hours**
**Paste this entire prompt into a Cursor Composer session.**

---

You are working on an existing production HRMS codebase.

- Frontend: `frontend/` — Next.js 14, TypeScript, Mantine UI, Tailwind, Zustand, React Query, Axios
- Backend: `backend/` — Java Spring Boot monolith
- Key reference files: `CLAUDE.md`, `MEMORY.md`, `docs/build-kit/04_RBAC_PERMISSION_MATRIX.md`

**Read these files first before writing any code:**
- `CLAUDE.md` — coding rules and stack
- `MEMORY.md` — architecture decisions
- `frontend/middleware.ts` — existing route guard logic
- `frontend/app/admin/` — existing admin directory (may be empty/partial)

---

## Your Tasks

### Task 1: SuperAdmin Backend Bypass
In the Spring Security configuration (find the class extending `SecurityFilterChain` or `WebSecurityConfigurerAdapter` in `backend/src/`):
- Add a global check: if the authenticated user's granted authorities contain `ROLE_SUPER_ADMIN`, immediately return `true` from the permission evaluator without evaluating any `@PreAuthorize` annotation.
- This must apply globally. Do not add it per-controller.

### Task 2: SuperAdmin Frontend Bypass
In `frontend/middleware.ts`:
- After decoding the JWT and extracting the user role, add: if `user.role === 'SUPER_ADMIN'` OR `user.roles` includes `'SUPER_ADMIN'`, call `NextResponse.next()` immediately — skip all route protection checks.

### Task 3: Admin Dashboard Page
Build or complete `frontend/app/admin/page.tsx`. It must show:
1. **Stats row:** Total Tenants (card), Total Employees across all tenants (card), Pending Approvals (card).
2. **All Employees Table:** TanStack Table with columns: Name, Email, Tenant/Company, Department, Status, Role. Paginated. Searchable by name.
3. **Role Management Panel:** A section to search for a user by email and assign/revoke a role from a dropdown (`SUPER_ADMIN`, `TENANT_ADMIN`, `HR_ADMIN`, `EMPLOYEE`). This calls `PATCH /api/v1/admin/users/{id}/role`.

### Task 4: Permission-Driven Sidebar
In the main sidebar navigation component (find it in `frontend/components/` or `frontend/app/layout`):
- Read `permissions: string[]` from the Zustand auth store.
- Each sidebar item must have a required permission code (e.g., `payroll.cycle.read`).
- If the user's `permissions[]` does not include that code, hide the sidebar link entirely.
- SuperAdmin users (role === 'SUPER_ADMIN') must see ALL sidebar items.

### Task 5: Verify
- Run `cd frontend && npx tsc --noEmit`. Fix ALL TypeScript errors in files you touched.
- Do NOT touch files owned by other agents: `app/recruitment/`, `app/approvals/`, `app/attendance/`, `app/leave/`.
