# Role-Based Access Control (RBAC) - Complete Guide

Note: Keka-style RBAC requirements and deltas are tracked in
`docs/architecture/RBAC_KEKA_REQUIREMENTS.md`.

## Overview

The HRMS platform now has a comprehensive **Role-Based Access Control (RBAC)** system that provides:

1. **Granular Permissions** - 100+ permissions across all modules
2. **Role Hierarchy** - 7 predefined roles from Super Admin to Employee
3. **Data Scope** - Control who can see what data (ALL, LOCATION, DEPARTMENT, TEAM, SELF, CUSTOM)
4. **Multi-Tenant Security** - Tenant isolation built-in
5. **Permission Inheritance** - Senior roles inherit junior role permissions

---

## Role Hierarchy

| Role | Level | Default | Description |
|------|-------|---------|-------------|
| **SUPER_ADMIN** | 100 | No | Full system access - bypasses all permission checks |
| **TENANT_ADMIN** | 85 | No | Full administrative access within tenant |
| **HR_MANAGER** | 80 | No | Complete HR management with Wall/Recognition moderation |
| **HR_EXECUTIVE** | 65 | No | HR operational/viewing access with social features |
| **DEPARTMENT_MANAGER** | 60 | No | Department-level management with social features |
| **TEAM_LEAD** | 40 | No | Team-level access with social features |
| **EMPLOYEE** | 10 | **Yes** | Self-service access (assigned to all users by default) |

### 1. SUPER_ADMIN (Level: 100)
- **Purpose**: Platform administrator across all tenants
- **Scope**: ALL
- **Key Permissions**: `SYSTEM:ADMIN` - bypasses all permission checks

### 2. TENANT_ADMIN (Level: 85)
- **Purpose**: Organization administrator
- **Scope**: ALL (within tenant)
- **Key Permissions**: `SYSTEM:ADMIN` - full tenant-level access

### 3. HR_MANAGER (Level: 80)
- **Purpose**: Head of HR department
- **Scope**: ALL (HR operations)
- **Key Permissions** (28 total):
  - Employee: READ, CREATE, UPDATE, DELETE, VIEW_ALL
  - Leave: REQUEST, APPROVE, REJECT, CANCEL, VIEW_ALL, MANAGE
  - Department: MANAGE, VIEW
  - Attendance: MARK, APPROVE, VIEW_ALL, MANAGE
  - Payroll: VIEW, VIEW_ALL, PROCESS, APPROVE
  - Performance: REVIEW:CREATE/VIEW/APPROVE, GOAL:CREATE/APPROVE
  - Reports: REPORT:VIEW, ANALYTICS:VIEW
  - Wall: VIEW, POST, COMMENT, REACT, MANAGE, PIN
  - Recognition: VIEW, CREATE, MANAGE
  - Milestone: VIEW
  - Administration: ROLE:MANAGE, DASHBOARD:VIEW
  - Recruitment: VIEW_ALL

### 4. HR_EXECUTIVE (Level: 65)
- **Purpose**: HR operations team member (read-heavy)
- **Scope**: ALL (read-only mostly)
- **Key Permissions** (15 total):
  - Employee: READ, VIEW_ALL
  - Leave: REQUEST, VIEW_ALL
  - Department: VIEW
  - Attendance: MARK, VIEW_ALL
  - Payroll: VIEW_SELF
  - Wall: VIEW, POST, COMMENT, REACT
  - Recognition: VIEW, CREATE
  - Milestone: VIEW
  - Dashboard: VIEW

### 5. DEPARTMENT_MANAGER (Level: 60)
- **Purpose**: Head of a department
- **Scope**: DEPARTMENT
- **Key Permissions** (19 total):
  - Employee: READ, VIEW_DEPARTMENT
  - Leave: REQUEST, APPROVE, REJECT
  - Department: VIEW
  - Attendance: MARK, APPROVE, REGULARIZE
  - Payroll: VIEW_SELF
  - Performance: REVIEW:SUBMIT, REVIEW:APPROVE
  - Wall: VIEW, POST, COMMENT, REACT
  - Recognition: VIEW, CREATE
  - Milestone: VIEW
  - Dashboard: VIEW

