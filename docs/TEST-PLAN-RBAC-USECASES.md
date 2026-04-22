# NU-AURA — Use Case Test Plan with RBAC Validation

> **Purpose:** Validate every critical workflow works end-to-end AND respects the RBAC hierarchy.
> **Method:** Claude in Chrome browser testing against `localhost:3000`
> **Roles under test:** Super Admin, HR Admin, HR Manager, Team Lead, Employee

---

## RBAC Hierarchy

```
Super Admin (100) → bypasses ALL permission checks
Tenant Admin (90) → full tenant control
HR Admin (85)     → all HR modules, no system admin
HR Manager (80)   → HR operations, team-scoped approvals
Team Lead (50)    → team view + approvals for direct reports
Employee (40)     → self-service only
```

---

## Test Execution Matrix

For each test case:

- **P** = Should have access (positive test)
- **N** = Should be denied / hidden (negative test)
- **S** = Self-only access (can see own data, not others')

---

## Module 1: Authentication & Dashboard

| #   | Test Case                                     | Super Admin | HR Admin | HR Manager | Team Lead | Employee |
|-----|-----------------------------------------------|:-----------:|:--------:|:----------:|:---------:|:--------:|
| 1.1 | Login via Google OAuth                        |      P      |    P     |     P      |     P     |    P     |
| 1.2 | Dashboard loads with role-appropriate widgets |      P      |    P     |     P      |     P     |    P     |
| 1.3 | Executive dashboard visible                   |      P      |    P     |     N      |     N     |    N     |
| 1.4 | HR Ops dashboard visible                      |      P      |    P     |     P      |     N     |    N     |
| 1.5 | Manager dashboard visible                     |      P      |    P     |     P      |     P     |    N     |
| 1.6 | App switcher shows all 4 apps                 |      P      |    P     |     P      |     P     |    P     |
| 1.7 | Admin menu visible in sidebar                 |      P      |    P     |     N      |     N     |    N     |

**Steps:**

1. Navigate to `/auth/login`
2. Complete Google OAuth
3. Verify redirect to `/dashboard`
4. Check sidebar sections render per role
5. Check dashboard widgets match role permissions

---

## Module 2: Employee Management

| #    | Test Case                           | Super Admin | HR Admin | HR Manager | Team Lead | Employee |
|------|-------------------------------------|:-----------:|:--------:|:----------:|:---------:|:--------:|
| 2.1  | View employee directory             |      P      |    P     |     P      | P (team)  |    S     |
| 2.2  | Create new employee                 |      P      |    P     |     N      |     N     |    N     |
| 2.3  | Edit employee profile               |      P      |    P     |  P (team)  |     N     |    N     |
| 2.4  | Delete/deactivate employee          |      P      |    P     |     N      |     N     |    N     |
| 2.5  | View own profile (My Space)         |      P      |    P     |     P      |     P     |    P     |
| 2.6  | Edit own profile fields             |      P      |    P     |     P      |     P     |    P     |
| 2.7  | View employee bank details          |      P      |    P     |     N      |     N     |    N     |
| 2.8  | Bulk import employees               |      P      |    P     |     N      |     N     |    N     |
| 2.9  | View org chart                      |      P      |    P     |     P      |     P     |    P     |
| 2.10 | Employment change request — create  |      P      |    P     |     P      |     N     |    N     |
| 2.11 | Employment change request — approve |      P      |    P     |     N      |     N     |    N     |

**Steps:**

1. Navigate to `/employees`
2. Verify list shows correct scope (all/department/team/self)
3. Check "Add Employee" button visibility
4. Click into profile → verify edit permissions
5. Navigate to `/org-chart` → verify renders
6. Navigate to `/me/profile` → verify self-edit works for all roles

---

## Module 3: Attendance & Time Tracking

| #    | Test Case                          | Super Admin | HR Admin | HR Manager | Team Lead | Employee |
|------|------------------------------------|:-----------:|:--------:|:----------:|:---------:|:--------:|
| 3.1  | Mark own attendance (check-in/out) |      P      |    P     |     P      |     P     |    P     |
| 3.2  | View own attendance                |      P      |    P     |     P      |     P     |    P     |
| 3.3  | View team attendance               |      P      |    P     |     P      |     P     |    N     |
| 3.4  | View all attendance                |      P      |    P     |     N      |     N     |    N     |
| 3.5  | Submit regularization request      |      P      |    P     |     P      |     P     |    P     |
| 3.6  | Approve regularization             |      P      |    P     |     P      |     P     |    N     |
| 3.7  | Manage biometric devices           |      P      |    P     |     N      |     N     |    N     |
| 3.8  | Manage shift definitions           |      P      |    P     |     N      |     N     |    N     |
| 3.9  | View shift schedule                |      P      |    P     |     P      |     P     |    P     |
| 3.10 | Request shift swap                 |      P      |    P     |     P      |     P     |    P     |
| 3.11 | Approve shift swap                 |      P      |    P     |     P      |     P     |    N     |
| 3.12 | Apply comp-off                     |      P      |    P     |     P      |     P     |    P     |

**Steps:**

1. Navigate to `/attendance` → click Check In
2. Navigate to `/attendance/my-attendance` → verify own records
3. Navigate to `/attendance/team` → verify team-scoped data (Employee: blocked/empty)
4. Navigate to `/attendance/regularization` → submit request
5. Switch to Team Lead role → approve the regularization
6. Navigate to `/shifts` → verify definitions tab hidden for Employee

---

## Module 4: Leave Management

| #    | Test Case                      | Super Admin | HR Admin | HR Manager | Team Lead | Employee |
|------|--------------------------------|:-----------:|:--------:|:----------:|:---------:|:--------:|
| 4.1  | Apply for leave                |      P      |    P     |     P      |     P     |    P     |
| 4.2  | View own leave balance         |      P      |    P     |     P      |     P     |    P     |
| 4.3  | View own leave history         |      P      |    P     |     P      |     P     |    P     |
| 4.4  | Cancel own pending leave       |      P      |    P     |     P      |     P     |    P     |
| 4.5  | Approve/reject team leave      |      P      |    P     |     P      |     P     |    N     |
| 4.6  | View all leave requests        |      P      |    P     |     N      |     N     |    N     |
| 4.7  | View leave calendar            |      P      |    P     |     P      |     P     |    P     |
| 4.8  | Manage leave types             |      P      |    P     |     N      |     N     |    N     |
| 4.9  | Manage leave balances (adjust) |      P      |    P     |     N      |     N     |    N     |
| 4.10 | Leave encashment request       |      P      |    P     |     P      |     P     |    P     |
| 4.11 | Process carry-forward          |      P      |    P     |     N      |     N     |    N     |

**Steps:**

1. As Employee: `/leave/apply` → select type, dates → submit
2. Verify appears in `/leave/my-leaves`
3. Switch to Team Lead: `/leave/approvals` → approve the request
4. Switch back to Employee: verify balance deducted in `/leave`
5. As Employee: verify "Leave Types" admin section not visible
6. As HR Admin: verify `/leave/admin/carry-forward` accessible

---

## Module 5: Payroll

| #    | Test Case                    | Super Admin | HR Admin | HR Manager | Team Lead | Employee |
|------|------------------------------|:-----------:|:--------:|:----------:|:---------:|:--------:|
| 5.1  | View payroll hub             |      P      |    P     |     N      |     N     |    N     |
| 5.2  | View salary structures       |      P      |    P     |     N      |     N     |    N     |
| 5.3  | Create/edit salary structure |      P      |    P     |     N      |     N     |    N     |
| 5.4  | Initiate payroll run         |      P      |    P     |     N      |     N     |    N     |
| 5.5  | Approve payroll run          |      P      |    P     |     N      |     N     |    N     |
| 5.6  | View own payslip             |      P      |    P     |     P      |     P     |    P     |
| 5.7  | View all payslips            |      P      |    P     |     N      |     N     |    N     |
| 5.8  | Manage payroll components    |      P      |    P     |     N      |     N     |    N     |
| 5.9  | Statutory compliance view    |      P      |    P     |     N      |     N     |    N     |
| 5.10 | Bulk payroll processing      |      P      |    P     |     N      |     N     |    N     |

**Steps:**

1. As Employee: navigate to `/payroll` → should be blocked or show only "My Payslips"
2. Navigate to `/me/profile` → payslip section → verify own payslip visible
3. As HR Admin: `/payroll/structures` → verify CRUD works
4. As HR Admin: `/payroll/runs` → initiate test run
5. As Super Admin: approve payroll run
6. As Employee: verify payslip appeared

---

## Module 6: Expense Management

| #   | Test Case                 | Super Admin | HR Admin | HR Manager | Team Lead | Employee |
|-----|---------------------------|:-----------:|:--------:|:----------:|:---------:|:--------:|
| 6.1 | Submit expense claim      |      P      |    P     |     P      |     P     |    P     |
| 6.2 | View own expenses         |      P      |    P     |     P      |     P     |    P     |
| 6.3 | Approve team expenses     |      P      |    P     |     P      |     P     |    N     |
| 6.4 | View all expenses         |      P      |    P     |     N      |     N     |    N     |
| 6.5 | Manage expense categories |      P      |    P     |     N      |     N     |    N     |
| 6.6 | Manage expense policies   |      P      |    P     |     N      |     N     |    N     |
| 6.7 | Submit mileage claim      |      P      |    P     |     P      |     P     |    P     |
| 6.8 | View expense reports      |      P      |    P     |     P      |     N     |    N     |
| 6.9 | Request expense advance   |      P      |    P     |     P      |     P     |    P     |

**Steps:**

1. As Employee: `/expenses` → create claim → attach receipt → submit
2. Verify claim in expense list with "Pending" status
3. Switch to Team Lead: `/expenses/approvals` → approve
4. As Employee: verify "Expense Settings" link not visible
5. As HR Admin: `/expenses/settings` → verify policy management accessible

---

## Module 7: Recruitment (NU-Hire)

| #   | Test Case                            | Super Admin | HR Admin | HR Manager | Team Lead | Employee |
|-----|--------------------------------------|:-----------:|:--------:|:----------:|:---------:|:--------:|
| 7.1 | View recruitment dashboard           |      P      |    P     |     P      | P (team)  |    N     |
| 7.2 | Create job opening                   |      P      |    P     |     P      |     N     |    N     |
| 7.3 | View candidates                      |      P      |    P     |     P      |     P     |    N     |
| 7.4 | Evaluate candidate (scorecard)       |      P      |    P     |     P      |     P     |    N     |
| 7.5 | Manage recruitment pipeline (Kanban) |      P      |    P     |     P      |     N     |    N     |
| 7.6 | View/manage agencies                 |      P      |    P     |     N      |     N     |    N     |
| 7.7 | View career page settings            |      P      |    P     |     N      |     N     |    N     |
| 7.8 | Submit employee referral             |      P      |    P     |     P      |     P     |    P     |
| 7.9 | View referral status                 |      P      |    P     |     P      |     P     |    P     |

**Steps:**

1. As Employee: `/recruitment` → should be blocked
2. As Employee: `/referrals` → should work (self-service)
3. As Team Lead: `/recruitment` → can view team jobs, evaluate candidates
4. As HR Admin: `/recruitment/jobs` → create job → add to pipeline
5. As HR Admin: `/recruitment/agencies` → verify CRUD

---

## Module 8: Onboarding / Offboarding

| #   | Test Case                          | Super Admin | HR Admin | HR Manager | Team Lead | Employee |
|-----|------------------------------------|:-----------:|:--------:|:----------:|:---------:|:--------:|
| 8.1 | View onboarding dashboard          |      P      |    P     |     P      |     N     |    N     |
| 8.2 | Create onboarding template         |      P      |    P     |     N      |     N     |    N     |
| 8.3 | Initiate onboarding for new hire   |      P      |    P     |     P      |     N     |    N     |
| 8.4 | Complete preboarding (as new hire) |      P      |    P     |     P      |     P     |    P     |
| 8.5 | Initiate exit process              |      P      |    P     |     P      |     N     |    N     |
| 8.6 | Manage F&F settlement              |      P      |    P     |     N      |     N     |    N     |
| 8.7 | Approve F&F settlement             |      P      |    P     |     N      |     N     |    N     |
| 8.8 | Process F&F payment                |      P      |    P     |     N      |     N     |    N     |
| 8.9 | View exit interview                |      P      |    P     |     P      |     N     |    N     |

**Steps:**

1. As HR Admin: `/onboarding` → create template → initiate for test employee
2. As new hire: `/preboarding/portal/[token]` → complete form
3. As HR Admin: `/offboarding` → initiate exit
4. As HR Admin: `/offboarding/[id]/fnf` → fill settlement → submit → approve → pay

---

## Module 9: Performance (NU-Grow)

| #    | Test Case                   | Super Admin | HR Admin | HR Manager | Team Lead | Employee |
|------|-----------------------------|:-----------:|:--------:|:----------:|:---------:|:--------:|
| 9.1  | View performance dashboard  |      P      |    P     |     P      |     P     |    P     |
| 9.2  | Create review cycle         |      P      |    P     |     N      |     N     |    N     |
| 9.3  | Submit self-review          |      P      |    P     |     P      |     P     |    P     |
| 9.4  | Submit manager review       |      P      |    P     |     P      |     P     |    N     |
| 9.5  | Approve review              |      P      |    P     |     P      |     N     |    N     |
| 9.6  | Create OKR                  |      P      |    P     |     P      |     P     |    P     |
| 9.7  | View all OKRs               |      P      |    P     |     N      |     N     |    N     |
| 9.8  | Create 360 feedback cycle   |      P      |    P     |     P      |     N     |    N     |
| 9.9  | Submit 360 feedback         |      P      |    P     |     P      |     P     |    P     |
| 9.10 | View competency matrix      |      P      |    P     |     P      |     P     |    N     |
| 9.11 | Create PIP                  |      P      |    P     |     P      |     N     |    N     |
| 9.12 | Manage calibration sessions |      P      |    P     |     N      |     N     |    N     |

**Steps:**

1. As Employee: `/performance` → see own reviews + goals
2. As Employee: `/performance/okr` → create personal OKR
3. As Team Lead: submit manager review for direct report
4. As HR Admin: create review cycle → verify shows for all
5. As Employee: verify cannot access `/performance/calibration`

---

## Module 10: Knowledge Management (NU-Fluence)

| #     | Test Case                | Super Admin | HR Admin | HR Manager | Team Lead | Employee |
|-------|--------------------------|:-----------:|:--------:|:----------:|:---------:|:--------:|
| 10.1  | View wiki pages          |      P      |    P     |     P      |     P     |    P     |
| 10.2  | Create wiki page         |      P      |    P     |     P      |     P     |    P     |
| 10.3  | Edit wiki page           |      P      |    P     |     P      |     P     |    P     |
| 10.4  | Delete wiki page         |      P      |    P     |     P      |     N     |    N     |
| 10.5  | Create/manage spaces     |      P      |    P     |     P      |     P     |    N     |
| 10.6  | Manage space permissions |      P      |    P     |     P      |     N     |    N     |
| 10.7  | View/create blogs        |      P      |    P     |     P      |     P     |    P     |
| 10.8  | Publish blog             |      P      |    P     |     P      |     N     |    N     |
| 10.9  | View/create templates    |      P      |    P     |     P      |     P     |    P     |
| 10.10 | Use AI chat              |      P      |    P     |     P      |     P     |    P     |
| 10.11 | Export page (PDF/DOCX)   |      P      |    P     |     P      |     P     |    P     |
| 10.12 | View analytics           |      P      |    P     |     P      |     N     |    N     |
| 10.13 | Post to wall             |      P      |    P     |     P      |     P     |    P     |
| 10.14 | Search across content    |      P      |    P     |     P      |     P     |    P     |
| 10.15 | Add inline comment       |      P      |    P     |     P      |     P     |    P     |

**Steps:**

1. As Employee: `/fluence/wiki` → create page → edit with Tiptap → save
2. Verify page appears in search at `/fluence/search`
3. Add comment on the page → verify comment renders
4. As Employee: verify "Delete" button hidden
5. As HR Manager: create space → set permissions → verify access control
6. As Employee: `/fluence/analytics` → should be blocked

---

## Module 11: Administration & System

| #     | Test Case               | Super Admin | HR Admin | HR Manager | Team Lead | Employee |
|-------|-------------------------|:-----------:|:--------:|:----------:|:---------:|:--------:|
| 11.1  | Access admin panel      |      P      |    P     |     N      |     N     |    N     |
| 11.2  | Manage roles            |      P      |    N     |     N      |     N     |    N     |
| 11.3  | Manage permissions      |      P      |    N     |     N      |     N     |    N     |
| 11.4  | View audit logs         |      P      |    P     |     N      |     N     |    N     |
| 11.5  | Manage departments      |      P      |    P     |     N      |     N     |    N     |
| 11.6  | Manage holidays         |      P      |    P     |     N      |     N     |    N     |
| 11.7  | Manage office locations |      P      |    P     |     N      |     N     |    N     |
| 11.8  | Import data (KEKA)      |      P      |    P     |     N      |     N     |    N     |
| 11.9  | Manage workflows        |      P      |    P     |     N      |     N     |    N     |
| 11.10 | Manage announcements    |      P      |    P     |     P      |     N     |    N     |
| 11.11 | Manage letter templates |      P      |    P     |     N      |     N     |    N     |
| 11.12 | System settings         |      P      |    N     |     N      |     N     |    N     |

**Steps:**

1. As Employee: navigate to `/admin` → should redirect away
2. As HR Admin: `/admin` → verify modules visible
3. As Super Admin: `/admin/roles` → verify role management
4. As HR Admin: verify "Roles" and "Permissions" tabs not accessible

---

## Module 12: Self-Service (My Space)

| #     | Test Case                 | All Roles |
|-------|---------------------------|:---------:|
| 12.1  | View my profile           |     P     |
| 12.2  | Update profile photo      |     P     |
| 12.3  | View my attendance        |     P     |
| 12.4  | View my leaves & balances |     P     |
| 12.5  | View my payslips          |     P     |
| 12.6  | View my letters           |     P     |
| 12.7  | Submit helpdesk ticket    |     P     |
| 12.8  | View approvals inbox      |     P     |
| 12.9  | View notifications        |     P     |
| 12.10 | Request document          |     P     |

**Steps:**

1. As any role: `/me/profile` → verify own data loads
2. `/me/attendance` → verify own attendance
3. `/me/leaves` → verify own balance
4. `/me/dashboard` → verify personal dashboard
5. `/approvals/inbox` → verify only assigned approvals show

> **Note:** My Space items must NEVER have `requiredPermission` — all employees access these.

---

## Module 13: Cross-Cutting Concerns

| #    | Test Case                                  | Validation                              |
|------|--------------------------------------------|-----------------------------------------|
| 13.1 | Sidebar hides sections user cannot access  | Verify per role                         |
| 13.2 | Direct URL to unauthorized page → redirect | Navigate to `/admin` as Employee        |
| 13.3 | API returns 403 for unauthorized actions   | Check console for 403s                  |
| 13.4 | SuperAdmin bypasses all checks             | Verify every page accessible            |
| 13.5 | Notifications only for relevant events     | Leave approval → only approver notified |
| 13.6 | Approval inbox scoped to role              | Team Lead sees only team approvals      |
| 13.7 | Dark mode renders correctly                | Toggle theme → verify all pages         |
| 13.8 | Search respects permissions                | Employee search → no admin results      |

---

## Execution Order (Chrome Testing)

```
Phase 1: Happy Path (Super Admin)         ~ 30 min
  Run tests 1-12 as Super Admin — everything should pass.
  This validates all pages render and forms work.

Phase 2: Employee Restrictions             ~ 20 min
  Switch to Employee role. Run all tests.
  Verify every "N" in the matrix is actually blocked.

Phase 3: Team Lead Scoping                 ~ 15 min
  Switch to Team Lead. Run approval & team-view tests.
  Verify team-scoped data only shows direct reports.

Phase 4: HR Manager Flow                   ~ 15 min
  Switch to HR Manager. Run HR operations tests.
  Verify can't access system admin.

Phase 5: Cross-Role Workflows              ~ 20 min
  Employee applies leave → Team Lead approves → Employee sees updated balance
  Employee submits expense → HR Manager approves
  HR Admin creates job → Team Lead evaluates candidate
```

---

**Total: 130+ test cases across 13 modules, 5 roles.**

Ready to execute with Claude in Chrome when the app is running.
