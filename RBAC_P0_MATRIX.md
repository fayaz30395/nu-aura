# P0 RBAC Permission Matrix

## Recruitment ATS Permissions

| Permission | SUPER_ADMIN | TENANT_ADMIN | HR_MANAGER | RECRUITMENT_ADMIN | HR_EXECUTIVE | DEPT_MANAGER | TEAM_LEAD | EMPLOYEE |
|------------|-------------|--------------|------------|-------------------|--------------|--------------|-----------|----------|
| `RECRUITMENT:VIEW` | ALL | ALL | ALL | ALL | DEPARTMENT | TEAM | TEAM | SELF |
| `RECRUITMENT:CREATE` | ALL | ALL | ALL | ALL | DEPARTMENT | - | - | - |
| `RECRUITMENT:MANAGE` | ALL | ALL | ALL | ALL | - | - | - | - |
| `CANDIDATE:VIEW` | ALL | ALL | ALL | ALL | DEPARTMENT | TEAM | TEAM | - |
| `CANDIDATE:EVALUATE` | ALL | ALL | ALL | ALL | DEPARTMENT | TEAM | TEAM | - |
| `INTERVIEW:SCHEDULE` | ALL | ALL | ALL | ALL | DEPARTMENT | TEAM | - | - |
| `INTERVIEW:CONDUCT` | ALL | ALL | ALL | ALL | DEPARTMENT | TEAM | TEAM | CUSTOM* |
| `OFFER:CREATE` | ALL | ALL | ALL | ALL | DEPARTMENT | - | - | - |
| `OFFER:APPROVE` | ALL | ALL | ALL | ALL | - | TEAM | - | - |
| `OFFER:SEND` | ALL | ALL | ALL | ALL | - | - | - | - |

*CUSTOM for EMPLOYEE: Only interviews where they are assigned as interviewer

## Letter Management Permissions

| Permission | SUPER_ADMIN | TENANT_ADMIN | HR_MANAGER | HR_EXECUTIVE | DEPT_MANAGER | TEAM_LEAD | EMPLOYEE |
|------------|-------------|--------------|------------|--------------|--------------|-----------|----------|
| `LETTER:TEMPLATE:VIEW` | ALL | ALL | ALL | ALL | - | - | - |
| `LETTER:TEMPLATE:CREATE` | ALL | ALL | ALL | DEPARTMENT | - | - | - |
| `LETTER:TEMPLATE:MANAGE` | ALL | ALL | ALL | - | - | - | - |
| `LETTER:GENERATE` | ALL | ALL | ALL | DEPARTMENT | TEAM | - | - |
| `LETTER:APPROVE` | ALL | ALL | ALL | - | TEAM | - | - |
| `LETTER:ISSUE` | ALL | ALL | ALL | DEPARTMENT | - | - | - |
| `LETTER:VIEW` | ALL | ALL | ALL | DEPARTMENT | TEAM | TEAM | SELF |

## E-Signature Permissions

| Permission | SUPER_ADMIN | TENANT_ADMIN | HR_MANAGER | HR_EXECUTIVE | DEPT_MANAGER | TEAM_LEAD | EMPLOYEE |
|------------|-------------|--------------|------------|--------------|--------------|-----------|----------|
| `ESIGNATURE:VIEW` | ALL | ALL | ALL | DEPARTMENT | TEAM | TEAM | SELF |
| `ESIGNATURE:REQUEST` | ALL | ALL | ALL | DEPARTMENT | TEAM | TEAM | - |
| `ESIGNATURE:SIGN` | ALL | ALL | ALL | ALL | ALL | ALL | SELF |
| `ESIGNATURE:MANAGE` | ALL | ALL | ALL | - | - | - | - |
| `ESIGNATURE:APPROVE` | ALL | ALL | ALL | DEPARTMENT | TEAM | - | - |

## Employee Management Permissions

| Permission | SUPER_ADMIN | TENANT_ADMIN | HR_MANAGER | HR_EXECUTIVE | DEPT_MANAGER | TEAM_LEAD | EMPLOYEE |
|------------|-------------|--------------|------------|--------------|--------------|-----------|----------|
| `EMPLOYEE:READ` | ALL | ALL | ALL | DEPARTMENT | TEAM | TEAM | SELF |
| `EMPLOYEE:CREATE` | ALL | ALL | ALL | DEPARTMENT | - | - | - |
| `EMPLOYEE:UPDATE` | ALL | ALL | ALL | DEPARTMENT | TEAM | - | SELF |
| `EMPLOYEE:DELETE` | ALL | ALL | ALL | - | - | - | - |

## Leave Management Permissions

