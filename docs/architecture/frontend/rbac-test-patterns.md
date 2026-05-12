# RBAC Test Patterns & Examples

## Overview

This document provides reusable test patterns and examples from the RBAC test suite.

---

## Hook Testing Patterns

### Pattern 1: Basic Permission Check

```typescript
describe('hasPermission', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        roles: [
          {
            code: Roles.HR_ADMIN,
            name: 'HR Admin',
            permissions: [
              { code: Permissions.EMPLOYEE_READ },
              { code: Permissions.EMPLOYEE_CREATE },
            ],
          },
        ],
      },
      hasHydrated: true,
    });
  });

  it('should return true for existing permission', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission(Permissions.EMPLOYEE_READ)).toBe(true);
  });

  it('should return false for missing permission', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission(Permissions.PAYROLL_PROCESS)).toBe(false);
  });
});
```

### Pattern 2: Testing Permission Aggregation (OR Logic)

```typescript
describe('hasAnyPermission', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: {
        roles: [
          {
            code: Roles.EMPLOYEE,
            permissions: [{ code: Permissions.LEAVE_APPLY }],
          },
        ],
      },
      hasHydrated: true,
    });
  });

  it('should return true when user has at least one permission', () => {
    const { result } = renderHook(() => usePermissions());

    expect(result.current.hasAnyPermission(
      Permissions.LEAVE_APPLY,
      Permissions.LEAVE_MANAGE
    )).toBe(true);
  });

  it('should return false when user has none of the permissions', () => {
    const { result } = renderHook(() => usePermissions());

    expect(result.current.hasAnyPermission(
      Permissions.PAYROLL_PROCESS,
      Permissions.PAYROLL_APPROVE
    )).toBe(false);
  });
});
```

### Pattern 3: Testing Permission Hierarchy

```typescript
describe('permission hierarchy - MANAGE implies all', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: {
        roles: [
          {
            code: Roles.HR_ADMIN,
            permissions: [{ code: Permissions.EMPLOYEE_MANAGE }],
          },
        ],
      },
      hasHydrated: true,
    });
  });

  it('EMPLOYEE:MANAGE should grant EMPLOYEE:READ', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission(Permissions.EMPLOYEE_READ)).toBe(true);
  });

  it('EMPLOYEE:MANAGE should grant EMPLOYEE:CREATE', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission(Permissions.EMPLOYEE_CREATE)).toBe(true);
  });

  it('EMPLOYEE:MANAGE should grant EMPLOYEE:UPDATE', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission(Permissions.EMPLOYEE_UPDATE)).toBe(true);
  });

  it('EMPLOYEE:MANAGE should grant EMPLOYEE:DELETE', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission(Permissions.EMPLOYEE_DELETE)).toBe(true);
  });
});
```

### Pattern 4: Testing Super Admin Bypass

```typescript
describe('super admin privileges', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: {
        roles: [
          {
            code: Roles.SUPER_ADMIN,
            permissions: [{ code: Permissions.SYSTEM_ADMIN }],
          },
        ],
      },
      hasHydrated: true,
    });
  });

  it('should bypass all permission checks', () => {
    const { result } = renderHook(() => usePermissions());

    // Return true for any permission, even non-existent ones
    expect(result.current.hasPermission(Permissions.PAYROLL_PROCESS)).toBe(true);
    expect(result.current.hasPermission('ANY_RANDOM_PERMISSION')).toBe(true);
    expect(result.current.hasPermission(Permissions.EMPLOYEE_DELETE)).toBe(true);
  });

  it('should bypass hasAnyPermission checks', () => {
    const { result } = renderHook(() => usePermissions());

    expect(result.current.hasAnyPermission(
      Permissions.PAYROLL_PROCESS,
      Permissions.PAYROLL_APPROVE
    )).toBe(true);
  });

  it('should bypass hasAllPermissions checks', () => {
    const { result } = renderHook(() => usePermissions());

    expect(result.current.hasAllPermissions(
      Permissions.PAYROLL_PROCESS,
      Permissions.PAYROLL_APPROVE,
      Permissions.PAYROLL_VIEW
    )).toBe(true);
  });
});
```

