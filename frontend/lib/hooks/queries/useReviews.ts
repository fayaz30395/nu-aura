'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {reviewService} from '@/lib/services/grow/performance.service';
import {PerformanceReview, ReviewRequest} from '@/lib/types/grow/performance';
import {notifications} from '@mantine/notifications';
import {performanceKeys} from './performanceKeys';

// ─── Performance Review Hooks ──────────────────────────────────────────────

export function useAllReviews(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: performanceKeys.allReviews(page, size),
    queryFn: () => reviewService.getAllReviews(page, size),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useEmployeeReviews(employeeId: string) {
  return useQuery({
    queryKey: performanceKeys.employeeReviews(employeeId),
    queryFn: () => reviewService.getByEmployee(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function usePendingReviews(reviewerId: string) {
  return useQuery({
    queryKey: performanceKeys.pendingReviews(reviewerId),
    queryFn: () => reviewService.getPendingReviews(reviewerId),
    enabled: !!reviewerId,
    staleTime: 2 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useReviewDetail(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: performanceKeys.reviewDetail(id),
    queryFn: () => reviewService.getReviewById(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReviewRequest) => reviewService.createReview(data),
    onSuccess: (_data: PerformanceReview) => {
      queryClient.invalidateQueries({queryKey: performanceKeys.reviews()});
      notifications.show({title: 'Success', message: 'Performance review created successfully', color: 'green'});
    },
    onError: (error: Error) => {
      notifications.show({title: 'Error', message: error.message || 'Failed to create review', color: 'red'});
    },
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({id, data}: { id: string; data: ReviewRequest }) =>
      reviewService.updateReview(id, data),
    onSuccess: (data: PerformanceReview) => {
      queryClient.invalidateQueries({queryKey: performanceKeys.reviews()});
      queryClient.setQueryData(performanceKeys.reviewDetail(data.id), data);
      notifications.show({title: 'Success', message: 'Performance review updated successfully', color: 'green'});
    },
    onError: (error: Error) => {
      notifications.show({title: 'Error', message: error.message || 'Failed to update review', color: 'red'});
    },
  });
}

export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reviewService.submitReview(id),
    onSuccess: (data: PerformanceReview) => {
      queryClient.invalidateQueries({queryKey: performanceKeys.reviews()});
      queryClient.setQueryData(performanceKeys.reviewDetail(data.id), data);
      notifications.show({title: 'Success', message: 'Performance review submitted', color: 'green'});
    },
    onError: (error: Error) => {
      notifications.show({title: 'Error', message: error.message || 'Failed to submit review', color: 'red'});
    },
  });
}

export function useCompleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reviewService.completeReview(id),
    onSuccess: (data: PerformanceReview) => {
      queryClient.invalidateQueries({queryKey: performanceKeys.reviews()});
      queryClient.setQueryData(performanceKeys.reviewDetail(data.id), data);
      notifications.show({title: 'Success', message: 'Performance review completed', color: 'green'});
    },
    onError: (error: Error) => {
      notifications.show({title: 'Error', message: error.message || 'Failed to complete review', color: 'red'});
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reviewService.deleteReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: performanceKeys.reviews()});
      notifications.show({title: 'Success', message: 'Performance review deleted successfully', color: 'green'});
    },
    onError: (error: Error) => {
      notifications.show({title: 'Error', message: error.message || 'Failed to delete review', color: 'red'});
    },
  });
}

// ─── Competency Hooks ────────────────────────────────────────────────────────

export function useDeleteCompetency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({id, reviewId}: { id: string; reviewId: string }) =>
      reviewService.deleteCompetency(id).then(() => ({reviewId})),
    onSuccess: ({reviewId}: { reviewId: string }) => {
      queryClient.invalidateQueries({
        queryKey: performanceKeys.reviewCompetencies(reviewId),
      });
      notifications.show({title: 'Success', message: 'Competency removed', color: 'green'});
    },
    onError: (error: Error) => {
      notifications.show({title: 'Error', message: error.message || 'Failed to remove competency', color: 'red'});
    },
  });
}
