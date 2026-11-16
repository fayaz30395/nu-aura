'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {notifications} from '@mantine/notifications';
import {apiClient} from '@/lib/api/client';
import {PagedShiftSwaps, ShiftSwapAction, ShiftSwapFormData, ShiftSwapRequest, ShiftSwapTab} from '../_components/types';

interface ApiError {
  response?: {data?: {message?: string}};
}

const ACTION_LABELS: Record<ShiftSwapAction, string> = {
  approve: 'approved',
  reject: 'rejected',
  accept: 'accepted',
  decline: 'declined',
  cancel: 'cancelled',
};

/** The three shift-swap lists; only the active tab's query is enabled. */
export function useShiftSwapLists(employeeId: string | undefined, tab: ShiftSwapTab, page: number, size: number) {
  const my = useQuery<PagedShiftSwaps>({
    queryKey: ['shift-swap', 'my', employeeId, page, size],
    queryFn: () =>
      apiClient
        .get<PagedShiftSwaps>(`/shift-swaps/my-requests/${employeeId}`, {params: {page, size}})
        .then((r) => r.data),
    enabled: tab === 'my' && !!employeeId,
  });
  const incoming = useQuery<ShiftSwapRequest[]>({
    queryKey: ['shift-swap', 'incoming', employeeId],
    queryFn: () => apiClient.get<ShiftSwapRequest[]>(`/shift-swaps/incoming/${employeeId}`).then((r) => r.data),
    enabled: tab === 'incoming' && !!employeeId,
  });
  const approval = useQuery<ShiftSwapRequest[]>({
    queryKey: ['shift-swap', 'pending-approval'],
    queryFn: () => apiClient.get<ShiftSwapRequest[]>('/shift-swaps/pending-approval').then((r) => r.data),
    enabled: tab === 'approval' && !!employeeId,
  });
  return {my, incoming, approval};
}

export function useSubmitShiftSwap(employeeId: string | undefined, onDone: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ShiftSwapFormData) => apiClient.post('/shift-swaps', {...data, requesterEmployeeId: employeeId}),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['shift-swap']});
      onDone();
    },
    meta: {skipGlobalError: true},
    onError: () => notifications.show({title: 'Error', message: 'Failed to submit shift swap request', color: 'red'}),
  });
}

export function useShiftSwapAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({id, action, payload}: {id: string; action: ShiftSwapAction; payload: Record<string, string>}) =>
      apiClient.post(`/shift-swaps/${id}/${action}`, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({queryKey: ['shift-swap']});
      notifications.show({
        title: 'Success',
        message: `Shift swap request ${ACTION_LABELS[variables.action] ?? variables.action} successfully`,
        color: 'green',
      });
    },
    meta: {skipGlobalError: true},
    onError: (error: ApiError) => {
      notifications.show({
        title: 'Action Failed',
        message: error?.response?.data?.message || 'Failed to process the request',
        color: 'red',
      });
    },
  });
}
