'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { goalService } from '@/lib/services/performance.service';
import { Goal, GoalRequest } from '@/lib/types/performance';
import { notifications } from '@mantine/notifications';
import { performanceKeys } from './performanceKeys';

// ─── Goal Hooks ───────────────────────────────────────────────────────────

export function useAllGoals(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: performanceKeys.allGoals(page, size),
    queryFn: () => goalService.getAllGoals(page, size),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useEmployeeGoals(employeeId: string) {
  return useQuery({
    queryKey: performanceKeys.employeeGoals(employeeId),
    queryFn: () => goalService.getByEmployee(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useTeamGoals(managerId: string) {
  return useQuery({
    queryKey: performanceKeys.teamGoals(managerId),
    queryFn: () => goalService.getTeamGoals(managerId),
    enabled: !!managerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useGoalDetail(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: performanceKeys.goalDetail(id),
    queryFn: () => goalService.getGoalById(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useGoalAnalytics() {
  return useQuery({
    queryKey: performanceKeys.goalAnalytics(),
    queryFn: () => goalService.getGoalAnalytics(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GoalRequest) => goalService.createGoal(data),
    onSuccess: (_data: Goal) => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.goals() });
      notifications.show({
        title: 'Success',
        message: 'Goal created successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create goal',
        color: 'red',
      });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: GoalRequest }) =>
      goalService.updateGoal(id, data),
    onSuccess: (data: Goal) => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.goals() });
      queryClient.setQueryData(performanceKeys.goalDetail(data.id), data);
      notifications.show({
        title: 'Success',
        message: 'Goal updated successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update goal',
        color: 'red',
      });
    },
  });
}

export function useUpdateGoalProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, progress }: { id: string; progress: number }) =>
      goalService.updateProgress(id, progress),
    onSuccess: (data: Goal) => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.goals() });
      queryClient.setQueryData(performanceKeys.goalDetail(data.id), data);
      notifications.show({
        title: 'Success',
        message: 'Goal progress updated',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update goal progress',
        color: 'red',
      });
    },
  });
}

export function useApproveGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, approverId }: { id: string; approverId: string }) => goalService.approveGoal(id, approverId),
    onSuccess: (data: Goal) => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.goals() });
      queryClient.setQueryData(performanceKeys.goalDetail(data.id), data);
      notifications.show({
        title: 'Success',
        message: 'Goal approved',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to approve goal',
        color: 'red',
      });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => goalService.deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.goals() });
      notifications.show({
        title: 'Success',
        message: 'Goal deleted successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to delete goal',
        color: 'red',
      });
    },
  });
}
