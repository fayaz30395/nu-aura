import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import MyPayslipsPage from './page';

interface AuthState {
  hasHydrated: boolean;
  user: { employeeId?: string; roles: { code: string }[] } | null;
}

const auth: AuthState = {hasHydrated: true, user: null};

const apiGet = vi.fn();
vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: (...args: unknown[]) => apiGet(...args),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => auth,
}));

vi.mock('@/components/layout', () => ({
  AppLayout: ({children}: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion', () => {
  const Pass = ({children}: { children?: React.ReactNode }) => <div>{children}</div>;
  return {PageTransition: Pass, Reveal: Pass, Stagger: Pass, StaggerItem: Pass};
});

function renderPage() {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  return render(
    <QueryClientProvider client={client}>
      <MyPayslipsPage/>
    </QueryClientProvider>
  );
}

describe('/me/payslips states', () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiGet.mockResolvedValue({data: {content: [], totalElements: 0, totalPages: 0, number: 0, size: 100}});
    auth.hasHydrated = true;
    auth.user = null;
  });

  it('shows the no-profile state for a non-admin without an employee profile', () => {
    auth.user = {roles: [{code: 'EMPLOYEE'}]};
    renderPage();

    expect(screen.getByText('No Employee Profile Linked')).toBeTruthy();
  });

  it('does not show the no-profile state for an admin without an employee profile', () => {
    auth.user = {roles: [{code: 'HR_MANAGER'}]};
    renderPage();

    expect(screen.queryByText('No Employee Profile Linked')).toBeNull();
  });

  it('labels totals and the empty state with "All Years" when year 0 is selected', async () => {
    auth.user = {employeeId: 'emp-1', roles: [{code: 'EMPLOYEE'}]};
    renderPage();

    await waitFor(() => expect(screen.getByLabelText('Year')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Year'), {target: {value: '0'}});

    expect(await screen.findByText('Total Earnings (All Years)')).toBeTruthy();
    expect(screen.getByText('No payslips available for All Years')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\(0\)|for 0\b/);
  });

  it('shows the loading skeleton, not the empty state, before hydration', () => {
    auth.hasHydrated = false;
    auth.user = {employeeId: 'emp-1', roles: [{code: 'EMPLOYEE'}]};
    renderPage();

    expect(screen.getAllByLabelText('Loading content').length).toBeGreaterThan(0);
    expect(screen.queryByText('No Payslips Found')).toBeNull();
    expect(screen.queryByText('No Employee Profile Linked')).toBeNull();
  });

  it('shows the loading skeleton while the hydrated self query is still pending', () => {
    apiGet.mockImplementation(() => new Promise(() => undefined));
    auth.user = {employeeId: 'emp-1', roles: [{code: 'EMPLOYEE'}]};
    renderPage();

    expect(screen.getAllByLabelText('Loading content').length).toBeGreaterThan(0);
    expect(screen.queryByText('No Payslips Found')).toBeNull();
  });
});
