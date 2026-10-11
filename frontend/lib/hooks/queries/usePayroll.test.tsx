import React from 'react';
import {act, renderHook, waitFor} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useApprovePayrollRun, useLockPayrollRun, useProcessPayrollRun} from './usePayroll';
import {payrollService} from '@/lib/services/hrms/payroll.service';

vi.mock('@/lib/services/hrms/payroll.service', () => ({
  payrollService: {
    processPayrollRun: vi.fn(),
    approvePayrollRun: vi.fn(),
    lockPayrollRun: vi.fn(),
  },
}));

const service = payrollService as unknown as Record<
  'processPayrollRun' | 'approvePayrollRun' | 'lockPayrollRun',
  ReturnType<typeof vi.fn>
>;

function setup() {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}, mutations: {retry: false}}});
  let releaseRefetch: () => void = () => undefined;
  const refetchDone = new Promise<void>((resolve) => {
    releaseRefetch = resolve;
  });
  const invalidate = vi.spyOn(client, 'invalidateQueries').mockImplementation(() => refetchDone);
  const wrapper = ({children}: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return {wrapper, invalidate, releaseRefetch: () => releaseRefetch()};
}

describe('payroll run lifecycle mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.processPayrollRun.mockResolvedValue({id: 'run-1'});
    service.approvePayrollRun.mockResolvedValue({id: 'run-1'});
    service.lockPayrollRun.mockResolvedValue({id: 'run-1'});
  });

  it.each([
    ['process', useProcessPayrollRun],
    ['approve', useApprovePayrollRun],
    ['lock', useLockPayrollRun],
  ])('%s stays pending until the run refetch completes', async (_name, useHook) => {
    const {wrapper, invalidate, releaseRefetch} = setup();
    const {result} = renderHook(() => useHook(), {wrapper});

    act(() => {
      result.current.mutate('run-1');
    });

    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(2));
    // The API call has resolved but the refetch has not, so the action buttons must stay disabled.
    expect(result.current.isPending).toBe(true);

    act(() => releaseRefetch());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isPending).toBe(false);
  });
});
