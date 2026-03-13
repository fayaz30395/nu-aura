# RBAC Validation Test Flows

## Test Users Setup

Create these test users with specific roles to validate the permission system end-to-end.

| # | User | Role | Email | Scope | Purpose |
|---|------|------|-------|-------|---------|
| 1 | Fayaz M | SUPER_ADMIN | fayaz@nulogic.io | Global | Full system access, bypasses all checks |
| 2 | Priya S | HR_ADMIN | priya@nulogic.io | Tenant-wide | HR operations, all employee data |
| 3 | Rahul K | MANAGER | rahul@nulogic.io | Team (Engineering) | Team-level access, approvals |
| 4 | Anita R | EMPLOYEE | anita@nulogic.io | Self only | Self-service features only |
| 5 | Deepak M | FINANCE_ADMIN | deepak@nulogic.io | Tenant-wide | Payroll, compensation, expenses |
| 6 | Neha P | RECRUITER | neha@nulogic.io | Recruitment module | Recruitment-specific access |

---

## Flow 1: SuperAdmin Full Access Validation

**User:** Fayaz M (SUPER_ADMIN)
**Expected:** All sidebar items visible, all pages accessible, all actions available

### Steps:
1. Login as SuperAdmin
2. Verify ALL sidebar sections visible (all 12 current sections)
3. Navigate to `/admin` → Should see System Health, Roles, Permissions
4. Navigate to `/admin/roles` → Should see role management with CRUD
5. Navigate to `/employees` → Should see ALL employees across ALL departments
6. Navigate to `/payroll` → Should see payroll processing controls
7. Navigate to `/analytics` → Should see org-wide analytics
8. Navigate to `/settings` → Should see system-level settings

### Assertions:
- [ ] Sidebar shows ALL items (no items hidden)
- [ ] Can access any tenant's data
- [ ] Can create/edit/delete roles
- [ ] Can create/edit/delete employees
- [ ] Can process payroll
- [ ] Can view all reports
- [ ] No "Access Denied" on any page

---

## Flow 2: HR Admin — Employee Lifecycle

**User:** Priya S (HR_ADMIN)
**Expected:** Full HR module access, no admin/system settings

### Steps:
1. Login as HR Admin
2. Verify sidebar shows: Self Service, Company, HR Management, Performance sections
3. Verify sidebar HIDES: Admin > System Settings, Admin > Integrations
4. Navigate to `/employees` → Should see employee list with Add button
5. Click "Add Employee" → Should open creation form
6. Fill and submit → Employee created
7. Navigate to `/employees/{id}` → Should see full profile with edit access
8. Navigate to `/leave/approvals` → Should see pending leave requests
9. Approve a leave request → Should succeed
10. Navigate to `/admin/roles` → Should see "Access Denied" or redirect
11. Navigate to `/payroll` → Should be visible (HR_ADMIN has payroll view)

### Assertions:
- [ ] Can create employees
- [ ] Can edit employee profiles
- [ ] Can approve/reject leave requests
- [ ] Can view all departments
- [ ] Can access recruitment module
- [ ] Cannot access system admin settings
- [ ] Cannot modify roles/permissions
- [ ] Sidebar hides Admin > System Settings

---

## Flow 3: Manager — Team Scope Validation

**User:** Rahul K (MANAGER, Engineering Dept)
**Expected:** Team-level access only, approval capabilities for direct reports

### Steps:
1. Login as Manager
2. Verify sidebar shows: Self Service, Company (Directory, Org Chart), limited HR Management
3. Verify sidebar HIDES: Admin section entirely, Payroll processing, Recruitment
4. Navigate to `/employees` → Should see ONLY Engineering team members
5. Navigate to `/attendance/team` → Should see only team attendance
6. Navigate to `/leave/approvals` → Should see only team leave requests
7. Approve team member's leave → Should succeed
8. Navigate to `/approvals/inbox` → Should see pending approvals for team
9. Navigate to `/employees` → Try to edit non-team employee → Should fail
10. Navigate to `/payroll` → Should see "Access Denied" or be hidden
11. Navigate to `/performance/reviews` → Should see team reviews only
12. Navigate to `/recruitment` → Should be hidden or access denied

### Assertions:
- [ ] Employee list filtered to Engineering team only
- [ ] Attendance shows team members only
- [ ] Leave approvals scoped to direct reports
- [ ] Cannot view other department employees
- [ ] Cannot access payroll
- [ ] Cannot access admin
- [ ] Can view team performance
- [ ] Performance reviews scoped to team

---

## Flow 4: Employee — Self-Service Only

**User:** Anita R (EMPLOYEE)
**Expected:** Only self-service features, no admin or management access

