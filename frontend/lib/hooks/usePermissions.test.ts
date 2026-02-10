/**
 * Tests for usePermissions hook
 * Run with: npx vitest run lib/hooks/usePermissions.test.ts
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePermissions, Permissions, Roles } from './usePermissions';

// Mock useAuth hook
vi.mock('./useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from './useAuth';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

describe('usePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when user is not logged in', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        hasHydrated: true,
      });
    });

    it('should return empty permissions and roles', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.permissions).toEqual([]);
      expect(result.current.roles).toEqual([]);
    });

    it('should return false for all permission checks', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission(Permissions.EMPLOYEE_READ)).toBe(false);
      expect(result.current.hasAnyPermission(Permissions.EMPLOYEE_READ, Permissions.EMPLOYEE_CREATE)).toBe(false);
      expect(result.current.hasAllPermissions(Permissions.EMPLOYEE_READ)).toBe(false);
    });

    it('should return false for all role checks', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasRole(Roles.HR_ADMIN)).toBe(false);
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isHR).toBe(false);
      expect(result.current.isManager).toBe(false);
    });
  });

  describe('when user is logged in with roles', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      roles: [
        {
          code: Roles.HR_MANAGER,
          name: 'HR Manager',
          permissions: [
            { code: Permissions.EMPLOYEE_READ },
            { code: Permissions.EMPLOYEE_CREATE },
            { code: Permissions.LEAVE_APPROVE },
          ],
        },
        {
          code: Roles.TEAM_LEAD,
          name: 'Team Lead',
          permissions: [
            { code: Permissions.ATTENDANCE_VIEW_TEAM },
          ],
        },
      ],
    };

    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        hasHydrated: true,
      });
    });

    it('should extract all permissions from roles', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.permissions).toContain(Permissions.EMPLOYEE_READ);
      expect(result.current.permissions).toContain(Permissions.EMPLOYEE_CREATE);
      expect(result.current.permissions).toContain(Permissions.LEAVE_APPROVE);
      expect(result.current.permissions).toContain(Permissions.ATTENDANCE_VIEW_TEAM);
    });

    it('should extract all role codes', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.roles).toContain(Roles.HR_MANAGER);
      expect(result.current.roles).toContain(Roles.TEAM_LEAD);
    });

    it('should return true for hasPermission with valid permission', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission(Permissions.EMPLOYEE_READ)).toBe(true);
      expect(result.current.hasPermission(Permissions.LEAVE_APPROVE)).toBe(true);
    });

    it('should return false for hasPermission with invalid permission', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission(Permissions.SYSTEM_ADMIN)).toBe(false);
      expect(result.current.hasPermission(Permissions.PAYROLL_PROCESS)).toBe(false);
    });

    it('should correctly check hasAnyPermission', () => {
      const { result } = renderHook(() => usePermissions());

      // Has one of these
      expect(result.current.hasAnyPermission(
        Permissions.EMPLOYEE_READ,
        Permissions.SYSTEM_ADMIN
      )).toBe(true);

      // Has none of these
      expect(result.current.hasAnyPermission(
        Permissions.SYSTEM_ADMIN,
        Permissions.PAYROLL_PROCESS
      )).toBe(false);
    });

    it('should correctly check hasAllPermissions', () => {
      const { result } = renderHook(() => usePermissions());

      // Has all of these
      expect(result.current.hasAllPermissions(
        Permissions.EMPLOYEE_READ,
        Permissions.EMPLOYEE_CREATE
      )).toBe(true);

      // Missing one
      expect(result.current.hasAllPermissions(
        Permissions.EMPLOYEE_READ,
        Permissions.SYSTEM_ADMIN
      )).toBe(false);
    });

    it('should correctly check hasRole', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasRole(Roles.HR_MANAGER)).toBe(true);
      expect(result.current.hasRole(Roles.TEAM_LEAD)).toBe(true);
      expect(result.current.hasRole(Roles.SUPER_ADMIN)).toBe(false);
    });

    it('should correctly check hasAnyRole', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasAnyRole(Roles.HR_MANAGER, Roles.SUPER_ADMIN)).toBe(true);
      expect(result.current.hasAnyRole(Roles.SUPER_ADMIN, Roles.TENANT_ADMIN)).toBe(false);
    });

    it('should correctly check hasAllRoles', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasAllRoles(Roles.HR_MANAGER, Roles.TEAM_LEAD)).toBe(true);
      expect(result.current.hasAllRoles(Roles.HR_MANAGER, Roles.SUPER_ADMIN)).toBe(false);
    });

    it('should correctly set isManager for HR_MANAGER role', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.isManager).toBe(true);
    });

    it('should correctly set isHR for HR_MANAGER role', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.isHR).toBe(true);
    });

    it('should correctly set isAdmin to false for non-admin roles', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.isAdmin).toBe(false);
    });
  });

  describe('when user is a super admin', () => {
    const mockAdminUser = {
      id: 'admin-1',
      email: 'admin@example.com',
      roles: [
        {
          code: Roles.SUPER_ADMIN,
          name: 'Super Admin',
          permissions: [
            { code: Permissions.SYSTEM_ADMIN },
          ],
        },
      ],
    };

    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        hasHydrated: true,
      });
    });

    it('should return true for isAdmin', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.isAdmin).toBe(true);
    });

    it('should return true for isHR', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.isHR).toBe(true);
    });

    it('should return true for isManager', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.isManager).toBe(true);
    });
  });

  describe('isReady state', () => {
    it('should return false for isReady when not hydrated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        hasHydrated: false,
      });

      const { result } = renderHook(() => usePermissions());

      expect(result.current.isReady).toBe(false);
    });

    it('should return true for isReady when hydrated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        hasHydrated: true,
      });

      const { result } = renderHook(() => usePermissions());

      expect(result.current.isReady).toBe(true);
    });
  });

  describe('Permissions constants', () => {
    it('should have all required permission constants', () => {
      expect(Permissions.EMPLOYEE_READ).toBe('EMPLOYEE:READ');
      expect(Permissions.LEAVE_APPROVE).toBe('LEAVE:APPROVE');
      expect(Permissions.SYSTEM_ADMIN).toBe('SYSTEM:ADMIN');
      expect(Permissions.PAYROLL_VIEW).toBe('PAYROLL:VIEW');
    });
  });

  describe('Roles constants', () => {
    it('should have all required role constants', () => {
      expect(Roles.SUPER_ADMIN).toBe('SUPER_ADMIN');
      expect(Roles.HR_ADMIN).toBe('HR_ADMIN');
      expect(Roles.EMPLOYEE).toBe('EMPLOYEE');
      expect(Roles.MANAGER).toBe('MANAGER');
    });
  });
});
