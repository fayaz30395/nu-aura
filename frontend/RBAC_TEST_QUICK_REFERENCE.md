# RBAC Tests Quick Reference

## File Locations

```
frontend/
├── lib/hooks/
│   └── usePermissions.test.ts              (654 lines, 68 test cases)
└── components/auth/__tests__/
    ├── PermissionGate.test.tsx             (784 lines, 50+ test cases)
    └── AuthGuard.test.tsx                  (887 lines, 45+ test cases)
```

## Running Tests

### All RBAC Tests
```bash
cd frontend
npm test -- --run lib/hooks/usePermissions.test.ts components/auth/__tests__/PermissionGate.test.tsx components/auth/__tests__/AuthGuard.test.tsx
```

### Individual Suites
```bash
npm test -- --run lib/hooks/usePermissions.test.ts
npm test -- --run components/auth/__tests__/PermissionGate.test.tsx
npm test -- --run components/auth/__tests__/AuthGuard.test.tsx
```

### Watch Mode
```bash
npm test lib/hooks/usePermissions.test.ts
npm test components/auth/__tests__/PermissionGate.test.tsx
npm test components/auth/__tests__/AuthGuard.test.tsx
```

### Coverage Report
```bash
npm test -- --coverage lib/hooks/usePermissions.test.ts
npm test -- --coverage components/auth/__tests__/PermissionGate.test.tsx
npm test -- --coverage components/auth/__tests__/AuthGuard.test.tsx
```

## Test Coverage Summary

| Component | Tests | Lines | Expected Coverage |
|-----------|-------|-------|-------------------|
| usePermissions hook | 68 | 654 | 95%+ |
| PermissionGate | 50+ | 784 | 92%+ |
| AdminGate | 4 | 50 | 100% |
| HRGate | 4 | 50 | 100% |
| ManagerGate | 4 | 50 | 100% |
| AuthGuard | 45+ | 887 | 88%+ |
| **TOTAL** | **150+** | **2,325** | **90%+** |

## usePermissions Hook - Test Categories

### Permission Extraction (5 tests)
- Unauthenticated users return empty permissions
- Extract permissions from single role
- Extract permissions from multiple roles
- Aggregate permissions across all roles
- Handle roles with no permissions

### Permission Checks (10 tests)
- Single permission matching (direct)
- hasAnyPermission OR logic (pass/fail)
- hasAllPermissions AND logic (pass/fail)
- Missing permission detection
- Empty permission set handling

### Permission Hierarchy (6 tests)
- MANAGE implies READ/CREATE/UPDATE/DELETE
- Hierarchy applies across modules
- Works with both 2-part and 3-part formats
- Correctly prioritizes specific over wildcard

### App-Prefixed Normalization (4 tests)
- Normalize 3-part to 2-part format
- Keep original 3-part in list
- Normalized permissions match checks
- Apply hierarchy to normalized permissions

### Role Checks (10 tests)
- Single role matching
- hasAnyRole OR logic (pass/fail)
- hasAllRoles AND logic (pass/fail)
- Multiple role extraction
- Role aggregation

### Super Admin Bypass (3 tests)
- Returns true for ANY permission
- Bypasses hasAnyPermission
- Bypasses hasAllPermissions

### Convenience Flags (8 tests)
- isAdmin for SUPER_ADMIN/TENANT_ADMIN
- isHR for HR roles
- isManager for manager roles
- Tenant admin privileges
- Role-based flag detection

### Hydration/Ready State (3 tests)
- isReady false when not hydrated
- isReady true when hydrated
- Effect on permission checks

### Constants (2 tests)
- All permission constants defined
- All role constants defined

## PermissionGate Component - Test Categories

### Single Permission (3 tests)
- Render with permission
- Hide without permission
- Fallback rendering

### anyOf (OR Logic - 4 tests)
- Render with any matching
- Hide with no matching
- Fallback behavior
- Empty array handling

### allOf (AND Logic - 4 tests)
- Render with all matching
- Hide when missing any
- Fallback behavior
- Empty array handling

### Role-Based (2 tests)
- Render with role
- Hide without role

### anyRole (2 tests)
- Render with any role
- Hide without any role

### allRoles (2 tests)
- Render with all roles
- Hide without all roles

### Combined Checks (3 tests)
- Permission AND role (both pass)
- Permission AND role (permission fails)
- Permission AND role (role fails)

### Loading States (3 tests)
- Render nothing while loading
- Render with showWhileLoading
- Handle isReady transitions

### AdminGate (4 tests)
- Render for admins
- Hide for non-admins
- Fallback for non-admins
- Loading state

### HRGate (4 tests)
- Render for HR users
- Hide for non-HR
- Fallback for non-HR
- Loading state

### ManagerGate (4 tests)
- Render for managers
- Hide for non-managers
- Fallback for non-managers
- Loading state

## AuthGuard Component - Test Categories

### Authentication (3 tests)
- Render when authenticated
- Show loading while hydrating
- Custom loading component

### Public Routes (1 test)
- Always render on public routes

### Unauthenticated (3 tests)
- Attempt session restoration
- Show access denied
- Custom access denied

