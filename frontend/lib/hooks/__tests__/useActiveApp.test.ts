import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useActiveApp } from '../useActiveApp';
import * as useAuthModule from '../useAuth';
import * as usePermissionsModule from '../usePermissions';

// Mock dependencies
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
  })),
}));

vi.mock('../useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', tenantId: 'tenant-1' },
    isAuthenticated: true,
  })),
}));

vi.mock('../usePermissions', () => ({
  usePermissions: vi.fn(() => ({
    permissions: ['hrms.read', 'hire.read'],
    roles: ['EMPLOYEE'],
  })),
  Roles: {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    EMPLOYEE: 'EMPLOYEE',
  },
}));

vi.mock('@/lib/config/apps', () => ({
  PLATFORM_APPS: {
    HRMS: {
      code: 'HRMS',
      name: 'NU-HRMS',
      description: 'HR Management',
      available: true,
      permissionPrefixes: ['hrms'],
      entryRoute: '/app/hrms',
    },
    HIRE: {
      code: 'HIRE',
      name: 'NU-Hire',
      description: 'Recruitment',
      available: true,
      permissionPrefixes: ['hire'],
      entryRoute: '/app/hire',
    },
    GROW: {
      code: 'GROW',
      name: 'NU-Grow',
      description: 'Performance',
      available: true,
      permissionPrefixes: ['grow'],
      entryRoute: '/app/grow',
    },
    FLUENCE: {
      code: 'FLUENCE',
      name: 'NU-Fluence',
      description: 'Knowledge',
      available: false,
      permissionPrefixes: ['fluence'],
      entryRoute: '/app/fluence',
    },
  },
  getAppForRoute: vi.fn((pathname: string) => {
    if (pathname.includes('recruitment') || pathname.includes('hire')) return 'HIRE';
    if (pathname.includes('performance') || pathname.includes('grow')) return 'GROW';
    if (pathname.includes('fluence')) return 'FLUENCE';
    return 'HRMS';
  }),
}));

describe('useActiveApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns current app code based on pathname', () => {
    const { result } = renderHook(() => useActiveApp());
    expect(result.current.appCode).toBeDefined();
    expect(result.current.app).toBeDefined();
  });

  it('returns app configuration', () => {
    const { result } = renderHook(() => useActiveApp());
    expect(result.current.app.code).toBeDefined();
    expect(result.current.app.name).toBeDefined();
    expect(result.current.app.available).toBeDefined();
  });

  it('has hasAppAccess function', () => {
    const { result } = renderHook(() => useActiveApp());
    expect(typeof result.current.hasAppAccess).toBe('function');
  });

  it('has getAppEntryRoute function', () => {
    const { result } = renderHook(() => useActiveApp());
    expect(typeof result.current.getAppEntryRoute).toBe('function');
  });

  it('super admin has access to all apps', () => {
    vi.mocked(usePermissionsModule.usePermissions).mockReturnValue({
      permissions: [],
      roles: ['SUPER_ADMIN'],
    });

    const { result } = renderHook(() => useActiveApp());
    expect(result.current.hasAppAccess('HRMS')).toBe(true);
    expect(result.current.hasAppAccess('HIRE')).toBe(true);
    expect(result.current.hasAppAccess('GROW')).toBe(true);
    expect(result.current.hasAppAccess('FLUENCE')).toBe(true);
  });

  it('returns correct entry route for apps', () => {
    const { result } = renderHook(() => useActiveApp());
    expect(result.current.getAppEntryRoute('HRMS')).toBe('/app/hrms');
    expect(result.current.getAppEntryRoute('HIRE')).toBe('/app/hire');
    expect(result.current.getAppEntryRoute('GROW')).toBe('/app/grow');
    expect(result.current.getAppEntryRoute('FLUENCE')).toBe('/app/fluence');
  });

  it('checks permissions for app access', () => {
    vi.mocked(usePermissionsModule.usePermissions).mockReturnValue({
      permissions: ['hrms.read'],
      roles: ['EMPLOYEE'],
    });

    const { result } = renderHook(() => useActiveApp());
    expect(result.current.hasAppAccess('HRMS')).toBe(true);
    expect(result.current.hasAppAccess('HIRE')).toBe(false);
  });

  it('respects unavailable apps', () => {
    vi.mocked(usePermissionsModule.usePermissions).mockReturnValue({
      permissions: ['fluence.read'],
      roles: ['EMPLOYEE'],
    });

    const { result } = renderHook(() => useActiveApp());
    expect(result.current.hasAppAccess('FLUENCE')).toBe(false);
  });

  it('allows access when no permissions loaded', () => {
    vi.mocked(usePermissionsModule.usePermissions).mockReturnValue({
      permissions: [],
      roles: [],
    });

    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
    });

    const { result } = renderHook(() => useActiveApp());
    expect(result.current.hasAppAccess('HRMS')).toBe(true);
  });

  it('checks multiple permission prefixes', () => {
    vi.mocked(usePermissionsModule.usePermissions).mockReturnValue({
      permissions: ['hrms.read', 'hrms.write', 'employee.manage'],
      roles: ['EMPLOYEE'],
    });

    const { result } = renderHook(() => useActiveApp());
    expect(result.current.hasAppAccess('HRMS')).toBe(true);
  });
});
