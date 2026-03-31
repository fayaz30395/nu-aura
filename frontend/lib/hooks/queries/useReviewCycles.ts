'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewCycleService } from '@/lib/services/grow/performance.service';
import {
  ReviewCycle,
  ReviewCycleRequest,
  ActivateCycleRequest,
  ActivateCycleResponse,
} from '@/lib/types/grow/performance';
import { notifications } from '@mantine/notifications';
import { performanceKeys } from './performanceKeys';

// ─── Review Cycle Hooks ───────────────────────────────────────────────────

export function usePerformanceActiveCycles() {
  return useQuery({
    queryKey: performanceKeys.activeCycles(),
    queryFn: () => reviewCycleService.getActiveCycles(),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function usePerformanceAllCycles(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: performanceKeys.allCycles(page, size),
    queryFn: () => reviewCycleService.getAllCycles(page, size),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function usePerformanceCycleDetail(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: performanceKeys.cycleDetail(id),
    queryFn: () => reviewCycleService.getCycleById(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useCreatePerformanceCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReviewCycleRequest) => reviewCycleService.createCycle(data),
    onSuccess: (_data: ReviewCycle) => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.cycles() });
      notifications.show({ title: 'Success', message: 'Review cycle created successfully', color: 'green' });
    },
    onError: (error: Error) => {
      notifications.show({ title: 'Error', message: error.message || 'Failed to create review cycle', color: 'red' });
    },
  });
}

export function useUpdatePerformanceCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReviewCycleRequest }) =>
      reviewCycleService.updateCycle(id, data),
    onSuccess: (data: ReviewCycle) => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.cycles() });
      queryClient.setQueryData(performanceKeys.cycleDetail(data.id), data);
      notifications.show({ title: 'Success', message: 'Review cycle updated successfully', color: 'green' });
    },
    onError: (error: Error) => {
      notifications.show({ title: 'Error', message: error.message || 'Failed to update review cycle', color: 'red' });
    },
  });
}

export function useActivatePerformanceCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ActivateCycleRequest }) =>
      reviewCycleService.activateCycle(id, data),
    onSuccess: (data: ActivateCycleResponse) => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.cycles() });
      queryClient.setQueryData(performanceKeys.cycleDetail(data.id), data);
      notifications.show({ title: 'Success', message: `Review cycle activated: ${data.reviewsCreated} reviews created`, color: 'green' });
    },
    onError: (error: Error) => {
      notifications.show({ title: 'Error', message: error.message || 'Failed to activate review cycle', color: 'red' });
    },
  });
}

export function useCompletePerformanceCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reviewCycleService.completeCycle(id),
    onSuccess: (data: ReviewCycle) => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.cycles() });
      queryClient.setQueryData(performanceKeys.cycleDetail(data.id), data);
      notifications.show({ title: 'Success', message: 'Review cycle completed', color: 'green' });
    },
    onError: (error: Error) => {
      notifications.show({ title: 'Error', message: error.message || 'Failed to complete review cycle', color: 'red' });
    },
  });
}

export function useDeletePerformanceCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reviewCycleService.deleteCycle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.cycles() });
      notifications.show({ title: 'Success', message: 'Review cycle deleted successfully', color: 'green' });
    },
    onError: (error: Error) => {
      notifications.show({ title: 'Error', message: error.message || 'Failed to delete review cycle', color: 'red' });
    },
  });
}