### Pattern 5: Testing Multiple Roles

```typescript
describe('multiple role aggregation', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: {
        roles: [
          {
            code: Roles.EMPLOYEE,
            permissions: [
              { code: Permissions.LEAVE_APPLY },
              { code: Permissions.LEAVE_VIEW_SELF },
            ],
          },
          {
            code: Roles.MANAGER,
            permissions: [
              { code: Permissions.LEAVE_APPROVE },
              { code: Permissions.EMPLOYEE_VIEW_TEAM },
            ],
          },
          {
            code: Roles.RECRUITER,
            permissions: [
              { code: Permissions.RECRUITMENT_VIEW },
              { code: Permissions.CANDIDATE_VIEW },
            ],
          },
        ],
      },
      hasHydrated: true,
    });
  });

  it('should aggregate permissions from all roles', () => {
    const { result } = renderHook(() => usePermissions());

    expect(result.current.permissions).toContain(Permissions.LEAVE_APPLY);
    expect(result.current.permissions).toContain(Permissions.LEAVE_APPROVE);
    expect(result.current.permissions).toContain(Permissions.EMPLOYEE_VIEW_TEAM);
    expect(result.current.permissions).toContain(Permissions.RECRUITMENT_VIEW);
  });

  it('should extract all role codes', () => {
    const { result } = renderHook(() => usePermissions());

    expect(result.current.roles).toContain(Roles.EMPLOYEE);
    expect(result.current.roles).toContain(Roles.MANAGER);
    expect(result.current.roles).toContain(Roles.RECRUITER);
  });

  it('should correctly identify as manager', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isManager).toBe(true);
  });

  it('should not identify as HR', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isHR).toBe(false);
  });
});
```

---

## Component Testing Patterns

### Pattern 1: Basic Permission Gate

```typescript
describe('PermissionGate', () => {
  it('should render children when user has permission', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn(() => true),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
      hasAllRoles: vi.fn(),
      isReady: true,
    });

    render(
      <PermissionGate permission={Permissions.EMPLOYEE_CREATE}>
        <div>Create Employee</div>
      </PermissionGate>
    );

    expect(screen.getByText('Create Employee')).toBeInTheDocument();
  });

  it('should not render children when permission denied', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn(() => false),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
      hasAllRoles: vi.fn(),
      isReady: true,
    });

    render(
      <PermissionGate permission={Permissions.EMPLOYEE_CREATE}>
        <div>Create Employee</div>
      </PermissionGate>
    );

    expect(screen.queryByText('Create Employee')).not.toBeInTheDocument();
  });
});
```

### Pattern 2: Testing with Fallback

```typescript
describe('PermissionGate with fallback', () => {
  it('should render fallback when permission denied', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn(() => false),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
      hasAllRoles: vi.fn(),
      isReady: true,
    });

    render(
      <PermissionGate
        permission={Permissions.PAYROLL_VIEW}
        fallback={<div>Access Denied - No Payroll Access</div>}
      >
        <div>Payroll Dashboard</div>
      </PermissionGate>
    );

    expect(screen.getByText('Access Denied - No Payroll Access')).toBeInTheDocument();
    expect(screen.queryByText('Payroll Dashboard')).not.toBeInTheDocument();
  });
});
```

### Pattern 3: Testing OR Logic (anyOf)

```typescript
describe('PermissionGate with anyOf', () => {
  it('should render when user has any of the required permissions', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn(),
      hasAnyPermission: vi.fn(() => true),
      hasAllPermissions: vi.fn(),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
      hasAllRoles: vi.fn(),
      isReady: true,
    });

    render(
      <PermissionGate anyOf={[Permissions.LEAVE_APPROVE, Permissions.LEAVE_MANAGE]}>
        <div>Leave Management</div>
      </PermissionGate>
    );

    expect(screen.getByText('Leave Management')).toBeInTheDocument();
  });

  it('should not render when user lacks all required permissions', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn(),
      hasAnyPermission: vi.fn(() => false),
      hasAllPermissions: vi.fn(),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
      hasAllRoles: vi.fn(),
      isReady: true,
    });

    render(
      <PermissionGate anyOf={[Permissions.LEAVE_APPROVE, Permissions.LEAVE_MANAGE]}>
        <div>Leave Management</div>
      </PermissionGate>
    );

    expect(screen.queryByText('Leave Management')).not.toBeInTheDocument();
  });
});
```

