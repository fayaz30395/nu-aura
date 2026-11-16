import React from 'react';
import {MantineProvider} from '@mantine/core';
import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MutationCache, QueryClient, QueryClientProvider, useMutation} from '@tanstack/react-query';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import OKRPage from './page';

const createFn = vi.fn();
const deleteObjectiveFn = vi.fn();
const progressFn = vi.fn();

vi.mock('@/lib/hooks/queries/useOkr', () => {
  const objective = {
    id: 'obj-1',
    title: 'Grow revenue',
    description: '',
    startDate: '2026-01-01',
    endDate: '2026-03-31',
    objectiveLevel: 'INDIVIDUAL',
    status: 'ACTIVE',
    weight: 1,
    isStretchGoal: false,
    progressPercentage: 10,
    keyResults: [{
      id: 'kr-1',
      title: 'Close deals',
      status: 'ON_TRACK',
      startValue: 0,
      targetValue: 100,
      currentValue: 10,
      measurementUnit: '%',
      progressPercentage: 10,
    }],
  };
  const noop = () => Promise.resolve(undefined);
  return {
    useMyObjectives: () => ({data: [objective], isLoading: false}),
    useCompanyObjectives: () => ({data: [], isLoading: false}),
    useCreateObjective: () => useMutation({mutationFn: (data: unknown) => createFn(data)}),
    useUpdateObjective: () => useMutation({mutationFn: noop}),
    useDeleteObjective: () => useMutation({mutationFn: (id: string) => deleteObjectiveFn(id)}),
    useAddKeyResult: () => useMutation({mutationFn: noop}),
    useUpdateKeyResultProgress: () => useMutation({mutationFn: (args: unknown) => progressFn(args)}),
    useDeleteKeyResult: () => useMutation({mutationFn: noop}),
  };
});

vi.mock('@/components/layout', () => ({
  AppLayout: ({children}: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/auth/PermissionGate', () => ({
  PermissionGate: ({children}: { children: React.ReactNode }) => <>{children}</>,
}));

function deferred<T = unknown>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {promise, resolve, reject};
}

const globalErrorToast = vi.fn();

function renderPage() {
  const client = new QueryClient({
    mutationCache: new MutationCache({onError: () => globalErrorToast()}),
    defaultOptions: {queries: {retry: false}, mutations: {retry: false}},
  });
  return render(
    <MantineProvider>
      <QueryClientProvider client={client}>
        <OKRPage/>
      </QueryClientProvider>
    </MantineProvider>
  );
}

async function openCreateModal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', {name: /new objective/i}));
  await user.type(await screen.findByLabelText(/title \*/i), 'Ship v2');
}

describe('OKR page duplicate-submit guards', () => {
  beforeEach(() => {
    createFn.mockReset();
    deleteObjectiveFn.mockReset();
    progressFn.mockReset();
    globalErrorToast.mockReset();
  });

  it('creates an objective once even when Create is clicked twice', async () => {
    const user = userEvent.setup();
    const pending = deferred();
    createFn.mockReturnValue(pending.promise);
    renderPage();
    await openCreateModal(user);

    const createButton = screen.getByRole('button', {name: 'Create'});
    await user.click(createButton);
    await user.click(createButton);

    await waitFor(() => expect(createFn).toHaveBeenCalledTimes(1));
    expect(createButton).toBeDisabled();

    pending.resolve({id: 'obj-2'});
    await waitFor(() => expect(screen.queryByRole('button', {name: 'Create'})).toBeNull());
    expect(createFn).toHaveBeenCalledTimes(1);
  });

  it('keeps the modal open and re-enables Create after a failure, with no retry', async () => {
    const user = userEvent.setup();
    createFn.mockRejectedValue(new Error('boom'));
    renderPage();
    await openCreateModal(user);

    const createButton = screen.getByRole('button', {name: 'Create'});
    await user.click(createButton);

    await waitFor(() => expect(createButton).toBeEnabled());
    expect(createFn).toHaveBeenCalledTimes(1);
    expect(globalErrorToast).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', {name: 'Create'})).toBeInTheDocument();
  });

  it('disables the delete confirmation while the delete is pending', async () => {
    const user = userEvent.setup();
    const pending = deferred();
    deleteObjectiveFn.mockReturnValue(pending.promise);
    renderPage();

    await user.click(screen.getByRole('button', {name: 'Delete objective'}));
    const confirm = await screen.findByRole('button', {name: 'Delete button'});
    await user.click(confirm);
    await user.click(confirm);

    await waitFor(() => expect(confirm).toBeDisabled());
    expect(deleteObjectiveFn).toHaveBeenCalledTimes(1);

    pending.resolve(undefined);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(deleteObjectiveFn).toHaveBeenCalledTimes(1);
  });

  it('saves key-result progress once on blur instead of on every keystroke', async () => {
    const user = userEvent.setup();
    progressFn.mockResolvedValue(undefined);
    renderPage();

    await user.click(screen.getByRole('button', {name: 'Expand objective'}));
    const input = await screen.findByLabelText('Current value for Close deals');
    await user.clear(input);
    await user.type(input, '45');
    expect(progressFn).not.toHaveBeenCalled();

    await user.tab();
    await waitFor(() => expect(progressFn).toHaveBeenCalledTimes(1));
    expect(progressFn).toHaveBeenCalledWith({id: 'kr-1', value: 45});
  });

  it('saves key-result progress on Enter and skips unchanged values', async () => {
    const user = userEvent.setup();
    progressFn.mockResolvedValue(undefined);
    renderPage();

    await user.click(screen.getByRole('button', {name: 'Expand objective'}));
    const input = await screen.findByLabelText('Current value for Close deals');
    await user.click(input);
    await user.tab();
    expect(progressFn).not.toHaveBeenCalled();

    await user.clear(input);
    await user.type(input, '60{Enter}');
    await waitFor(() => expect(progressFn).toHaveBeenCalledTimes(1));
    expect(progressFn).toHaveBeenCalledWith({id: 'kr-1', value: 60});
  });
});
