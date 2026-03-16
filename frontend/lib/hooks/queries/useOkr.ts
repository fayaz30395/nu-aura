'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { performanceRevolutionService } from '@/lib/services/performance.service';
import { okrService } from '@/lib/services/okr.service';
import { Objective, KeyResult } from '@/lib/types/performance';
import type { ObjectiveRequest, KeyResultRequest } from '@/lib/services/okr.service';
import { notifications } from '@mantine/notifications';
import { performanceKeys } from './performanceKeys';

// ─── OKR / Performance Revolution Hooks ────────────────────────────────────

export function useOKRGraph() {
  return useQuery({
    queryKey: performanceKeys.okrGraph(),
    queryFn: () => performanceRevolutionService.getOKRGraph(),
    staleTime: 10 * 60 * 1000,
  });
}

export function usePerformanceSpider(employeeId: string) {
  return useQuery({
    queryKey: performanceKeys.performanceSpider(employeeId),
    queryFn: () => performanceRevolutionService.getPerformanceSpider(employeeId),
    enabled: !!employeeId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useOkrDashboardSummary() {
  return useQuery({
    queryKey: [...performanceKeys.okr(), 'dashboard-summary'],
    queryFn: () => okrService.getDashboardSummary(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useMyObjectives() {
  return useQuery({
    queryKey: [...performanceKeys.okr(), 'my'],
    queryFn: () => okrService.getMyObjectives(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCompanyObjectives() {
  return useQuery({
    queryKey: [...performanceKeys.okr(), 'company'],
    queryFn: () => okrService.getCompanyObjectives(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useObjective(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: [...performanceKeys.okr(), 'detail', id],
    queryFn: () => okrService.getObjective(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateObjective() {
  const queryClient = useQueryClient();

  return useMutation<Objective, Error, ObjectiveRequest>({
    mutationFn: (data: ObjectiveRequest) => okrService.createObjective(data) as unknown as Promise<Objective>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.okr(), 'my'] });
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.okr(), 'company'] });
      notifications.show({ title: 'Success', message: 'Objective created successfully', color: 'green' });
    },
    onError: (error: Error) => {
      notifications.show({ title: 'Error', message: error.message || 'Failed to create objective', color: 'red' });
    },
  });
}

export function useUpdateObjective() {
  const queryClient = useQueryClient();

  return useMutation<Objective, Error, { id: string; data: ObjectiveRequest }>({
    mutationFn: ({ id, data }: { id: string; data: ObjectiveRequest }) =>
      okrService.updateObjective(id, data) as unknown as Promise<Objective>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.okr(), 'my'] });
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.okr(), 'company'] });
      notifications.show({ title: 'Success', message: 'Objective updated successfully', color: 'green' });
    },
    onError: (error: Error) => {
      notifications.show({ title: 'Error', message: error.message || 'Failed to update objective', color: 'red' });
    },
  });
}

export function useDeleteObjective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => okrService.deleteObjective(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.okr(), 'my'] });
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.okr(), 'company'] });
      notifications.show({ title: 'Success', message: 'Objective deleted successfully', color: 'green' });
    },
    onError: (error: Error) => {
      notifications.show({ title: 'Error', message: error.message || 'Failed to delete objective', color: 'red' });
    },
  });
}

export function useApproveObjective() {
  const queryClient = useQueryClient();

  return useMutation<Objective, Error, string>({
    mutationFn: (id: string) => okrService.approveObjective(id) as unknown as Promise<Objective>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.okr(), 'my'] });
      notifications.show({ title: 'Success', message: 'Objective approved', color: 'green' });
    },
    onError: (error: Error) => {
      notifications.show({ title: 'Error', message: error.message || 'Failed to approve objective', color: 'red' });
    },
  });
}

export function useUpdateObjectiveStatus() {
  const queryClient = useQueryClient();

  return useMutation<Objective, Error, { id: string; status: string }>({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      okrService.updateObjectiveStatus(id, status) as unknown as Promise<Objective>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.okr(), 'my'] });
      notifications.show({ title: 'Success', message: 'Objective status updated', color: 'green' });
    },
    onError: (error: Error) => {
      notifications.show({ title: 'Error', message: error.message || 'Failed to update status', color: 'red' });
    },
  });
}

export function useAddKeyResult() {
  const queryClient = useQueryClient();

  return useMutation<KeyResult, Error, { objectiveId: string; data: KeyResultRequest }>({
    mutationFn: ({ objectiveId, data }: { objectiveId: string; data: KeyResultRequest }) =>
      okrService.addKeyResult(objectiveId, data) as unknown as Promise<KeyResult>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.okr(), 'my'] });
      notifications.show({ title: 'Success', message: 'Key result added successfully', color: 'green' });
    },
    onError: (error: Error) => {
      notifications.show({ title: 'Error', message: error.message || 'Failed to add key result', color: 'red' });
    },
  });
}

export function useUpdateKeyResultProgress() {
  const queryClient = useQueryClient();

  return useMutation<KeyResult, Error, { id: string; value: number }>({
    mutationFn: ({ id, value }: { id: string; value: number }) =>
      okrService.updateKeyResultProgress(id, value) as unknown as Promise<KeyResult>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.okr(), 'my'] });
      notifications.show({ title: 'Success', message: 'Key result progress updated', color: 'green' });
    },
    onError: (error: Error) => {
      notifications.show({ title: 'Error', message: error.message || 'Failed to update progress', color: 'red' });
    },
  });
}

export function useDeleteKeyResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => okrService.deleteKeyResult(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.okr(), 'my'] });
      notifications.show({ title: 'Success', message: 'Key result deleted successfully', color: 'green' });
    },
    onError: (error: Error) => {
      notifications.show({ title: 'Error', message: error.message || 'Failed to delete key result', color: 'red' });
    },
  });
}

export function useCreateCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => okrService.createCheckIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.okr()] });
      notifications.show({ title: 'Success', message: 'Check-in recorded successfully', color: 'green' });
    },
    onError: (error: Error) => {
      notifications.show({ title: 'Error', message: error.message || 'Failed to record check-in', color: 'red' });
    },
  });
}