### 6. TEAM_LEAD (Level: 40)
- **Purpose**: Team supervisor
- **Scope**: TEAM
- **Key Permissions** (19 total):
  - Employee: READ, VIEW_TEAM
  - Leave: REQUEST, APPROVE, VIEW_TEAM
  - Department: VIEW
  - Attendance: MARK, VIEW_TEAM, REGULARIZE
  - Payroll: VIEW_SELF
  - Timesheet: SUBMIT, APPROVE
  - Wall: VIEW, POST, COMMENT, REACT
  - Recognition: VIEW, CREATE
  - Milestone: VIEW
  - Dashboard: VIEW

### 7. EMPLOYEE (Level: 10) - **Default Role**
- **Purpose**: Regular employee (self-service)
- **Scope**: SELF
- **Key Permissions** (18 total):
  - Employee: VIEW_SELF
  - Leave: REQUEST, CANCEL, VIEW_SELF
  - Department: VIEW
  - Attendance: MARK, REGULARIZE, VIEW_SELF
  - Payroll: VIEW_SELF
  - Performance: REVIEW:SUBMIT
  - Project: VIEW
  - Timesheet: SUBMIT
  - Document: VIEW, UPLOAD
  - Report: VIEW
  - Dashboard: VIEW
  - Wall: VIEW, POST, COMMENT, REACT
  - Recognition: VIEW, CREATE
  - Milestone: VIEW

---

## Feature Access Matrix by Role

| Feature | SUPER_ADMIN | TENANT_ADMIN | HR_MANAGER | HR_EXECUTIVE | DEPT_MANAGER | TEAM_LEAD | EMPLOYEE |
|---------|:-----------:|:------------:|:----------:|:------------:|:------------:|:---------:|:--------:|
| **Employee Management** |
| View All Employees | ✅ | ✅ | ✅ (ALL) | ✅ (ALL) | ❌ | ❌ | ❌ |
| View Department Employees | ✅ | ✅ | ✅ | ✅ | ✅ (DEPT) | ❌ | ❌ |
| View Team Members | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (TEAM) | ❌ |
| View Own Profile | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (SELF) |
| Create Employee | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Update Employee | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete Employee | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Leave Management** |
| Request Leave | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Own Leave | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (SELF) |
| View Team Leave | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (TEAM) | ❌ |
| View All Leave | ✅ | ✅ | ✅ (ALL) | ✅ (ALL) | ❌ | ❌ | ❌ |
| Approve Leave | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Reject Leave | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Cancel Leave | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ (own) |
| **Attendance** |
| Mark Attendance | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Own Attendance | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (SELF) |
| View Team Attendance | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (TEAM) | ❌ |
| View All Attendance | ✅ | ✅ | ✅ (ALL) | ✅ (ALL) | ❌ | ❌ | ❌ |
| Approve Attendance | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Regularize Attendance | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| **Payroll** |
| View Own Payslip | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (SELF) |
| View All Payroll | ✅ | ✅ | ✅ (ALL) | ❌ | ❌ | ❌ | ❌ |
| Process Payroll | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Approve Payroll | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Performance** |
| View Reviews | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Create Reviews | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Submit Reviews | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| Approve Reviews | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Create Goals | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Organization Wall** |
| View Wall | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Posts | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Comment | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| React/Vote | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pin Posts | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage/Moderate Wall | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Recognition** |
| View Recognition | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Give Recognition | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage Recognition | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Milestones | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Departments** |
| View Departments | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage Departments | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Reports & Analytics** |
| View Reports | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| View Analytics | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Documents** |
| View Documents | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Upload Documents | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Projects/Timesheets** |
| View Projects | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Submit Timesheets | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Approve Timesheets | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Recruitment** |
| View All Recruitment | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Administration** |
| System Admin | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Roles | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Data Scope Hierarchy (Row-Level Security)