### Pattern 4: Testing AND Logic (allOf)

```typescript
describe('PermissionGate with allOf', () => {
  it('should render when user has all required permissions', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn(),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(() => true),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
      hasAllRoles: vi.fn(),
      isReady: true,
    });

    render(
      <PermissionGate allOf={[Permissions.EMPLOYEE_VIEW_ALL, Permissions.LEAVE_APPROVE]}>
        <div>HR Dashboard</div>
      </PermissionGate>
    );

    expect(screen.getByText('HR Dashboard')).toBeInTheDocument();
  });

  it('should not render when user lacks any required permission', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn(),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(() => false),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
      hasAllRoles: vi.fn(),
      isReady: true,
    });

    render(
      <PermissionGate allOf={[Permissions.EMPLOYEE_VIEW_ALL, Permissions.LEAVE_APPROVE]}>
        <div>HR Dashboard</div>
      </PermissionGate>
    );

    expect(screen.queryByText('HR Dashboard')).not.toBeInTheDocument();
  });
});
```

### Pattern 5: Testing Loading State

```typescript
describe('PermissionGate loading state', () => {
  it('should show nothing while auth is loading', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn(),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
      hasAllRoles: vi.fn(),
      isReady: false,
    });

    render(
      <PermissionGate permission={Permissions.EMPLOYEE_READ}>
        <div>Content</div>
      </PermissionGate>
    );

    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('should show children if showWhileLoading is true', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn(),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
      hasAllRoles: vi.fn(),
      isReady: false,
    });

    render(
      <PermissionGate permission={Permissions.EMPLOYEE_READ} showWhileLoading>
        <div>Content During Loading</div>
      </PermissionGate>
    );

    expect(screen.getByText('Content During Loading')).toBeInTheDocument();
  });
});
```

### Pattern 6: Testing Convenience Gates

```typescript
describe('AdminGate', () => {
  it('should render for admin users', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn(),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
      hasAllRoles: vi.fn(),
      isAdmin: true,
      isReady: true,
    });

    render(
      <AdminGate>
        <div>Admin Panel</div>
      </AdminGate>
    );

    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('should not render for non-admin users', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn(),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
      hasAllRoles: vi.fn(),
      isAdmin: false,
      isReady: true,
    });

    render(
      <AdminGate>
        <div>Admin Panel</div>
      </AdminGate>
    );

    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
  });
});

// Similar patterns for HRGate and ManagerGate
```

---

## Route Protection Patterns

### Pattern 1: Basic Route Protection

```typescript
describe('AuthGuard - basic protection', () => {
  it('should render when authenticated and ready', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      hasHydrated: true,
      restoreSession: vi.fn(),
    });

    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn(),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
      hasAllRoles: vi.fn(),
      roles: [],
      isReady: true,
    });

    render(
      <AuthGuard>
        <div>Protected Page</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(screen.getByText('Protected Page')).toBeInTheDocument();
    });
  });
});
```

### Pattern 2: Role-Based Route Protection

```typescript
describe('AuthGuard - role-based protection', () => {
  it('should deny access if route requires admin but user is not admin', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      hasHydrated: true,
      restoreSession: vi.fn(),
    });

    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn(),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
      hasAllRoles: vi.fn(),
      isAdmin: false,
      isReady: true,
    });

    mockFindRouteConfig.mockReturnValue({
      requiresAuth: true,
      adminOnly: true,
    });

    render(
      <AuthGuard>
        <div>Admin Panel</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(screen.getByText(/Access Denied/)).toBeInTheDocument();
    });
  });

  it('should allow access if route requires admin and user is admin', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      hasHydrated: true,
      restoreSession: vi.fn(),
    });

    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn(),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
      hasAllRoles: vi.fn(),
      isAdmin: true,
      isReady: true,
      roles: [Roles.SUPER_ADMIN],
    });

    mockFindRouteConfig.mockReturnValue({
      requiresAuth: true,
      adminOnly: true,
    });

    render(
      <AuthGuard>
        <div>Admin Panel</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    });
  });
});
```

