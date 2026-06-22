# Pre-Implementation Gate — RBAC Impact Report

**Confirmation: this program changes PRESENTATION ONLY. No RBAC behavior changes are permitted.** Every gate below is preserved verbatim in any redesigned screen. Each redesigned component re-renders the exact same `PermissionGate` / `hasPermission` / `viewType` logic in the same positions.

## Per-screen RBAC inventory (to preserve)

### Employee Directory — `app/employees/directory/page.tsx`
- **Page gate:** `hasAnyPermission(EMPLOYEE_VIEW_ALL, EMPLOYEE_VIEW_TEAM)` → redirect `/dashboard` (l.134–139).
- Card-Grid redesign: same gate, same redirect. View toggle is pure UI state — no permission impact.

### Profile View — `app/employees/[id]/page.tsx`
- **View gate:** `VIEW_ALL | VIEW_DEPARTMENT | VIEW_TEAM` OR `isSelf` (l.202–209).
- **Conditional actions:** Edit `EMPLOYEE_UPDATE` (l.396), Delete `EMPLOYEE_DELETE` (l.406), Verify skill `EMPLOYEE_UPDATE` (l.660), Banking section `EMPLOYEE_BANK_READ` (l.787).
- `ProfileHero` redesign: Edit/Delete actions passed via `actions` slot **still wrapped in their `PermissionGate`s**; banking remains gated.

### Profile Edit — `app/employees/[id]/edit/page.tsx`
- **Gate:** `EMPLOYEE_UPDATE` → redirect `/employees` (l.84–87) + render-gate (l.288, blocks pre-populated PII).
- Employment changes still route through `employmentChangeRequestService.createChangeRequest` (HR-approval workflow). Hero adds photo+status display only — no gate change.

### Profile Compensation — `app/employees/[id]/compensation/page.tsx`
- **Page gate:** `COMPENSATION_VIEW | COMPENSATION_MANAGE | COMPENSATION_VIEW_ALL` → redirect `/employees/{id}` (l.271–281).
- ⚠️ **Pre-existing gap (NOT introduced, NOT fixed here):** "New Revision" button (l.366) + `handleCreateRevision` have **no permission gate** after page entry — a `COMPENSATION_VIEW`-only user can open the create form. **Out of scope for presentation-only work.** Logged as a separate security fix: the create action should require `COMPENSATION_MANAGE`. Owner decision required; tracked outside this redesign.

### Dashboard — `app/dashboard/page.tsx`
- **Page gate:** `DASHBOARD_VIEW` else redirect `/me/dashboard` (l.163).
- **Conditional render:** New Hire `EMPLOYEE_CREATE` (l.968); payroll-summary `viewType==='ADMIN'` (l.719); new-joiners `viewType!=='EMPLOYEE'` (l.894); onboarding btns `viewType==='ADMIN'` (l.910); dept-distribution `length>0` (l.685).
- Decomposition relocates these predicates into section builders **unchanged**; a role-matrix test asserts ADMIN/MANAGER/EMPLOYEE see identical widget sets pre/post.

### Admin list — `app/employees/page.tsx` (operator; untouched visually)
- Gates `EMPLOYEE_READ` (l.246), `EMPLOYEE_CREATE` (l.408/418), `EMPLOYEE_DELETE` (l.597) — unchanged.

## Verification per item
1. Existing RBAC test suite passes after each change.
2. For dashboard (F4) and ProfileHero (B1): explicit role-matrix check (SUPER_ADMIN / HR_ADMIN / RECRUITMENT_ADMIN / TEAM_LEAD / EMPLOYEE) — same gates fire, same elements show/hide.
3. No new `hasPermission`/`PermissionGate` removed, weakened, or added by redesign work (the one needed *addition* — compensation create gate — is explicitly deferred as a separate security task).

**Sign-off required before Epic B begins.**
