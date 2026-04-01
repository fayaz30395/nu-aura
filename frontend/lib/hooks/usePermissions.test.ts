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

    it('should bypass all permission checks', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission(Permissions.SYSTEM_ADMIN)).toBe(true);
      expect(result.current.hasPermission(Permissions.EMPLOYEE_READ)).toBe(true);
      expect(result.current.hasPermission(Permissions.PAYROLL_PROCESS)).toBe(true);
      expect(result.current.hasPermission('ANY_RANDOM_PERMISSION')).toBe(true);
    });

    it('should bypass all hasAnyPermission checks', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasAnyPermission(
        Permissions.PAYROLL_PROCESS,
        Permissions.PAYROLL_APPROVE
      )).toBe(true);
    });

    it('should bypass all hasAllPermissions checks', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasAllPermissions(
        Permissions.PAYROLL_PROCESS,
        Permissions.PAYROLL_APPROVE,
        Permissions.PAYROLL_VIEW
      )).toBe(true);
    });
  });

  describe('permission hierarchy - MANAGE implies all actions', () => {
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
                { code: Permissions.EMPLOYEE_MANAGE },
                { code: Permissions.LEAVE_MANAGE },
              ],
            },
          ],
        },
        hasHydrated: true,
      });
    });

    it('EMPLOYEE:MANAGE should grant access to EMPLOYEE:READ', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission(Permissions.EMPLOYEE_READ)).toBe(true);
    });

    it('EMPLOYEE:MANAGE should grant access to EMPLOYEE:CREATE', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission(Permissions.EMPLOYEE_CREATE)).toBe(true);
    });

    it('EMPLOYEE:MANAGE should grant access to EMPLOYEE:UPDATE', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission(Permissions.EMPLOYEE_UPDATE)).toBe(true);
    });

    it('EMPLOYEE:MANAGE should grant access to EMPLOYEE:DELETE', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission(Permissions.EMPLOYEE_DELETE)).toBe(true);
    });

    it('LEAVE:MANAGE should grant access to LEAVE:APPROVE', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission(Permissions.LEAVE_APPROVE)).toBe(true);
    });

    it('LEAVE:MANAGE should grant access to LEAVE:REJECT', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission(Permissions.LEAVE_REJECT)).toBe(true);
    });
  });

  describe('app-prefixed permissions normalization (3-part format)', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-1',
          email: 'test@example.com',
          roles: [
            {
              code: Roles.HR_MANAGER,
              name: 'HR Manager',
              permissions: [
                { code: 'HRMS:EMPLOYEE:READ' },
                { code: 'HRMS:LEAVE:MANAGE' },
              ],
            },
          ],
        },
        hasHydrated: true,
      });
    });

    it('should normalize HRMS:EMPLOYEE:READ to EMPLOYEE:READ', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.permissions).toContain('EMPLOYEE:READ');
    });

    it('should keep original 3-part format in permissions list', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.permissions).toContain('HRMS:EMPLOYEE:READ');
    });

    it('normalized permission should match hasPermission check', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission('EMPLOYEE:READ')).toBe(true);
    });

    it('should apply hierarchy to normalized 3-part permissions', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission('LEAVE:APPROVE')).toBe(true);
    });
  });

  describe('tenant admin privileges', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'tenant-admin-1',
          email: 'admin@tenant.com',
          roles: [
            {
              code: Roles.TENANT_ADMIN,
              name: 'Tenant Admin',
              permissions: [
                { code: Permissions.TENANT_MANAGE },
              ],
            },
          ],
        },
        hasHydrated: true,
      });
    });

    it('should be identified as admin', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.isAdmin).toBe(true);
    });

    it('should be identified as HR', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.isHR).toBe(true);
    });

    it('should be identified as manager', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.isManager).toBe(true);
    });
  });

  describe('multiple roles aggregation', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-1',
          email: 'test@example.com',
          roles: [
            {
              code: Roles.EMPLOYEE,
              name: 'Employee',
              permissions: [
                { code: Permissions.LEAVE_APPLY },
                { code: Permissions.LEAVE_VIEW_SELF },
              ],
            },
            {
              code: Roles.MANAGER,
              name: 'Manager',
              permissions: [
                { code: Permissions.LEAVE_APPROVE },
                { code: Permissions.EMPLOYEE_VIEW_TEAM },
              ],
            },
            {
              code: Roles.RECRUITER,
              name: 'Recruiter',
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

    it('should not be identified as HR', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.isHR).toBe(false);
    });
  });

  describe('empty permission sets', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-1',
          email: 'test@example.com',
          roles: [
            {
              code: Roles.EMPLOYEE,
              name: 'Employee',
              permissions: [],
            },
          ],
        },
        hasHydrated: true,
      });
    });

    it('should handle role with no permissions', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.permissions).toEqual([]);
      expect(result.current.roles).toContain(Roles.EMPLOYEE);
    });

    it('should return false for any permission check', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission(Permissions.EMPLOYEE_READ)).toBe(false);
      expect(result.current.hasAnyPermission(Permissions.EMPLOYEE_READ)).toBe(false);
    });
  });

  describe('hasAnyPermission edge cases', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-1',
          email: 'test@example.com',
          roles: [
            {
              code: Roles.EMPLOYEE,
              name: 'Employee',
              permissions: [
                { code: Permissions.EMPLOYEE_READ },
              ],
            },
          ],
        },
        hasHydrated: true,
      });
    });

    it('should return true with single matching permission', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasAnyPermission(Permissions.EMPLOYEE_READ)).toBe(true);
    });

    it('should return true with multiple permissions where one matches', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasAnyPermission(
        Permissions.EMPLOYEE_READ,
        Permissions.SYSTEM_ADMIN,
        Permissions.PAYROLL_VIEW
      )).toBe(true);
    });

    it('should return false with no matching permissions', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasAnyPermission(
        Permissions.SYSTEM_ADMIN,
        Permissions.PAYROLL_VIEW
      )).toBe(false);
    });
  });

  describe('hasAllPermissions edge cases', () => {
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
                { code: Permissions.EMPLOYEE_UPDATE },
              ],
            },
          ],
        },
        hasHydrated: true,
      });
    });

    it('should return true when user has all requested permissions', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasAllPermissions(
        Permissions.EMPLOYEE_READ,
        Permissions.EMPLOYEE_CREATE,
        Permissions.EMPLOYEE_UPDATE
      )).toBe(true);
    });

    it('should return false when user is missing one permission', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasAllPermissions(
        Permissions.EMPLOYEE_READ,
        Permissions.EMPLOYEE_CREATE,
        Permissions.PAYROLL_VIEW
      )).toBe(false);
    });

    it('should return true with single permission', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasAllPermissions(Permissions.EMPLOYEE_READ)).toBe(true);
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

    it('should return false when user exists but not hydrated', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-1',
          email: 'test@example.com',
          roles: [],
        },
        hasHydrated: false,
      });

      const { result } = renderHook(() => usePermissions());

      expect(result.current.isReady).toBe(false);
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