### Pattern 3: Permission-Based Route Protection

```typescript
describe('AuthGuard - permission-based protection', () => {
  it('should allow access if user has required permission', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      hasHydrated: true,
      restoreSession: vi.fn(),
    });

    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn(() => true),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
      hasAllRoles: vi.fn(),
      isReady: true,
      roles: [Roles.HR_ADMIN],
    });

    mockFindRouteConfig.mockReturnValue({
      requiresAuth: true,
      permission: Permissions.EMPLOYEE_CREATE,
    });

    render(
      <AuthGuard>
        <div>Employee Creation</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(screen.getByText('Employee Creation')).toBeInTheDocument();
    });
  });
});
```

### Pattern 4: Super Admin Bypass

```typescript
describe('AuthGuard - super admin bypass', () => {
  it('should bypass all permission checks for super admin', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      hasHydrated: true,
      restoreSession: vi.fn(),
    });

    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn(() => false), // Would normally fail
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
      hasAllRoles: vi.fn(),
      roles: [Roles.SUPER_ADMIN],
      isReady: true,
    });

    mockFindRouteConfig.mockReturnValue({
      requiresAuth: true,
      permission: Permissions.PAYROLL_PROCESS,
    });

    render(
      <AuthGuard>
        <div>Payroll Processing</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(screen.getByText('Payroll Processing')).toBeInTheDocument();
    });
  });
});
```

---

## Real-World Usage Examples

### Example 1: Employee Management Page

```typescript
// In your component
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';

export function EmployeesPage() {
  return (
    <div>
      <h1>Employees</h1>

      {/* View section - visible to most HR users */}
      <PermissionGate permission={Permissions.EMPLOYEE_VIEW_ALL}>
        <EmployeeList />
      </PermissionGate>

      {/* Create button - only for managers */}
      <PermissionGate
        permission={Permissions.EMPLOYEE_CREATE}
        fallback={<p>You don't have permission to create employees</p>}
      >
        <CreateEmployeeButton />
      </PermissionGate>

      {/* Bulk operations - only for HR admins */}
      <PermissionGate
        allOf={[Permissions.EMPLOYEE_VIEW_ALL, Permissions.EMPLOYEE_MANAGE]}
        fallback={null}
      >
        <BulkImportSection />
      </PermissionGate>
    </div>
  );
}

// Tests for this component
describe('EmployeesPage', () => {
  it('should show employee list to users with VIEW_ALL permission', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn((perm) => perm === Permissions.EMPLOYEE_VIEW_ALL),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
      hasAllRoles: vi.fn(),
      isReady: true,
    });

    render(<EmployeesPage />);
    expect(screen.getByText('Employee List')).toBeInTheDocument();
  });

  it('should show create button to users with CREATE permission', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn((perm) => perm === Permissions.EMPLOYEE_CREATE),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
      hasAllRoles: vi.fn(),
      isReady: true,
    });

    render(<EmployeesPage />);
    expect(screen.getByText('Create Employee')).toBeInTheDocument();
  });
});
```

### Example 2: Dashboard with Role-Based Access

```typescript
export function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Admin dashboard */}
      <AdminGate fallback={null}>
        <AdminDashboard />
      </AdminGate>

      {/* HR dashboard */}
      <HRGate fallback={null}>
        <HRDashboard />
      </HRGate>

      {/* Manager dashboard */}
      <ManagerGate fallback={null}>
        <ManagerDashboard />
      </ManagerGate>
    </div>
  );
}
```

---

## Assertion Cheat Sheet

```typescript
// Check if element is in document
expect(screen.getByText('text')).toBeInTheDocument();

// Check if element is NOT in document
expect(screen.queryByText('text')).not.toBeInTheDocument();

// Check mock was called
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith(arg);
expect(mockFn).toHaveBeenCalledTimes(1);

// Check array contains value
expect(array).toContain(value);
expect(array).toEqual([val1, val2]);

// Check boolean
expect(value).toBe(true);
expect(value).toBe(false);

// Check async behavior
await waitFor(() => {
  expect(screen.getByText('text')).toBeInTheDocument();
});
```