| Scope | Level | Filter Logic | Example |
|-------|-------|--------------|---------|
| **ALL** | 100 | No filtering - global access | HR Manager viewing all employees |
| **LOCATION** | 80 | Filter by user's assigned locations | Manager of specific office |
| **DEPARTMENT** | 60 | Filter by user's department | Dept Manager seeing dept employees |
| **TEAM** | 40 | Filter by direct/indirect reports | Team Lead viewing direct reports |
| **SELF** | 20 | Only user's own records | Employee viewing own data |
| **CUSTOM** | 10 | Specific IDs defined per user | Custom target selection |

**Scope Rules:**
- Permissions are additive - users with multiple roles get union of all permissions
- Most permissive scope wins - if user has both TEAM and DEPARTMENT scope, DEPARTMENT is used
- SUPER_ADMIN and TENANT_ADMIN bypass all permission checks via `SYSTEM:ADMIN`

---

## Permission Matrix

| Module | Read | Create | Update | Delete | Approve | Scope |
|--------|------|--------|--------|--------|---------|-------|
| **Employees** | EMPLOYEE_READ | EMPLOYEE_CREATE | EMPLOYEE_UPDATE | EMPLOYEE_DELETE | N/A | VIEW_ALL/DEPARTMENT/TEAM/SELF |
| **Leave** | (implied) | LEAVE_REQUEST | LEAVE_CANCEL | N/A | LEAVE_APPROVE/REJECT | VIEW_ALL/TEAM |
| **Attendance** | (implied) | ATTENDANCE_MARK | ATTENDANCE_REGULARIZE | N/A | ATTENDANCE_APPROVE | VIEW_ALL/TEAM |
| **Payroll** | PAYROLL_VIEW | N/A | N/A | N/A | PAYROLL_APPROVE | VIEW_ALL/SELF |
| **Performance** | REVIEW_VIEW | REVIEW_CREATE | N/A | N/A | REVIEW_APPROVE | Contextual |
| **Recruitment** | RECRUITMENT_VIEW | RECRUITMENT_CREATE | RECRUITMENT_MANAGE | N/A | N/A | ALL |
| **Training** | TRAINING_VIEW | TRAINING_CREATE | N/A | N/A | TRAINING_APPROVE | ALL |
| **Reports** | REPORT_VIEW | REPORT_CREATE | N/A | N/A | N/A | Based on role |
| **Documents** | DOCUMENT_VIEW | DOCUMENT_UPLOAD | N/A | DOCUMENT_DELETE | DOCUMENT_APPROVE | Contextual |
| **Expenses** | (implied) | EXPENSE_CREATE | N/A | N/A | EXPENSE_APPROVE | VIEW_ALL/TEAM |
| **Projects** | PROJECT_VIEW | PROJECT_CREATE | N/A | N/A | N/A | ALL |
| **Timesheets** | (implied) | TIMESHEET_SUBMIT | N/A | N/A | TIMESHEET_APPROVE | Based on role |
| **Statutory** | STATUTORY_VIEW | TDS_DECLARE | STATUTORY_MANAGE | N/A | TDS_APPROVE | VIEW_ALL/SELF |
| **System** | AUDIT_VIEW | USER_MANAGE | ROLE_MANAGE | TENANT_MANAGE | N/A | SYSTEM_ADMIN |

---

## How to Use RBAC

### 1. In Controllers - Method Level

```java
@RestController
@RequestMapping("/api/v1/employees")
public class EmployeeController {

    // Only users with EMPLOYEE_CREATE permission can access
    @PostMapping
    @RequiresPermission(Permission.EMPLOYEE_CREATE)
    public ResponseEntity<Employee> createEmployee(@RequestBody Employee employee) {
        // Implementation
    }

    // Users need EITHER EMPLOYEE_VIEW_ALL or EMPLOYEE_VIEW_DEPARTMENT
    @GetMapping
    @RequiresPermission({Permission.EMPLOYEE_VIEW_ALL, Permission.EMPLOYEE_VIEW_DEPARTMENT})
    public ResponseEntity<List<Employee>> getAllEmployees() {
        // Implementation with data scope filtering
    }

    // Users need ALL specified permissions
    @DeleteMapping("/{id}")
    @RequiresPermission(allOf = {Permission.EMPLOYEE_DELETE, Permission.SYSTEM_ADMIN})
    public ResponseEntity<Void> deleteEmployee(@PathVariable UUID id) {
        // Implementation
    }
}
```

