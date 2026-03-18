/**
 * Tests for PermissionGate component
 * Run with: npx vitest run components/auth/__tests__/PermissionGate.test.tsx
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PermissionGate, AdminGate, HRGate, ManagerGate } from '../PermissionGate';

// Define test permission/role constants directly to avoid full module import issues
const Permissions = {
  EMPLOYEE_READ: 'EMPLOYEE:READ',
  EMPLOYEE_CREATE: 'EMPLOYEE:CREATE',
  EMPLOYEE_UPDATE: 'EMPLOYEE:UPDATE',
  EMPLOYEE_DELETE: 'EMPLOYEE:DELETE',
  LEAVE_APPROVE: 'LEAVE:APPROVE',
  LEAVE_VIEW_ALL: 'LEAVE:VIEW_ALL',
  PAYROLL_VIEW: 'PAYROLL:VIEW',
  PAYROLL_PROCESS: 'PAYROLL:PROCESS',
  REPORT_VIEW: 'REPORT:VIEW',
} as const;

const Roles = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  TENANT_ADMIN: 'TENANT_ADMIN',
  HR_ADMIN: 'HR_ADMIN',
  HR_MANAGER: 'HR_MANAGER',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
  TEAM_LEAD: 'TEAM_LEAD',
  DEPARTMENT_MANAGER: 'DEPARTMENT_MANAGER',
} as const;

// Mock usePermissions hook
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));

import { usePermissions } from '@/lib/hooks/usePermissions';

const mockUsePermissions = usePermissions as ReturnType<typeof vi.fn>;

describe('PermissionGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('single permission checks', () => {
    it('should render children when user has required permission', () => {
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
          <div>Protected Content</div>
        </PermissionGate>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should not render children when user lacks required permission', () => {
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
          <div>Protected Content</div>
        </PermissionGate>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should render fallback when user lacks permission and fallback is provided', () => {
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
          permission={Permissions.EMPLOYEE_CREATE}
          fallback={<div>Access Denied</div>}
        >
          <div>Protected Content</div>
        </PermissionGate>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('anyOf permission checks (OR logic)', () => {
    it('should render when user has at least one permission from anyOf', () => {
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
          <div>Leave Manager Content</div>
        </PermissionGate>
      );

      expect(screen.getByText('Leave Manager Content')).toBeInTheDocument();
    });

    it('should not render when user has none of the permissions from anyOf', () => {
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
          <div>Leave Manager Content</div>
        </PermissionGate>
      );

      expect(screen.queryByText('Leave Manager Content')).not.toBeInTheDocument();
    });

    it('should render fallback when anyOf check fails', () => {
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
        <PermissionGate
          anyOf={[Permissions.LEAVE_APPROVE, Permissions.LEAVE_MANAGE]}
          fallback={<div>Not Authorized</div>}
        >
          <div>Leave Manager Content</div>
        </PermissionGate>
      );

      expect(screen.getByText('Not Authorized')).toBeInTheDocument();
    });

    it('should handle empty anyOf array', () => {
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
        <PermissionGate anyOf={[]}>
          <div>Content</div>
        </PermissionGate>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('allOf permission checks (AND logic)', () => {
    it('should render when user has all permissions from allOf', () => {
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
        <PermissionGate allOf={[Permissions.LEAVE_APPROVE, Permissions.EMPLOYEE_VIEW_ALL]}>
          <div>HR Admin Content</div>
        </PermissionGate>
      );

      expect(screen.getByText('HR Admin Content')).toBeInTheDocument();
    });

    it('should not render when user lacks any permission from allOf', () => {
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
        <PermissionGate allOf={[Permissions.LEAVE_APPROVE, Permissions.EMPLOYEE_VIEW_ALL]}>
          <div>HR Admin Content</div>
        </PermissionGate>
      );

      expect(screen.queryByText('HR Admin Content')).not.toBeInTheDocument();
    });

    it('should render fallback when allOf check fails', () => {
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
        <PermissionGate
          allOf={[Permissions.LEAVE_APPROVE, Permissions.EMPLOYEE_VIEW_ALL]}
          fallback={<div>Insufficient Permissions</div>}
        >
          <div>HR Admin Content</div>
        </PermissionGate>
      );

      expect(screen.getByText('Insufficient Permissions')).toBeInTheDocument();
    });

    it('should handle empty allOf array', () => {
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
        <PermissionGate allOf={[]}>
          <div>Content</div>
        </PermissionGate>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('role-based checks', () => {
    it('should render when user has required role', () => {
      mockUsePermissions.mockReturnValue({
        hasPermission: vi.fn(),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
        hasRole: vi.fn(() => true),
        hasAnyRole: vi.fn(),
        hasAllRoles: vi.fn(),
        isReady: true,
      });

      render(
        <PermissionGate role={Roles.HR_ADMIN}>
          <div>HR Admin Section</div>
        </PermissionGate>
      );

      expect(screen.getByText('HR Admin Section')).toBeInTheDocument();
    });

    it('should not render when user lacks required role', () => {
      mockUsePermissions.mockReturnValue({
        hasPermission: vi.fn(),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
        hasRole: vi.fn(() => false),
        hasAnyRole: vi.fn(),
        hasAllRoles: vi.fn(),
        isReady: true,
      });

      render(
        <PermissionGate role={Roles.HR_ADMIN}>
          <div>HR Admin Section</div>
        </PermissionGate>
      );

      expect(screen.queryByText('HR Admin Section')).not.toBeInTheDocument();
    });
  });

  describe('anyRole checks (OR logic)', () => {
    it('should render when user has at least one role from anyRole', () => {
      mockUsePermissions.mockReturnValue({
        hasPermission: vi.fn(),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
        hasRole: vi.fn(),
        hasAnyRole: vi.fn(() => true),
        hasAllRoles: vi.fn(),
        isReady: true,
      });

      render(
        <PermissionGate anyRole={[Roles.HR_ADMIN, Roles.HR_MANAGER]}>
          <div>HR Section</div>
        </PermissionGate>
      );

      expect(screen.getByText('HR Section')).toBeInTheDocument();
    });

    it('should not render when user has none of the roles from anyRole', () => {
      mockUsePermissions.mockReturnValue({
        hasPermission: vi.fn(),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
        hasRole: vi.fn(),
        hasAnyRole: vi.fn(() => false),
        hasAllRoles: vi.fn(),
        isReady: true,
      });

      render(
        <PermissionGate anyRole={[Roles.HR_ADMIN, Roles.HR_MANAGER]}>
          <div>HR Section</div>
        </PermissionGate>
      );

      expect(screen.queryByText('HR Section')).not.toBeInTheDocument();
    });
  });

  describe('allRoles checks (AND logic)', () => {
    it('should render when user has all roles from allRoles', () => {
      mockUsePermissions.mockReturnValue({
        hasPermission: vi.fn(),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
        hasRole: vi.fn(),
        hasAnyRole: vi.fn(),
        hasAllRoles: vi.fn(() => true),
        isReady: true,
      });

      render(
        <PermissionGate allRoles={[Roles.HR_ADMIN, Roles.TEAM_LEAD]}>
          <div>Multi-role Section</div>
        </PermissionGate>
      );

      expect(screen.getByText('Multi-role Section')).toBeInTheDocument();
    });

    it('should not render when user lacks any role from allRoles', () => {
      mockUsePermissions.mockReturnValue({
        hasPermission: vi.fn(),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
        hasRole: vi.fn(),
        hasAnyRole: vi.fn(),
        hasAllRoles: vi.fn(() => false),
        isReady: true,
      });

      render(
        <PermissionGate allRoles={[Roles.HR_ADMIN, Roles.TEAM_LEAD]}>
          <div>Multi-role Section</div>
        </PermissionGate>
      );

      expect(screen.queryByText('Multi-role Section')).not.toBeInTheDocument();
    });
  });

  describe('combined permission and role checks', () => {
    it('should require both permission and role to pass', () => {
      mockUsePermissions.mockReturnValue({
        hasPermission: vi.fn(() => true),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
        hasRole: vi.fn(() => true),
        hasAnyRole: vi.fn(),
        hasAllRoles: vi.fn(),
        isReady: true,
      });

      render(
        <PermissionGate permission={Permissions.EMPLOYEE_CREATE} role={Roles.HR_ADMIN}>
          <div>Combined Check Content</div>
        </PermissionGate>
      );

      expect(screen.getByText('Combined Check Content')).toBeInTheDocument();
    });

    it('should fail when permission passes but role fails', () => {
      mockUsePermissions.mockReturnValue({
        hasPermission: vi.fn(() => true),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
        hasRole: vi.fn(() => false),
        hasAnyRole: vi.fn(),
        hasAllRoles: vi.fn(),
        isReady: true,
      });

      render(
        <PermissionGate permission={Permissions.EMPLOYEE_CREATE} role={Roles.HR_ADMIN}>
          <div>Combined Check Content</div>
        </PermissionGate>
      );

      expect(screen.queryByText('Combined Check Content')).not.toBeInTheDocument();
    });

    it('should fail when role passes but permission fails', () => {
      mockUsePermissions.mockReturnValue({
        hasPermission: vi.fn(() => false),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
        hasRole: vi.fn(() => true),
        hasAnyRole: vi.fn(),
        hasAllRoles: vi.fn(),
        isReady: true,
      });

      render(
        <PermissionGate permission={Permissions.EMPLOYEE_CREATE} role={Roles.HR_ADMIN}>
          <div>Combined Check Content</div>
        </PermissionGate>
      );

      expect(screen.queryByText('Combined Check Content')).not.toBeInTheDocument();
    });
  });

  describe('loading state (isReady)', () => {
    it('should render nothing while auth is loading', () => {
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
        <PermissionGate permission={Permissions.EMPLOYEE_CREATE}>
          <div>Protected Content</div>
        </PermissionGate>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should render children while loading if showWhileLoading is true', () => {
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
        <PermissionGate permission={Permissions.EMPLOYEE_CREATE} showWhileLoading>
          <div>Content During Loading</div>
        </PermissionGate>
      );

      expect(screen.getByText('Content During Loading')).toBeInTheDocument();
    });

    it('should show fallback while loading if provided and showWhileLoading is false', () => {
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
        <PermissionGate
          permission={Permissions.EMPLOYEE_CREATE}
          fallback={<div>Loading...</div>}
        >
          <div>Protected Content</div>
        </PermissionGate>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });
});

describe('AdminGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children for admin users', () => {
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
        <div>Admin Only Content</div>
      </AdminGate>
    );

    expect(screen.getByText('Admin Only Content')).toBeInTheDocument();
  });

  it('should not render children for non-admin users', () => {
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
        <div>Admin Only Content</div>
      </AdminGate>
    );

    expect(screen.queryByText('Admin Only Content')).not.toBeInTheDocument();
  });

  it('should render fallback for non-admin users', () => {
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
      <AdminGate fallback={<div>Not Admin</div>}>
        <div>Admin Only Content</div>
      </AdminGate>
    );

    expect(screen.getByText('Not Admin')).toBeInTheDocument();
  });

  it('should render nothing while loading', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn(),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
      hasAllRoles: vi.fn(),
      isAdmin: true,
      isReady: false,
    });

    render(
      <AdminGate>
        <div>Admin Only Content</div>
      </AdminGate>
    );

    expect(screen.queryByText('Admin Only Content')).not.toBeInTheDocument();
  });
});

describe('HRGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children for HR users', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn(),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
      hasAllRoles: vi.fn(),
      isHR: true,
      isReady: true,
    });

    render(
      <HRGate>
        <div>HR Section</div>
      </HRGate>
    );

    expect(screen.getByText('HR Section')).toBeInTheDocument();
  });

  it('should not render children for non-HR users', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn(),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
      hasAllRoles: vi.fn(),
      isHR: false,
      isReady: true,
    });

    render(
      <HRGate>
        <div>HR Section</div>
      </HRGate>
    );

    expect(screen.queryByText('HR Section')).not.toBeInTheDocument();
  });

  it('should render fallback for non-HR users', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn(),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
      hasAllRoles: vi.fn(),
      isHR: false,
      isReady: true,
    });

    render(
      <HRGate fallback={<div>Not HR</div>}>
        <div>HR Section</div>
      </HRGate>
    );

    expect(screen.getByText('Not HR')).toBeInTheDocument();
  });

  it('should render nothing while loading', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn(),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
      hasAllRoles: vi.fn(),
      isHR: true,
      isReady: false,
    });

    render(
      <HRGate>
        <div>HR Section</div>
      </HRGate>
    );

    expect(screen.queryByText('HR Section')).not.toBeInTheDocument();
  });
});

describe('ManagerGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children for manager users', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn(),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
      hasAllRoles: vi.fn(),
      isManager: true,
      isReady: true,
    });

    render(
      <ManagerGate>
        <div>Manager Section</div>
      </ManagerGate>
    );

    expect(screen.getByText('Manager Section')).toBeInTheDocument();
  });

  it('should not render children for non-manager users', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn(),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
      hasAllRoles: vi.fn(),
      isManager: false,
      isReady: true,
    });

    render(
      <ManagerGate>
        <div>Manager Section</div>
      </ManagerGate>
    );

    expect(screen.queryByText('Manager Section')).not.toBeInTheDocument();
  });

  it('should render fallback for non-manager users', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn(),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
      hasAllRoles: vi.fn(),
      isManager: false,
      isReady: true,
    });

    render(
      <ManagerGate fallback={<div>Not Manager</div>}>
        <div>Manager Section</div>
      </ManagerGate>
    );

    expect(screen.getByText('Not Manager')).toBeInTheDocument();
  });

  it('should render nothing while loading', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn(),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
      hasAllRoles: vi.fn(),
      isManager: true,
      isReady: false,
    });

    render(
      <ManagerGate>
        <div>Manager Section</div>
      </ManagerGate>
    );

    expect(screen.queryByText('Manager Section')).not.toBeInTheDocument();
  });
});
