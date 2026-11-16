import React from 'react';
import {renderHook, waitFor} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {apiClient} from '@/lib/api/client';
import {useTodayAttendance} from './useAttendance';

vi.mock('@/lib/api/client', () => ({
  apiClient: {get: vi.fn(), post: vi.fn()},
}));

const get = apiClient.get as unknown as ReturnType<typeof vi.fn>;

function wrapperFor(client: QueryClient) {
  return ({children}: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('useTodayAttendance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads the server-side today record from /attendance/today', async () => {
    const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
    get.mockResolvedValue({
      data: {id: 'att-1', employeeId: 'emp-1', attendanceDate: '2026-11-15', checkInTime: '2026-11-15T09:00:00'},
    });

    const {result} = renderHook(() => useTodayAttendance(true), {wrapper: wrapperFor(client)});

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(get).toHaveBeenCalledWith('/attendance/today');
    expect(result.current.data?.id).toBe('att-1');
    expect(result.current.data?.checkInTime).toBeTruthy();
  });

  it('does not fetch when disabled', () => {
    const client = new QueryClient({defaultOptions: {queries: {retry: false}}});

    renderHook(() => useTodayAttendance(false), {wrapper: wrapperFor(client)});

    expect(get).not.toHaveBeenCalled();
  });
});