| Permission | SUPER_ADMIN | TENANT_ADMIN | HR_MANAGER | HR_EXECUTIVE | DEPT_MANAGER | TEAM_LEAD | EMPLOYEE |
|------------|-------------|--------------|------------|--------------|--------------|-----------|----------|
| `LEAVE:VIEW` | ALL | ALL | ALL | DEPARTMENT | TEAM | TEAM | SELF |
| `LEAVE:REQUEST` | ALL | ALL | ALL | ALL | ALL | ALL | SELF |
| `LEAVE:APPROVE` | ALL | ALL | ALL | DEPARTMENT | TEAM | TEAM | - |
| `LEAVE:CANCEL` | ALL | ALL | ALL | DEPARTMENT | TEAM | TEAM | SELF |
| `LEAVE:MANAGE` | ALL | ALL | ALL | - | - | - | - |

## Attendance Permissions

| Permission | SUPER_ADMIN | TENANT_ADMIN | HR_MANAGER | HR_EXECUTIVE | DEPT_MANAGER | TEAM_LEAD | EMPLOYEE |
|------------|-------------|--------------|------------|--------------|--------------|-----------|----------|
| `ATTENDANCE:VIEW` | ALL | ALL | ALL | DEPARTMENT | TEAM | TEAM | SELF |
| `ATTENDANCE:MARK` | ALL | ALL | ALL | ALL | ALL | ALL | SELF |
| `ATTENDANCE:APPROVE` | ALL | ALL | ALL | DEPARTMENT | TEAM | TEAM | - |
| `ATTENDANCE:REGULARIZE` | ALL | ALL | ALL | DEPARTMENT | TEAM | TEAM | SELF |
| `ATTENDANCE:MANAGE` | ALL | ALL | ALL | - | - | - | - |

## System/Admin Permissions

| Permission | SUPER_ADMIN | TENANT_ADMIN | HR_MANAGER | HR_EXECUTIVE | DEPT_MANAGER | TEAM_LEAD | EMPLOYEE |
|------------|-------------|--------------|------------|--------------|--------------|-----------|----------|
| `SYSTEM:ADMIN` | ALL | - | - | - | - | - | - |
| `ROLE:MANAGE` | ALL | ALL | - | - | - | - | - |
| `PERMISSION:MANAGE` | ALL | ALL | - | - | - | - | - |
| `USER:MANAGE` | ALL | ALL | ALL | DEPARTMENT | - | - | - |
| `AUDIT:VIEW` | ALL | ALL | ALL | - | - | - | - |

## Scope Definitions

### ALL (Global)
- Access to all records within the tenant
- No filtering applied

### LOCATION
- Access limited to records associated with user's office location(s)
- Filter: `record.locationId IN user.locationIds`

### DEPARTMENT
- Access limited to records in user's department
- Filter: `record.departmentId = user.departmentId`

### TEAM
- Access to direct and indirect reports
- Direct: `employee.managerId = currentUser.employeeId`
- Indirect: Recursive traversal of reporting hierarchy
- Filter: `employee.id IN getAllReportees(currentUser.employeeId)`

### SELF
- Access only to own records
- Filter: `record.employeeId = currentUser.employeeId` OR `record.createdBy = currentUser.id`

### CUSTOM
- Access to explicitly selected targets
- Targets can be: specific employees, departments, or locations
- Filter: `record.id IN customTargetIds` OR `record.departmentId IN customDepartmentIds` OR `record.locationId IN customLocationIds`

## Permission Code Mapping

### Current vs New Permission Codes

| Current Code | New Code | Notes |
|--------------|----------|-------|
| `DOCUMENT_VIEW` | `LETTER:VIEW` | For letter viewing |
| `DOCUMENT_UPLOAD` | `LETTER:GENERATE` | For letter generation |
| `DOCUMENT_APPROVE` | `LETTER:APPROVE` | For letter approval |
| `DOCUMENT_DELETE` | - | Replaced by `LETTER:ISSUE` + `ESIGNATURE:MANAGE` |
| `EMPLOYEE_VIEW_SELF` | `ESIGNATURE:SIGN` | For signing documents |

## Approval Flow (L1 Only)

### Letter Approval
1. HR generates letter for employee
2. Letter routed to employee's reporting manager (L1)
3. Manager approves/rejects
4. If approved, HR can issue the letter

### Leave Approval
1. Employee submits leave request
2. Request routed to reporting manager (L1)
3. Manager approves/rejects
4. System updates leave balance on approval

### Offer Approval
1. Recruiter creates offer
2. Offer routed to hiring manager (L1)
3. Hiring manager approves/rejects
4. HR sends approved offer to candidate

## Notes

- `-` indicates permission not granted to role
- TEAM scope always includes indirect reports (skip-level)
- CUSTOM scope requires explicit target selection during role assignment
- Super Admin (SYSTEM:ADMIN) bypasses all permission checks
