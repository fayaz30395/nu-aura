import {describe, expect, it, vi, beforeEach} from 'vitest';
import {render, screen} from '@testing-library/react';
import type {ReactNode} from 'react';
import HolidaysPage from './page';
import {Permissions} from '@/lib/hooks/usePermissions';

const permissionState = {
  hasPermission: (_permission: string): boolean => false,
  isReady: true,
  isPermissionReady: true,
};

vi.mock('@/lib/hooks/usePermissions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/hooks/usePermissions')>();
  return {
    ...actual,
    usePermissions: () => ({
      ...permissionState,
      hasAnyPermission: (...perms: string[]) => perms.some(permissionState.hasPermission),
      hasAllPermissions: (...perms: string[]) => perms.every(permissionState.hasPermission),
      hasRole: () => false,
      hasAnyRole: () => false,
      hasAllRoles: () => false,
      isAdmin: false,
    }),
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({push: vi.fn()}),
}));

vi.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({isAuthenticated: true, hasHydrated: true}),
}));

vi.mock('@/components/layout', () => ({
  AppLayout: ({children}: {children: ReactNode}) => <div>{children}</div>,
}));

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({children}: {children: ReactNode}) => <div>{children}</div>,
}));

vi.mock('@/lib/hooks/queries/useAttendance', () => ({
  useHolidaysByYear: () => ({data: [], isLoading: false, error: null}),
  useCreateHoliday: () => ({mutateAsync: vi.fn(), isPending: false}),
  useUpdateHoliday: () => ({mutateAsync: vi.fn(), isPending: false}),
  useDeleteHoliday: () => ({mutateAsync: vi.fn(), isPending: false}),
}));

describe('HolidaysPage add-holiday gate', () => {
  beforeEach(() => {
    permissionState.hasPermission = () => false;
  });

  it('hides the add button without LEAVE:MANAGE', () => {
    permissionState.hasPermission = () => false;
    render(<HolidaysPage/>);
    expect(screen.queryByTestId('holiday-add')).toBeNull();
  });

  it('shows the add button with LEAVE:MANAGE', () => {
    permissionState.hasPermission = (permission: string) => permission === Permissions.LEAVE_MANAGE;
    render(<HolidaysPage/>);
    expect(screen.getByTestId('holiday-add')).toBeTruthy();
  });
});
