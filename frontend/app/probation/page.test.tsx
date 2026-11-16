import React from 'react';
import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {QueryClient, QueryClientProvider, useMutation} from '@tanstack/react-query';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import ProbationPage from './page';

const failFn = vi.fn();

vi.mock('@/lib/hooks/queries/useProbation', () => {
  const probation = {
    id: 'prob-1',
    employeeName: 'Asha Rao',
    department: 'Engineering',
    designation: 'Engineer',
    startDate: '2026-07-01',
    endDate: '2026-12-31',
    durationMonths: 6,
    extensionCount: 0,
    totalExtensionDays: 0,
    status: 'ACTIVE',
    isOverdue: false,
    daysRemaining: 80,
    managerName: 'Ravi',
    averageRating: null,
  };
  const page = {content: [probation], number: 0, totalPages: 1, totalElements: 1};
  const noop = () => Promise.resolve(undefined);
  return {
    useAllProbations: () => ({data: page, isLoading: false}),
    useProbationsEndingSoon: () => ({data: [], isLoading: false}),
    useProbationsByStatus: () => ({data: undefined, isLoading: false}),
    useProbationStatistics: () => ({data: undefined, isLoading: false}),
    useConfirmEmployee: () => useMutation({mutationFn: noop}),
    useExtendProbation: () => useMutation({mutationFn: noop}),
    useFailProbation: () => useMutation({
      mutationFn: (vars: { probationId: string; data: { reason: string } }) => failFn(vars),
    }),
    useAddEvaluation: () => useMutation({mutationFn: noop}),
  };
});

vi.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({isAuthenticated: true, hasHydrated: true}),
}));

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({children}: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/auth/PermissionGate', () => ({
  PermissionGate: ({children}: { children: React.ReactNode }) => <>{children}</>,
}));

function renderPage() {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}, mutations: {retry: false}}});
  return render(
    <QueryClientProvider client={client}>
      <ProbationPage/>
    </QueryClientProvider>
  );
}

describe('Probation fail confirmation', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;
  let promptSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    failFn.mockReset();
    confirmSpy = vi.spyOn(window, 'confirm');
    promptSpy = vi.spyOn(window, 'prompt');
  });

  afterEach(() => {
    confirmSpy.mockRestore();
    promptSpy.mockRestore();
  });

  it('opens the confirm dialog instead of window.confirm, and Cancel does not fail the probation', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', {name: 'Fail'}));

    expect(await screen.findByRole('dialog', {name: 'Fail probation?'})).toBeInTheDocument();
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(promptSpy).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', {name: 'Keep probation button'}));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(failFn).not.toHaveBeenCalled();
  });

  it('requires a reason and fails the probation once', async () => {
    const user = userEvent.setup();
    failFn.mockResolvedValue({id: 'prob-1'});
    renderPage();

    await user.click(screen.getByRole('button', {name: 'Fail'}));
    const confirm = await screen.findByRole('button', {name: 'Fail probation button'});
    expect(confirm).toBeDisabled();

    await user.type(screen.getByLabelText(/reason for failing probation/i), 'Missed targets');
    await user.click(confirm);

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(failFn).toHaveBeenCalledTimes(1);
    expect(failFn).toHaveBeenCalledWith({probationId: 'prob-1', data: {reason: 'Missed targets'}});
  });
});