### 2. In Service Layer - Programmatic Checks

```java
@Service
public class LeaveService {

    public void approveLeave(UUID leaveId) {
        // Check permission
        if (!SecurityContext.hasPermission(Permission.LEAVE_APPROVE)) {
            throw new AccessDeniedException("Cannot approve leave");
        }

        // Check data scope
        LeaveRequest leave = leaveRepository.findById(leaveId);
        if (!canAccessEmployee(leave.getEmployeeId())) {
            throw new AccessDeniedException("Cannot access this employee's data");
        }

        // Approve leave
        leave.setStatus(LeaveStatus.APPROVED);
        leaveRepository.save(leave);
    }

    private boolean canAccessEmployee(UUID employeeId) {
        if (SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)) {
            return true; // Can access all employees
        }

        if (SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_DEPARTMENT)) {
            // Check if employee is in same department
            UUID currentDeptId = SecurityContext.getCurrentDepartmentId();
            Employee emp = employeeRepository.findById(employeeId);
            return emp.getDepartmentId().equals(currentDeptId);
        }

        if (SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_TEAM)) {
            // Check if employee is in same team
            UUID currentTeamId = SecurityContext.getCurrentTeamId();
            Employee emp = employeeRepository.findById(employeeId);
            return emp.getTeamId().equals(currentTeamId);
        }

        // Can only access self
        return employeeId.equals(SecurityContext.getCurrentEmployeeId());
    }
}
```

### 3. Using SecurityContext

```java
// Get current user information
UUID userId = SecurityContext.getCurrentUserId();
UUID employeeId = SecurityContext.getCurrentEmployeeId();
UUID departmentId = SecurityContext.getCurrentDepartmentId();

// Check single permission
if (SecurityContext.hasPermission(Permission.PAYROLL_VIEW)) {
    // Show payroll data
}

// Check multiple permissions (OR logic)
if (SecurityContext.hasAnyPermission(
    Permission.EMPLOYEE_VIEW_ALL,
    Permission.EMPLOYEE_VIEW_DEPARTMENT
)) {
    // Can view some employees
}

// Check multiple permissions (AND logic)
if (SecurityContext.hasAllPermissions(
    Permission.REPORT_VIEW,
    Permission.ANALYTICS_EXPORT
)) {
    // Can view and export reports
}

// Check role
if (SecurityContext.hasRole(RoleHierarchy.HR_MANAGER)) {
    // HR Manager specific logic
}

// Quick role checks
if (SecurityContext.isHRManager()) {
    // HR Manager logic
}

if (SecurityContext.isManager()) {
    // Any manager (HR, Department, Team)
}
```

### 4. Data Filtering in Repositories

```java
@Repository
public interface EmployeeRepository extends JpaRepository<Employee, UUID> {

    // For users with VIEW_ALL permission
    List<Employee> findByTenantId(UUID tenantId);

    // For users with VIEW_DEPARTMENT permission
    List<Employee> findByTenantIdAndDepartmentId(UUID tenantId, UUID departmentId);

    // For users with VIEW_TEAM permission
    List<Employee> findByTenantIdAndTeamId(UUID tenantId, UUID teamId);
}

// In Service
public List<Employee> getAccessibleEmployees() {
    UUID tenantId = TenantContext.getCurrentTenant();

    if (SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)) {
        return employeeRepository.findByTenantId(tenantId);
    }

    if (SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_DEPARTMENT)) {
        UUID deptId = SecurityContext.getCurrentDepartmentId();
        return employeeRepository.findByTenantIdAndDepartmentId(tenantId, deptId);
    }

    if (SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_TEAM)) {
        UUID teamId = SecurityContext.getCurrentTeamId();
        return employeeRepository.findByTenantIdAndTeamId(tenantId, teamId);
    }

    // Can only see self
    UUID empId = SecurityContext.getCurrentEmployeeId();
    return Collections.singletonList(employeeRepository.findById(empId).orElseThrow());
}
```

---

## Setting Up User Context