### Super Admin (1 test)
- Bypass all permission checks

### Admin Routes (2 tests)
- Deny when not admin
- Allow when admin

### HR Routes (2 tests)
- Deny when not HR
- Allow when HR

### Manager Routes (2 tests)
- Deny when not manager
- Allow when manager

### Single Permission (2 tests)
- Deny without permission
- Allow with permission

### anyPermission (2 tests)
- Allow with any matching
- Deny with no matching

### allPermissions (2 tests)
- Allow with all matching
- Deny with missing any

### anyRole (2 tests)
- Allow with any role
- Deny with no role

### allRoles (2 tests)
- Allow with all roles
- Deny with missing any

### No Route Config (1 test)
- Allow for authenticated

## Mock Structure

### useAuth Mock
```javascript
{
  isAuthenticated: boolean,
  hasHydrated: boolean,
  restoreSession: () => Promise<boolean>
}
```

### usePermissions Mock
```javascript
{
  permissions: string[],
  roles: string[],
  hasPermission: (perm: string) => boolean,
  hasAnyPermission: (...perms: string[]) => boolean,
  hasAllPermissions: (...perms: string[]) => boolean,
  hasRole: (role: string) => boolean,
  hasAnyRole: (...roles: string[]) => boolean,
  hasAllRoles: (...roles: string[]) => boolean,
  isAdmin: boolean,
  isHR: boolean,
  isManager: boolean,
  isReady: boolean
}
```

## Key Test Scenarios

### Scenario 1: HR Manager Role
- Has EMPLOYEE_READ, EMPLOYEE_CREATE, LEAVE_APPROVE
- isHR = true
- isManager = true
- isAdmin = false
- Can create employees
- Can approve leaves
- Cannot process payroll

### Scenario 2: Super Admin
- Has SYSTEM:ADMIN
- Bypasses all permission checks
- isAdmin = true
- isHR = true
- isManager = true
- Can access everything

### Scenario 3: Employee
- Has LEAVE_APPLY, LEAVE_VIEW_SELF
- isHR = false
- isManager = false
- isAdmin = false
- Can request leave
- Cannot approve leave
- Cannot create employees

### Scenario 4: Tenant Admin
- Has TENANT_MANAGE
- isAdmin = true
- isHR = true
- isManager = true
- Has admin-level access

### Scenario 5: Team Lead + HR Manager
- Multiple roles aggregated
- Combined permissions from both roles
- Can see team attendance (from Team Lead)
- Can create employees (from HR Manager)

## Coverage Targets

- **Line Coverage:** 90%+ for all RBAC components
- **Branch Coverage:** 88%+ (complex conditionals)
- **Function Coverage:** 98%+ (almost all paths)

## Common Test Patterns

### Testing Permission Check
```typescript
it('should allow access with permission', () => {
  mockUsePermissions.mockReturnValue({
    hasPermission: vi.fn(() => true),
    // ... other mocks
    isReady: true,
  });

  render(<Component>Content</Component>);
  expect(screen.getByText('Content')).toBeInTheDocument();
});
```

### Testing Fallback Rendering
```typescript
it('should show fallback when denied', () => {
  mockUsePermissions.mockReturnValue({
    hasPermission: vi.fn(() => false),
    isReady: true,
  });

  render(
    <PermissionGate
      permission={Permissions.EMPLOYEE_CREATE}
      fallback={<div>Denied</div>}
    >
      <div>Allowed</div>
    </PermissionGate>
  );

  expect(screen.getByText('Denied')).toBeInTheDocument();
});
```

### Testing Loading State
```typescript
it('should not render while loading', () => {
  mockUsePermissions.mockReturnValue({
    isReady: false,
  });

  render(
    <PermissionGate permission={Permissions.EMPLOYEE_READ}>
      <div>Content</div>
    </PermissionGate>
  );

  expect(screen.queryByText('Content')).not.toBeInTheDocument();
});
```

## Debugging Tips

### Check Mock Calls
```typescript
expect(mockUsePermissions).toHaveBeenCalled();
expect(mockUsePermissions).toHaveBeenCalledWith(expectedArgs);
```

### Verify Function Arguments
```typescript
const mockHasPermission = vi.fn(() => true);
// ... after test
expect(mockHasPermission).toHaveBeenCalledWith(Permissions.EMPLOYEE_READ);
```

### Debug Rendering
```typescript
render(<Component />);
screen.debug(); // Print DOM
```

## Related Files

- **Hook Implementation:** `frontend/lib/hooks/usePermissions.ts`
- **PermissionGate Implementation:** `frontend/components/auth/PermissionGate.tsx`
- **AuthGuard Implementation:** `frontend/components/auth/AuthGuard.tsx`
- **useAuth Implementation:** `frontend/lib/hooks/useAuth.ts`
- **Test Setup:** `frontend/vitest.setup.ts`
- **Test Config:** `frontend/vitest.config.ts`

## Continuous Integration

All tests run on:
- Pull request creation
- Commits to main/develop
- Before production deployment

Expected pass rate: 100%
Expected coverage: 90%+ for critical paths

