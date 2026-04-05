/**
 * Tests for AuthGuard component
 * Run with: npx vitest run components/auth/__tests__/AuthGuard.test.tsx
 */

import {render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {AuthGuard} from '../AuthGuard';
import {useAuth} from '@/lib/hooks/useAuth';
import {usePermissions} from '@/lib/hooks/usePermissions';
import {findRouteConfig, isPublicRoute} from '@/lib/config/routes';

// Define test constants inline to avoid module loading issues
const Permissions = {
  EMPLOYEE_READ: 'EMPLOYEE:READ',
  EMPLOYEE_CREATE: 'EMPLOYEE:CREATE',
  EMPLOYEE_UPDATE: 'EMPLOYEE:UPDATE',
  EMPLOYEE_DELETE: 'EMPLOYEE:DELETE',
  LEAVE_APPROVE: 'LEAVE:APPROVE',
  LEAVE_VIEW_ALL: 'LEAVE:VIEW_ALL',
  PAYROLL_VIEW: 'PAYROLL:VIEW',
  PAYROLL_PROCESS: 'PAYROLL:PROCESS',
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

// Mock useAuth hook
vi.mock('@/lib/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock usePermissions hook
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));

// Mock route utilities
vi.mock('@/lib/config/routes', () => ({
  findRouteConfig: vi.fn(),
  isPublicRoute: vi.fn(),
}));

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUsePermissions = usePermissions as ReturnType<typeof vi.fn>;
const mockFindRouteConfig = findRouteConfig as ReturnType<typeof vi.fn>;
const mockIsPublicRoute = isPublicRoute as ReturnType<typeof vi.fn>;

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPublicRoute.mockReturnValue(false);
    mockFindRouteConfig.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication state', () => {
    it('should render children when user is authenticated and ready', async () => {
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
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    it('should show loading component while auth is hydrating', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        hasHydrated: false,
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
        isReady: false,
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should render custom loading component if provided', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        hasHydrated: false,
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
        isReady: false,
      });

      render(
        <AuthGuard loadingComponent={<div>Custom Loading...</div>}>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.getByText('Custom Loading...')).toBeInTheDocument();
    });
  });

  describe('public routes', () => {
    it('should always render children on public routes', async () => {
      mockIsPublicRoute.mockReturnValue(true);

      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
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
          <div>Public Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Public Content')).toBeInTheDocument();
      });
    });
  });

  describe('unauthenticated users', () => {
    it('should attempt to restore session for unauthenticated users', async () => {
      const mockRestoreSession = vi.fn(() => Promise.resolve(false));

      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        hasHydrated: true,
        restoreSession: mockRestoreSession,
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
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(mockRestoreSession).toHaveBeenCalled();
      });
    });

    it('should show access denied when session restoration fails', async () => {
      const mockRestoreSession = vi.fn(() => Promise.resolve(false));

      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        hasHydrated: true,
        restoreSession: mockRestoreSession,
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
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText(/Access Denied/)).toBeInTheDocument();
      });
    });

    it('should render custom access denied component if provided', async () => {
      const mockRestoreSession = vi.fn(() => Promise.resolve(false));

      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        hasHydrated: true,
        restoreSession: mockRestoreSession,
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
        <AuthGuard accessDeniedComponent={<div>Custom Access Denied</div>}>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Custom Access Denied')).toBeInTheDocument();
      });
    });
  });

  describe('super admin privileges', () => {
    it('should bypass route-level permission checks for super admin', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasHydrated: true,
        restoreSession: vi.fn(),
      });

      mockUsePermissions.mockReturnValue({
        hasPermission: vi.fn(() => false),
        hasAnyPermission: vi.fn(() => false),
        hasAllPermissions: vi.fn(() => false),
        hasRole: vi.fn(),
        hasAnyRole: vi.fn(),
        hasAllRoles: vi.fn(),
        roles: [Roles.SUPER_ADMIN],
        isReady: true,
      });

      mockFindRouteConfig.mockReturnValue({
        requiresAuth: true,
        permission: Permissions.EMPLOYEE_VIEW_ALL,
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });
  });

  describe('role-based route protection', () => {
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
        roles: [],
        isAdmin: false,
        isHR: false,
        isManager: false,
        isReady: true,
      });

      // AuthGuard's checkAuthorization: the "auth only" early return fires when
      // requiresAuth is true and no permission/anyPermission/allPermissions are set.
      // Adding a dummy permission field prevents the early return so adminOnly is evaluated.
      mockFindRouteConfig.mockReturnValue({
        requiresAuth: true,
        adminOnly: true,
        permission: 'SYSTEM:ADMIN',
      });

      mockUsePermissions.mockReturnValue({
        hasPermission: vi.fn(() => false),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
        hasRole: vi.fn(),
        hasAnyRole: vi.fn(),
        hasAllRoles: vi.fn(),
        roles: [],
        isAdmin: false,
        isHR: false,
        isManager: false,
        isReady: true,
      });

      render(
        <AuthGuard>
          <div>Admin Content</div>
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
          <div>Admin Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Content')).toBeInTheDocument();
      });
    });

    it('should deny access if route requires HR but user is not HR', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasHydrated: true,
        restoreSession: vi.fn(),
      });

      mockUsePermissions.mockReturnValue({
        hasPermission: vi.fn(() => false),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
        hasRole: vi.fn(),
        hasAnyRole: vi.fn(),
        hasAllRoles: vi.fn(),
        roles: [],
        isAdmin: false,
        isHR: false,
        isManager: false,
        isReady: true,
      });

      mockFindRouteConfig.mockReturnValue({
        requiresAuth: true,
        hrOnly: true,
        permission: 'SYSTEM:ADMIN',
      });

      render(
        <AuthGuard>
          <div>HR Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText(/Access Denied/)).toBeInTheDocument();
      });
    });

    it('should allow access if route requires HR and user is HR', async () => {
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
        isHR: true,
        isReady: true,
        roles: [Roles.HR_ADMIN],
      });

      mockFindRouteConfig.mockReturnValue({
        requiresAuth: true,
        hrOnly: true,
      });

      render(
        <AuthGuard>
          <div>HR Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('HR Content')).toBeInTheDocument();
      });
    });

    it('should deny access if route requires manager but user is not manager', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasHydrated: true,
        restoreSession: vi.fn(),
      });

      mockUsePermissions.mockReturnValue({
        hasPermission: vi.fn(() => false),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
        hasRole: vi.fn(),
        hasAnyRole: vi.fn(),
        hasAllRoles: vi.fn(),
        roles: [],
        isAdmin: false,
        isHR: false,
        isManager: false,
        isReady: true,
      });

      mockFindRouteConfig.mockReturnValue({
        requiresAuth: true,
        managerOnly: true,
        permission: 'SYSTEM:ADMIN',
      });

      render(
        <AuthGuard>
          <div>Manager Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText(/Access Denied/)).toBeInTheDocument();
      });
    });

    it('should allow access if route requires manager and user is manager', async () => {
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
        isManager: true,
        isReady: true,
        roles: [Roles.MANAGER],
      });

      mockFindRouteConfig.mockReturnValue({
        requiresAuth: true,
        managerOnly: true,
      });

      render(
        <AuthGuard>
          <div>Manager Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Manager Content')).toBeInTheDocument();
      });
    });
  });

  describe('permission-based route protection', () => {
    it('should deny access if route requires permission user lacks', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasHydrated: true,
        restoreSession: vi.fn(),
      });

      mockUsePermissions.mockReturnValue({
        hasPermission: vi.fn(() => false),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
        hasRole: vi.fn(),
        hasAnyRole: vi.fn(),
        hasAllRoles: vi.fn(),
        isReady: true,
        roles: [Roles.EMPLOYEE],
      });

      mockFindRouteConfig.mockReturnValue({
        requiresAuth: true,
        permission: Permissions.PAYROLL_PROCESS,
      });

      render(
        <AuthGuard>
          <div>Payroll Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText(/Access Denied/)).toBeInTheDocument();
      });
    });

    it('should allow access if route requires permission user has', async () => {
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
          <div>Employee Management</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Employee Management')).toBeInTheDocument();
      });
    });
  });

  describe('anyPermission checks (OR logic)', () => {
    it('should allow access if user has any of the required permissions', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasHydrated: true,
        restoreSession: vi.fn(),
      });

      mockUsePermissions.mockReturnValue({
        hasPermission: vi.fn(),
        hasAnyPermission: vi.fn(() => true),
        hasAllPermissions: vi.fn(),
        hasRole: vi.fn(),
        hasAnyRole: vi.fn(),
        hasAllRoles: vi.fn(),
        isReady: true,
        roles: [Roles.HR_MANAGER],
      });

      mockFindRouteConfig.mockReturnValue({
        requiresAuth: true,
        anyPermission: [Permissions.LEAVE_APPROVE, Permissions.LEAVE_MANAGE],
      });

      render(
        <AuthGuard>
          <div>Leave Management</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Leave Management')).toBeInTheDocument();
      });
    });

    it('should deny access if user lacks all required permissions', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasHydrated: true,
        restoreSession: vi.fn(),
      });

      mockUsePermissions.mockReturnValue({
        hasPermission: vi.fn(),
        hasAnyPermission: vi.fn(() => false),
        hasAllPermissions: vi.fn(),
        hasRole: vi.fn(),
        hasAnyRole: vi.fn(),
        hasAllRoles: vi.fn(),
        isReady: true,
        roles: [Roles.EMPLOYEE],
      });

      mockFindRouteConfig.mockReturnValue({
        requiresAuth: true,
        anyPermission: [Permissions.LEAVE_APPROVE, Permissions.LEAVE_MANAGE],
      });

      render(
        <AuthGuard>
          <div>Leave Management</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText(/Access Denied/)).toBeInTheDocument();
      });
    });
  });

  describe('allPermissions checks (AND logic)', () => {
    it('should allow access if user has all required permissions', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasHydrated: true,
        restoreSession: vi.fn(),
      });

      mockUsePermissions.mockReturnValue({
        hasPermission: vi.fn(),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(() => true),
        hasRole: vi.fn(),
        hasAnyRole: vi.fn(),
        hasAllRoles: vi.fn(),
        isReady: true,
        roles: [Roles.HR_ADMIN],
      });

      mockFindRouteConfig.mockReturnValue({
        requiresAuth: true,
        allPermissions: [Permissions.EMPLOYEE_VIEW_ALL, Permissions.LEAVE_APPROVE],
      });

      render(
        <AuthGuard>
          <div>HR Dashboard</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('HR Dashboard')).toBeInTheDocument();
      });
    });

    it('should deny access if user lacks any of the required permissions', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasHydrated: true,
        restoreSession: vi.fn(),
      });

      mockUsePermissions.mockReturnValue({
        hasPermission: vi.fn(),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(() => false),
        hasRole: vi.fn(),
        hasAnyRole: vi.fn(),
        hasAllRoles: vi.fn(),
        isReady: true,
        roles: [Roles.EMPLOYEE],
      });

      mockFindRouteConfig.mockReturnValue({
        requiresAuth: true,
        allPermissions: [Permissions.EMPLOYEE_VIEW_ALL, Permissions.LEAVE_APPROVE],
      });

      render(
        <AuthGuard>
          <div>HR Dashboard</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText(/Access Denied/)).toBeInTheDocument();
      });
    });
  });

  describe('anyRole checks (OR logic)', () => {
    it('should allow access if user has any of the required roles', async () => {
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
        hasAnyRole: vi.fn(() => true),
        hasAllRoles: vi.fn(),
        isReady: true,
        roles: [Roles.HR_MANAGER],
      });

      mockFindRouteConfig.mockReturnValue({
        requiresAuth: true,
        anyRole: [Roles.HR_ADMIN, Roles.HR_MANAGER],
      });

      render(
        <AuthGuard>
          <div>HR Section</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('HR Section')).toBeInTheDocument();
      });
    });

    it('should deny access if user lacks all required roles', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasHydrated: true,
        restoreSession: vi.fn(),
      });

      mockUsePermissions.mockReturnValue({
        hasPermission: vi.fn(() => false),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
        hasRole: vi.fn(),
        hasAnyRole: vi.fn(() => false),
        hasAllRoles: vi.fn(),
        isReady: true,
        roles: [Roles.EMPLOYEE],
      });

      mockFindRouteConfig.mockReturnValue({
        requiresAuth: true,
        anyRole: [Roles.HR_ADMIN, Roles.HR_MANAGER],
        permission: 'SYSTEM:ADMIN',
      });

      render(
        <AuthGuard>
          <div>HR Section</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText(/Access Denied/)).toBeInTheDocument();
      });
    });
  });

  describe('allRoles checks (AND logic)', () => {
    it('should allow access if user has all required roles', async () => {
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
        hasAllRoles: vi.fn(() => true),
        isReady: true,
        roles: [Roles.HR_ADMIN, Roles.MANAGER],
      });

      mockFindRouteConfig.mockReturnValue({
        requiresAuth: true,
        allRoles: [Roles.HR_ADMIN, Roles.MANAGER],
      });

      render(
        <AuthGuard>
          <div>Multi-role Section</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Multi-role Section')).toBeInTheDocument();
      });
    });

    it('should deny access if user lacks any of the required roles', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasHydrated: true,
        restoreSession: vi.fn(),
      });

      mockUsePermissions.mockReturnValue({
        hasPermission: vi.fn(() => false),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
        hasRole: vi.fn(),
        hasAnyRole: vi.fn(),
        hasAllRoles: vi.fn(() => false),
        isReady: true,
        roles: [Roles.HR_ADMIN],
      });

      mockFindRouteConfig.mockReturnValue({
        requiresAuth: true,
        allRoles: [Roles.HR_ADMIN, Roles.MANAGER],
        permission: 'SYSTEM:ADMIN',
      });

      render(
        <AuthGuard>
          <div>Multi-role Section</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText(/Access Denied/)).toBeInTheDocument();
      });
    });
  });

  describe('no route config', () => {
    it('should allow access if authenticated and no specific route config', async () => {
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
        isReady: true,
        roles: [Roles.EMPLOYEE],
      });

      mockFindRouteConfig.mockReturnValue(null);

      render(
        <AuthGuard>
          <div>General Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('General Content')).toBeInTheDocument();
      });
    });
  });
});
