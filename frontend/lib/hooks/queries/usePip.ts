'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pipService } from '@/lib/services/grow/performance.service';
import type { CreatePIPRequest as CreatePIPRequestService, PIPCheckInRequest as PIPCheckInRequestService, ClosePIPRequest as ClosePIPRequestService } from '@/lib/services/grow/performance.service';
import { notifications } from '@mantine/notifications';
import { performanceKeys } from './performanceKeys';

// ─── PIP Hooks ────────────────────────────────────────────────────────────

export function usePips(employeeId?: string, managerId?: string) {
  return useQuery({
    queryKey: [...performanceKeys.all, 'pip', { employeeId, managerId }],
    queryFn: () => pipService.getAll(employeeId, managerId),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePipDetail(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: [...performanceKeys.all, 'pip', 'detail', id],
    queryFn: () => pipService.getById(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePIPRequestService) => pipService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.all, 'pip'] });
      notifications.show({ title: 'Success', message: 'PIP created successfully', color: 'green' });
    },
    onError: (error: Error) => {
      notifications.show({ title: 'Error', message: error.message || 'Failed to create PIP', color: 'red' });
    },
  });
}

export function useRecordPipCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PIPCheckInRequestService }) =>
      pipService.recordCheckIn(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.all, 'pip'] });
      notifications.show({ title: 'Success', message: 'Check-in recorded successfully', color: 'green' });
    },
    onError: (error: Error) => {
      notifications.show({ title: 'Error', message: error.message || 'Failed to record check-in', color: 'red' });
    },
  });
}

export function useClosePip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ClosePIPRequestService }) =>
      pipService.close(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.all, 'pip'] });
      notifications.show({ title: 'Success', message: 'PIP closed successfully', color: 'green' });
    },
    onError: (error: Error) => {
      notifications.show({ title: 'Error', message: error.message || 'Failed to close PIP', color: 'red' });
    },
  });
}
