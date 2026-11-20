import React from 'react';
import {configure, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MutationCache, QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {MantineProvider} from '@mantine/core';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import MyLeavesPage from './page';

const cancelFn = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();
const globalErrorToast = vi.fn();
const notificationShow = vi.fn();

vi.mock('@mantine/notifications', () => ({
  notifications: {show: (...args: unknown[]) => notificationShow(...args)},
}));

vi.mock('@/lib/services/hrms/leave.service', () => ({
  leaveService: {cancelLeaveRequest: (id: string, reason: string) => cancelFn({id, reason})},
}));

vi.mock('@/lib/hooks/queries/useLeaves', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/hooks/queries/useLeaves')>();
  const page = {
    content: [{
      id: 'lr-1',
      requestNumber: 'LR-001',
      leaveTypeId: 'lt-1',
      startDate: '2026-11-02',
      endDate: '2026-11-03',
      totalDays: 2,
      isHalfDay: false,
      reason: 'Family trip',
      status: 'PENDING',
      appliedOn: '2026-10-01',
    }],
    totalPages: 1,
  };
  return {
    useActiveLeaveTypes: () => ({data: [{id: 'lt-1', leaveName: 'Casual Leave'}]}),
    useEmployeeLeaveRequests: () => ({data: page}),
    useLeaveRequestsByStatus: () => ({data: undefined}),
    useCancelLeaveRequest: actual.useCancelLeaveRequest,
  };
});

vi.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({user: {employeeId: 'emp-1'}}),
}));

vi.mock('@/lib/hooks/usePermissions', () => ({
  Permissions: {LEAVE_VIEW_SELF: 'LEAVE:VIEW_SELF'},
  usePermissions: () => ({hasPermission: () => true, isPermissionReady: true}),
}));

vi.mock('@/components/notifications/ToastProvider', () => ({
  useToast: () => ({success: toastSuccess, error: toastError, warning: vi.fn(), info: vi.fn()}),
}));

vi.mock('@/components/layout', () => ({
  AppLayout: ({children}: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion', () => {
  const Pass = ({children}: { children?: React.ReactNode }) => <div>{children}</div>;
  return {PageTransition: Pass, Reveal: Pass};
});

function deferred<T = unknown>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return {promise, resolve};
}

function renderPage() {
  const client = new QueryClient({
    mutationCache: new MutationCache({
      onError: (_error, _vars, _ctx, mutation) => {
        if (mutation.meta?.skipGlobalError === true) return;
        globalErrorToast();
      },
    }),
    defaultOptions: {queries: {retry: false}, mutations: {retry: false}},
  });
  return render(
    <MantineProvider>
      <QueryClientProvider client={client}>
        <MyLeavesPage/>
      </QueryClientProvider>
    </MantineProvider>
  );
}

async function openReasonDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getAllByRole('button', {name: 'Row actions'})[0]);
  // Mantine's menu transition can exceed the default 1s findBy timeout under full-suite load.
  await user.click(await screen.findByRole('menuitem', {name: 'Cancel request'}, {timeout: 5000}));
  await user.click(await screen.findByRole('button', {name: 'Cancel Request button'}));
  await user.type(await screen.findByLabelText(/cancellation reason/i), 'Plans changed');
  return screen.getByRole('button', {name: 'Submit button'});
}

// Mantine menu and modal transitions can exceed the default 1s async timeout under full-suite load.
configure({asyncUtilTimeout: 5000});

describe('My Leaves cancel flow', () => {
  beforeEach(() => {
    cancelFn.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    globalErrorToast.mockReset();
    notificationShow.mockReset();
  });

  // retry: the Mantine menu transition occasionally leaves the menu item unqueryable under full-suite load.
  it('cancels once even when Submit is clicked twice, and disables it while pending', {retry: 2}, async () => {
    const user = userEvent.setup();
    const pending = deferred();
    cancelFn.mockReturnValue(pending.promise);
    renderPage();

    const submit = await openReasonDialog(user);
    await user.click(submit);
    await user.click(submit);

    await waitFor(() => expect(submit).toBeDisabled());
    expect(cancelFn).toHaveBeenCalledTimes(1);
    expect(cancelFn).toHaveBeenCalledWith({id: 'lr-1', reason: 'Plans changed'});

    pending.resolve({id: 'lr-1'});
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledTimes(1));
    expect(cancelFn).toHaveBeenCalledTimes(1);
  });

  it('shows exactly one, specific error notification when cancelling fails', {retry: 2}, async () => {
    const user = userEvent.setup();
    cancelFn.mockRejectedValue(new Error('Server error'));
    renderPage();

    const submit = await openReasonDialog(user);
    await user.click(submit);

    await waitFor(() => expect(notificationShow).toHaveBeenCalledTimes(1));
    expect(notificationShow).toHaveBeenCalledWith(
      expect.objectContaining({message: "Couldn't cancel this leave request", color: 'red'}),
    );
    await waitFor(() => expect(submit).toBeEnabled());
    expect(globalErrorToast).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(cancelFn).toHaveBeenCalledTimes(1);
  });
});
