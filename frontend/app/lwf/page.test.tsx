import React from 'react';
import {MantineProvider} from '@mantine/core';
import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {QueryClient, QueryClientProvider, useMutation} from '@tanstack/react-query';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import LWFPage from './page';

const deactivateFn = vi.fn();

vi.mock('@/lib/hooks/queries/useLWF', () => {
  const config = {
    id: 'cfg-1',
    stateCode: 'MH',
    stateName: 'Maharashtra',
    employeeContribution: 12,
    employerContribution: 36,
    frequency: 'HALF_YEARLY',
    applicableMonths: '[6,12]',
    effectiveFrom: '2026-01-01',
    salaryThreshold: null,
    isActive: true,
  };
  return {
    useLWFConfigurations: () => ({data: [config], isLoading: false}),
    useLWFDeductions: () => ({data: [], isLoading: false, refetch: vi.fn()}),
    useLWFRemittanceReport: () => ({data: undefined, isLoading: false, refetch: vi.fn()}),
    useCreateOrUpdateLWFConfig: () => useMutation({mutationFn: () => Promise.resolve(undefined)}),
    useDeactivateLWFConfig: () => useMutation({mutationFn: (stateCode: string) => deactivateFn(stateCode)}),
  };
});

vi.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({isAuthenticated: true, hasHydrated: true}),
}));

vi.mock('@/lib/hooks/usePermissions', () => ({
  Permissions: {STATUTORY_VIEW: 'STATUTORY:VIEW'},
  usePermissions: () => ({hasPermission: () => true, isReady: true, isPermissionReady: true}),
}));

vi.mock('@/components/layout', () => ({
  AppLayout: ({children}: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/auth/PermissionGate', () => ({
  PermissionGate: ({children}: { children: React.ReactNode }) => <>{children}</>,
}));

function renderPage() {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}, mutations: {retry: false}}});
  return render(
    <MantineProvider>
      <QueryClientProvider client={client}>
        <LWFPage/>
      </QueryClientProvider>
    </MantineProvider>
  );
}

describe('LWF deactivate confirmation', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    deactivateFn.mockReset();
    confirmSpy = vi.spyOn(window, 'confirm');
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  it('opens the confirm dialog instead of window.confirm, and Cancel does not deactivate', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', {name: 'Deactivate LWF configuration'}));

    expect(await screen.findByRole('dialog', {name: 'Deactivate LWF configuration?'})).toBeInTheDocument();
    expect(screen.getByText(/LWF configuration for MH/)).toBeInTheDocument();
    expect(confirmSpy).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', {name: 'Keep active button'}));

    await waitFor(() => expect(screen.queryByRole('dialog', {name: 'Deactivate LWF configuration?'})).toBeNull());
    expect(deactivateFn).not.toHaveBeenCalled();
  });

  it('deactivates once when confirmed', async () => {
    const user = userEvent.setup();
    deactivateFn.mockResolvedValue(undefined);
    renderPage();

    await user.click(screen.getByRole('button', {name: 'Deactivate LWF configuration'}));
    await user.click(await screen.findByRole('button', {name: 'Deactivate button'}));

    await waitFor(() => expect(screen.queryByRole('dialog', {name: 'Deactivate LWF configuration?'})).toBeNull());
    expect(deactivateFn).toHaveBeenCalledTimes(1);
    expect(deactivateFn).toHaveBeenCalledWith('MH');
  });
});