### Steps:
1. Login as Employee
2. Verify sidebar shows ONLY: Home, Self Service section (My Dashboard, Profile, Payslips, Attendance, Leaves, Documents), Company (Announcements, Directory, Org Chart)
3. Verify sidebar HIDES: HR Management, Performance (admin), Compensation, Time & Projects, Reports, Admin
4. Navigate to `/me/dashboard` → Should see personal dashboard
5. Navigate to `/me/attendance` → Should see own attendance only
6. Navigate to `/me/leaves` → Should see own leave balance and history
7. Navigate to `/leave/apply` → Should be able to apply for leave
8. Navigate to `/me/payslips` → Should see own payslips
9. Navigate to `/me/documents` → Should see own documents
10. Navigate to `/employees` → Should redirect or show "Access Denied"
11. Navigate to `/admin` → Should redirect or show "Access Denied"
12. Navigate to `/payroll` → Should redirect or show "Access Denied"
13. Navigate to `/performance/reviews` → Should see own reviews only
14. Navigate to `/announcements` → Should see company announcements

### Assertions:
- [ ] Sidebar shows ~10 items max (Self Service + Company)
- [ ] All /me/* pages work correctly
- [ ] Cannot access /employees (admin list)
- [ ] Cannot access /admin
- [ ] Cannot access /payroll
- [ ] Cannot access /departments (admin)
- [ ] Cannot approve any requests
- [ ] Can only view own data
- [ ] Announcements visible (read-only)
- [ ] Team Directory visible (read-only)

---

## Flow 5: Finance Admin — Payroll & Compensation

**User:** Deepak M (FINANCE_ADMIN)
**Expected:** Full payroll/compensation/expense access, limited HR access

### Steps:
1. Login as Finance Admin
2. Verify sidebar shows: Self Service, Compensation & Benefits (all items), Reports (Payroll)
3. Verify sidebar HIDES: Recruitment, Onboarding, Performance (admin)
4. Navigate to `/payroll` → Should see payroll management with processing controls
5. Navigate to `/payroll` → Click "Create Payroll Run" → Should open form
6. Navigate to `/compensation` → Should see compensation planning
7. Navigate to `/benefits` → Should see benefits management
8. Navigate to `/expenses` → Should see all expense claims (not just own)
9. Navigate to `/statutory` → Should see PF/ESI/PT configurations
10. Navigate to `/employees` → Should see employee list (for salary reference)
11. Navigate to `/employees/{id}` → Should see salary tab but NOT edit personal info
12. Navigate to `/recruitment` → Should be hidden or access denied
13. Navigate to `/admin/roles` → Should be access denied

### Assertions:
- [ ] Full payroll processing access
- [ ] Can view/edit salary structures
- [ ] Can manage benefits enrollment
- [ ] Can approve/reject expense claims
- [ ] Can configure statutory compliance
- [ ] Can view employees (salary data)
- [ ] Cannot edit employee personal info
- [ ] Cannot access recruitment
- [ ] Cannot modify roles/permissions
- [ ] Reports limited to financial reports

---

## Flow 6: Recruiter — Hiring Pipeline

**User:** Neha P (RECRUITER)
**Expected:** Full recruitment access, limited to hiring module

### Steps:
1. Login as Recruiter
2. Verify sidebar shows: Self Service, Company, Recruitment (all sub-items)
3. Verify sidebar HIDES: Payroll, Compensation, Admin, Time & Projects
4. Navigate to `/recruitment/jobs` → Should see all job openings
5. Click "Create Job Opening" → Should open creation form
6. Navigate to `/recruitment/candidates` → Should see candidate list
7. Click "Parse Resume" → Should allow resume upload
8. Navigate to `/recruitment/pipeline` → Should see ATS pipeline
9. Move candidate between stages → Should succeed
10. Navigate to `/recruitment/interviews` → Should see scheduled interviews
11. Navigate to `/payroll` → Should be hidden or access denied
12. Navigate to `/employees` → May have limited view (new hire reference)
13. Navigate to `/onboarding` → Should have view access (hand-off)

### Assertions:
- [ ] Full CRUD on job openings
- [ ] Full CRUD on candidates
- [ ] Can manage interview schedules
- [ ] Can move candidates through pipeline
- [ ] Can access offer portal
- [ ] Cannot access payroll
- [ ] Cannot access compensation
- [ ] Cannot process attendance
- [ ] Limited employee directory access
- [ ] Can view (not manage) onboarding

---

## Flow 7: Cross-Role Permission Boundary Tests

These test scenarios validate that role boundaries are enforced correctly.

### 7a: Employee Tries to Approve Leave
1. Login as Anita (EMPLOYEE)
2. Navigate to `/leave/approvals` directly via URL
3. **Expected:** Access denied or redirect to `/me/leaves`

### 7b: Manager Tries to Access Other Department
1. Login as Rahul (MANAGER, Engineering)
2. Navigate to `/employees` → Filter by "Marketing" department
3. **Expected:** No Marketing employees visible, or filter disabled

### 7c: Recruiter Tries to Edit Employee Salary
1. Login as Neha (RECRUITER)
2. Navigate to `/employees/{id}` (any employee)
3. Click on "Compensation" tab
4. **Expected:** Tab hidden or read-only

### 7d: Finance Admin Tries to Create Employee
1. Login as Deepak (FINANCE_ADMIN)
2. Navigate to `/employees` → Look for "Add Employee" button
3. **Expected:** Button hidden (no EMPLOYEE:CREATE permission)

### 7e: HR Admin Tries to Access System Settings
1. Login as Priya (HR_ADMIN)
2. Navigate to `/admin/system` directly
3. **Expected:** Access denied or redirect

### 7f: SuperAdmin Scope Override
1. Login as Fayaz (SUPER_ADMIN)
2. Repeat ALL above restricted actions
3. **Expected:** All actions succeed (SYSTEM:ADMIN bypasses everything)

---

## Flow 8: Sidebar Visibility Matrix

This matrix shows which sidebar sections each role should see.

| Section | SuperAdmin | HR Admin | Manager | Employee | Finance | Recruiter |
|---------|-----------|----------|---------|----------|---------|-----------|
| Home | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dashboard | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Executive Dashboard | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| My Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| My Profile | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| My Payslips | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| My Attendance | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| My Leaves | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| My Documents | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Announcements | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Team Directory | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Org Chart | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Employees (Admin) | ✅ | ✅ | ✅* | ❌ | ✅* | ❌ |
| Departments | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Attendance (Admin) | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ |
| Leave Management | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ |
| Approvals | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Recruitment | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Onboarding | ✅ | ✅ | ❌ | ❌ | ❌ | ✅* |
| Offboarding | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Performance | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ |
| OKR | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| 360 Feedback | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Payroll | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Compensation | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Benefits | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Expenses | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reports | ✅ | ✅ | ✅* | ❌ | ✅* | ❌ |
| Analytics | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Admin | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Settings | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

`*` = Scoped (team/department only, not full access)

---

## Flow 9: API-Level Permission Enforcement

Frontend sidebar hiding is insufficient — backend must also enforce permissions. Test these API calls directly.

### 9a: Employee API as EMPLOYEE role
```bash
# Should succeed (self)
GET /api/v1/employees/me
GET /api/v1/attendance/my
GET /api/v1/leave/my-balance

# Should fail (403 Forbidden)
GET /api/v1/employees
POST /api/v1/employees
GET /api/v1/payroll/runs
POST /api/v1/admin/roles
DELETE /api/v1/employees/{id}
```

### 9b: Manager API scope
```bash
# Should succeed (team scope)
GET /api/v1/employees?department=engineering
GET /api/v1/attendance/team
POST /api/v1/leave/approve/{id}

# Should fail (out of scope)
GET /api/v1/employees?department=marketing
POST /api/v1/payroll/run
GET /api/v1/admin/roles
```

### 9c: Finance Admin API
```bash
# Should succeed
GET /api/v1/payroll/runs
POST /api/v1/payroll/run
GET /api/v1/compensation/structures
GET /api/v1/expenses

# Should fail
POST /api/v1/employees
DELETE /api/v1/employees/{id}
POST /api/v1/admin/roles
```

---

## Execution Checklist

| Flow | Status | Tester | Date | Notes |
|------|--------|--------|------|-------|
| Flow 1: SuperAdmin | ⬜ | | | |
| Flow 2: HR Admin | ⬜ | | | |
| Flow 3: Manager | ⬜ | | | |
| Flow 4: Employee | ⬜ | | | |
| Flow 5: Finance Admin | ⬜ | | | |
| Flow 6: Recruiter | ⬜ | | | |
| Flow 7: Boundary Tests | ⬜ | | | |
| Flow 8: Sidebar Matrix | ⬜ | | | |
| Flow 9: API Enforcement | ⬜ | | | |

---

## Prerequisites

1. Backend running with seeded roles and permissions
2. Test users created with correct role assignments
3. At least 2 departments (Engineering, Marketing) with employees
4. At least 1 pending leave request for approval testing
5. At least 1 job opening for recruitment testing
6. Payroll configuration set up for payroll testing
