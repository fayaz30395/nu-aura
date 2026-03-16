'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedbackService } from '@/lib/services/performance.service';
import { FeedbackRequest } from '@/lib/types/performance';
import { notifications } from '@mantine/notifications';
import { performanceKeys } from './performanceKeys';

// ─── Feedback Hooks ───────────────────────────────────────────────────────

export function useReceivedFeedback(employeeId: string) {
  return useQuery({
    queryKey: [...performanceKeys.feedback(), 'received', employeeId],
    queryFn: () => feedbackService.getReceivedFeedback(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGivenFeedback(employeeId: string) {
  return useQuery({
    queryKey: [...performanceKeys.feedback(), 'given', employeeId],
    queryFn: () => feedbackService.getGivenFeedback(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FeedbackRequest) => feedbackService.giveFeedback(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.feedback() });
      notifications.show({ title: 'Success', message: 'Feedback submitted successfully', color: 'green' });
    },
    onError: (error: Error) => {
      notifications.show({ title: 'Error', message: error.message || 'Failed to submit feedback', color: 'red' });
    },
  });
}

export function useUpdateFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FeedbackRequest }) =>
      feedbackService.updateFeedback(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.feedback() });
      notifications.show({ title: 'Success', message: 'Feedback updated successfully', color: 'green' });
    },
    onError: (error: Error) => {
      notifications.show({ title: 'Error', message: error.message || 'Failed to update feedback', color: 'red' });
    },
  });
}

export function useDeleteFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => feedbackService.deleteFeedback(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.feedback() });
      notifications.show({ title: 'Success', message: 'Feedback deleted successfully', color: 'green' });
    },
    onError: (error: Error) => {
      notifications.show({ title: 'Error', message: error.message || 'Failed to delete feedback', color: 'red' });
    },
  });
}
