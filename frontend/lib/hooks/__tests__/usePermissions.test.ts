import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePermissions, Permissions, Roles } from '../usePermissions';

// Mock useAuth — Zustand store
vi.mock('../useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../useAuth';
const mockUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>;

function mockAuthWith(roles: Array<{ code: string; permissions: Array<{ code: string }> }>) {
  mockUseAuth.mockReturnValue({
    user: {
      id: 'u1',
      roles,
    },
    hasHydrated: true,
  });
}

describe('usePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Basic permission extraction ──────────────────────────────────────────
  describe('permission extraction', () => {
    it('returns empty permissions when user has no roles', () => {
      mockUseAuth.mockReturnValue({ user: null, hasHydrated: true });
      const { result } = renderHook(() => usePermissions());
      expect(result.current.permissions).toEqual([]);
      expect(result.current.roles).toEqual([]);
    });

    it('extracts permissions from user roles', () => {
      mockAuthWith([
        {
          code: 'EMPLOYEE',
          permissions: [{ code: 'EMPLOYEE:READ' }, { code: 'LEAVE:REQUEST' }],
        },
      ]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.permissions).toContain('EMPLOYEE:READ');
      expect(result.current.permissions).toContain('LEAVE:REQUEST');
    });

    it('extracts role codes', () => {
      mockAuthWith([
        { code: 'HR_ADMIN', permissions: [] },
        { code: 'TEAM_LEAD', permissions: [] },
      ]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.roles).toEqual(['HR_ADMIN', 'TEAM_LEAD']);
    });

    it('normalizes dot-separated permissions to colon-uppercase format', () => {
      mockAuthWith([
        {
          code: 'EMPLOYEE',
          permissions: [{ code: 'employee.read' }],
        },
      ]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.permissions).toContain('employee.read');
      expect(result.current.permissions).toContain('EMPLOYEE:READ');
    });

    it('strips app prefix from 3-part colon permissions (APP:MODULE:ACTION)', () => {
      mockAuthWith([
        {
          code: 'EMPLOYEE',
          permissions: [{ code: 'HRMS:EMPLOYEE:READ' }],
        },
      ]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.permissions).toContain('HRMS:EMPLOYEE:READ');
      expect(result.current.permissions).toContain('EMPLOYEE:READ');
    });
  });

  // ─── hasPermission ────────────────────────────────────────────────────────
  describe('hasPermission', () => {
    it('returns true for permission user has', () => {
      mockAuthWith([
        { code: 'EMPLOYEE', permissions: [{ code: 'EMPLOYEE:READ' }] },
      ]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.hasPermission('EMPLOYEE:READ')).toBe(true);
    });

    it('returns false for permission user lacks', () => {
      mockAuthWith([
        { code: 'EMPLOYEE', permissions: [{ code: 'EMPLOYEE:READ' }] },
      ]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.hasPermission('EMPLOYEE:DELETE')).toBe(false);
    });

    it('MODULE:MANAGE implies all actions in that module', () => {
      mockAuthWith([
        { code: 'HR_ADMIN', permissions: [{ code: 'EMPLOYEE:MANAGE' }] },
      ]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.hasPermission('EMPLOYEE:READ')).toBe(true);
      expect(result.current.hasPermission('EMPLOYEE:DELETE')).toBe(true);
      expect(result.current.hasPermission('EMPLOYEE:CREATE')).toBe(true);
    });
  });

  // ─── SUPER_ADMIN bypass ───────────────────────────────────────────────────
  describe('admin bypass', () => {
    it('SUPER_ADMIN bypasses all permission checks', () => {
      mockAuthWith([
        { code: 'SUPER_ADMIN', permissions: [] },
      ]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isAdmin).toBe(true);
      expect(result.current.hasPermission('PAYROLL:PROCESS')).toBe(true);
      expect(result.current.hasPermission('ANYTHING:HERE')).toBe(true);
    });

    it('TENANT_ADMIN bypasses all permission checks', () => {
      mockAuthWith([
        { code: 'TENANT_ADMIN', permissions: [] },
      ]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isAdmin).toBe(true);
      expect(result.current.hasPermission('EMPLOYEE:DELETE')).toBe(true);
    });

    it('SYSTEM_ADMIN permission bypasses all checks', () => {
      mockAuthWith([
        { code: 'CUSTOM_ROLE', permissions: [{ code: 'SYSTEM:ADMIN' }] },
      ]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.hasPermission('PAYROLL:PROCESS')).toBe(true);
    });
  });

  // ─── hasAnyPermission / hasAllPermissions ─────────────────────────────────
  describe('multi-permission checks', () => {
    it('hasAnyPermission returns true if user has at least one', () => {
      mockAuthWith([
        { code: 'EMPLOYEE', permissions: [{ code: 'LEAVE:REQUEST' }] },
      ]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.hasAnyPermission('LEAVE:REQUEST', 'LEAVE:APPROVE')).toBe(true);
    });

    it('hasAnyPermission returns false if user has none', () => {
      mockAuthWith([
        { code: 'EMPLOYEE', permissions: [{ code: 'ATTENDANCE:MARK' }] },
      ]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.hasAnyPermission('LEAVE:REQUEST', 'LEAVE:APPROVE')).toBe(false);
    });

    it('hasAllPermissions returns true if user has all', () => {
      mockAuthWith([
        {
          code: 'HR_ADMIN',
          permissions: [
            { code: 'EMPLOYEE:READ' },
            { code: 'EMPLOYEE:CREATE' },
          ],
        },
      ]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.hasAllPermissions('EMPLOYEE:READ', 'EMPLOYEE:CREATE')).toBe(true);
    });

    it('hasAllPermissions returns false if user lacks any', () => {
      mockAuthWith([
        { code: 'EMPLOYEE', permissions: [{ code: 'EMPLOYEE:READ' }] },
      ]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.hasAllPermissions('EMPLOYEE:READ', 'EMPLOYEE:CREATE')).toBe(false);
    });

    it('admin bypasses hasAnyPermission', () => {
      mockAuthWith([{ code: 'SUPER_ADMIN', permissions: [] }]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.hasAnyPermission('ANY:PERM')).toBe(true);
    });

    it('admin bypasses hasAllPermissions', () => {
      mockAuthWith([{ code: 'SUPER_ADMIN', permissions: [] }]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.hasAllPermissions('X:Y', 'Z:W')).toBe(true);
    });
  });

  // ─── Role checks ─────────────────────────────────────────────────────────
  describe('role checks', () => {
    it('hasRole returns true for matching role', () => {
      mockAuthWith([{ code: 'HR_ADMIN', permissions: [] }]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.hasRole('HR_ADMIN')).toBe(true);
    });

    it('hasRole returns false for non-matching role', () => {
      mockAuthWith([{ code: 'EMPLOYEE', permissions: [] }]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.hasRole('HR_ADMIN')).toBe(false);
    });

    it('hasAnyRole returns true if at least one matches', () => {
      mockAuthWith([{ code: 'TEAM_LEAD', permissions: [] }]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.hasAnyRole('TEAM_LEAD', 'HR_ADMIN')).toBe(true);
    });

    it('hasAnyRole returns false if none match', () => {
      mockAuthWith([{ code: 'EMPLOYEE', permissions: [] }]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.hasAnyRole('HR_ADMIN', 'SUPER_ADMIN')).toBe(false);
    });

    it('hasAllRoles returns true if all match', () => {
      mockAuthWith([
        { code: 'HR_ADMIN', permissions: [] },
        { code: 'TEAM_LEAD', permissions: [] },
      ]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.hasAllRoles('HR_ADMIN', 'TEAM_LEAD')).toBe(true);
    });

    it('hasAllRoles returns false if any missing', () => {
      mockAuthWith([{ code: 'HR_ADMIN', permissions: [] }]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.hasAllRoles('HR_ADMIN', 'TEAM_LEAD')).toBe(false);
    });
  });

  // ─── Convenience flags ────────────────────────────────────────────────────
  describe('convenience flags', () => {
    it('isAdmin is true for SUPER_ADMIN', () => {
      mockAuthWith([{ code: 'SUPER_ADMIN', permissions: [] }]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isAdmin).toBe(true);
    });

    it('isAdmin is true for TENANT_ADMIN', () => {
      mockAuthWith([{ code: 'TENANT_ADMIN', permissions: [] }]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isAdmin).toBe(true);
    });

    it('isAdmin is false for regular employee', () => {
      mockAuthWith([{ code: 'EMPLOYEE', permissions: [] }]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isAdmin).toBe(false);
    });

    it('isHR is true for HR_ADMIN', () => {
      mockAuthWith([{ code: 'HR_ADMIN', permissions: [] }]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isHR).toBe(true);
    });

    it('isHR is true for HR_MANAGER', () => {
      mockAuthWith([{ code: 'HR_MANAGER', permissions: [] }]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isHR).toBe(true);
    });

    it('isHR is false for EMPLOYEE', () => {
      mockAuthWith([{ code: 'EMPLOYEE', permissions: [] }]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isHR).toBe(false);
    });

    it('isManager is true for TEAM_LEAD', () => {
      mockAuthWith([{ code: 'TEAM_LEAD', permissions: [] }]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isManager).toBe(true);
    });

    it('isManager is true for DEPARTMENT_MANAGER', () => {
      mockAuthWith([{ code: 'DEPARTMENT_MANAGER', permissions: [] }]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isManager).toBe(true);
    });

    it('isManager is false for EMPLOYEE', () => {
      mockAuthWith([{ code: 'EMPLOYEE', permissions: [] }]);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isManager).toBe(false);
    });

    it('isReady reflects hasHydrated', () => {
      mockUseAuth.mockReturnValue({ user: null, hasHydrated: false });
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isReady).toBe(false);
    });

    it('isReady is true when hydrated', () => {
      mockUseAuth.mockReturnValue({ user: null, hasHydrated: true });
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isReady).toBe(true);
    });
  });

  // ─── Permission/Role constants ────────────────────────────────────────────
  describe('exported constants', () => {
    it('Permissions has MODULE:ACTION format', () => {
      expect(Permissions.EMPLOYEE_READ).toBe('EMPLOYEE:READ');
      expect(Permissions.LEAVE_APPROVE).toBe('LEAVE:APPROVE');
      expect(Permissions.PAYROLL_PROCESS).toBe('PAYROLL:PROCESS');
      expect(Permissions.SYSTEM_ADMIN).toBe('SYSTEM:ADMIN');
    });

    it('Roles has expected role codes', () => {
      expect(Roles.SUPER_ADMIN).toBe('SUPER_ADMIN');
      expect(Roles.HR_ADMIN).toBe('HR_ADMIN');
      expect(Roles.EMPLOYEE).toBe('EMPLOYEE');
      expect(Roles.RECRUITER).toBe('RECRUITER');
    });
  });
});