```java
// During authentication/login
@Service
public class AuthenticationService {

    public void authenticateUser(String username, String password) {
        User user = userRepository.findByUsername(username);

        // Verify password...

        // Load roles and permissions
        Set<String> roles = user.getRoles().stream()
            .map(Role::getName)
            .collect(Collectors.toSet());

        Set<String> permissions = new HashSet<>();
        for (Role role : user.getRoles()) {
            permissions.addAll(role.getPermissions().stream()
                .map(Permission::getName)
                .collect(Collectors.toSet()));

            // Add default role permissions
            permissions.addAll(RoleHierarchy.getDefaultPermissions(role.getName()));
        }

        // Set security context
        SecurityContext.setCurrentUser(
            user.getId(),
            user.getEmployeeId(),
            roles,
            permissions
        );

        // Set department and team if employee
        if (user.getEmployeeId() != null) {
            Employee emp = employeeRepository.findById(user.getEmployeeId());
            SecurityContext.setDepartmentAndTeam(
                emp.getDepartmentId(),
                emp.getTeamId()
            );
        }
    }

    public void logout() {
        SecurityContext.clear();
    }
}
```

---

## Common Use Cases

### Use Case 1: Employee Requests Leave

```java
// Employee perspective
if (SecurityContext.hasPermission(Permission.LEAVE_REQUEST)) {
    leaveService.createLeaveRequest(request);
}
```

### Use Case 2: Manager Approves Leave

```java
// Manager perspective
if (SecurityContext.hasPermission(Permission.LEAVE_APPROVE)) {
    // Check if this employee is under their scope
    if (canAccessEmployee(leave.getEmployeeId())) {
        leaveService.approveLeave(leaveId);
    }
}
```

### Use Case 3: HR Views All Payroll

```java
// HR Manager perspective
if (SecurityContext.hasPermission(Permission.PAYROLL_VIEW_ALL)) {
    List<Payslip> allPayslips = payrollService.getAllPayslips();
}
```

### Use Case 4: Employee Views Own Payslip

```java
// Employee perspective
if (SecurityContext.hasPermission(Permission.PAYROLL_VIEW_SELF)) {
    Payslip myPayslip = payrollService.getMyPayslip(
        SecurityContext.getCurrentEmployeeId()
    );
}
```

### Use Case 5: Department Manager Views Team Report

```java
// Department Manager perspective
if (SecurityContext.hasPermission(Permission.REPORT_VIEW)) {
    UUID deptId = SecurityContext.getCurrentDepartmentId();
    Report report = reportService.getDepartmentReport(deptId);
}
```

---

## Best Practices

1. **Always Check Permissions**: Every controller method should have permission checks
2. **Use Data Scope**: Don't just check permissions, also verify data access scope
3. **Fail Securely**: Deny by default, grant only when permitted
4. **Audit Sensitive Operations**: Log all critical operations (payroll, deletions, etc.)
5. **Test Permissions**: Write unit tests for permission scenarios
6. **Don't Bypass**: Never bypass security in service layer
7. **Clear Context**: Always clear security context on logout
8. **Use Constants**: Use Permission constants, not hard-coded strings

---

## Integration with Spring Security

For production, integrate with Spring Security:

```java
@Configuration
@EnableGlobalMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    @Bean
    public MethodSecurityExpressionHandler expressionHandler() {
        DefaultMethodSecurityExpressionHandler handler =
            new DefaultMethodSecurityExpressionHandler();
        handler.setPermissionEvaluator(new CustomPermissionEvaluator());
        return handler;
    }
}

// Then use Spring's annotations
@PreAuthorize("hasPermission(#id, 'EMPLOYEE', 'DELETE')")
public void deleteEmployee(UUID id) {
    // Implementation
}
```

---

## Summary

Your HRMS now has **enterprise-grade RBAC** with:

- ✅ 60+ granular permissions
- ✅ 8 hierarchical roles
- ✅ 4 data scope levels
- ✅ Multi-tenant security
- ✅ Programmatic and annotation-based checks
- ✅ Complete permission matrix
- ✅ Audit-ready access control

This ensures that each user can only access and modify data they're authorized for, maintaining data security and compliance!
