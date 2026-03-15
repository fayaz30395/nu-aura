'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { surveyService } from '@/lib/services/survey.service';
import type { Survey, SurveyRequest, SurveyStatus } from '@/lib/types/survey';
import { notifications } from '@mantine/notifications';

// ─── Query Key Factory ─────────────────────────────────────────────────────
export const surveyKeys = {
  all: ['surveys'] as const,
  lists: () => [...surveyKeys.all, 'list'] as const,
  list: (page: number, size: number) => [...surveyKeys.lists(), { page, size }] as const,
  detail: (id: string) => [...surveyKeys.all, 'detail', id] as const,
  byStatus: (status: SurveyStatus) => [...surveyKeys.all, 'status', status] as const,
  active: () => [...surveyKeys.all, 'active'] as const,
};

// ─── Query Hooks ───────────────────────────────────────────────────────────

export function useAllSurveys(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: surveyKeys.list(page, size),
    queryFn: () => surveyService.getAllSurveys(page, size),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSurveyDetail(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: surveyKeys.detail(id),
    queryFn: () => surveyService.getSurveyById(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSurveysByStatus(status: SurveyStatus) {
  return useQuery({
    queryKey: surveyKeys.byStatus(status),
    queryFn: () => surveyService.getSurveysByStatus(status),
    enabled: !!status,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useActiveSurveys() {
  return useQuery({
    queryKey: surveyKeys.active(),
    queryFn: () => surveyService.getActiveSurveys(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ─── Mutation Hooks ────────────────────────────────────────────────────────

export function useCreateSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SurveyRequest) => surveyService.createSurvey(data),
    onSuccess: (newSurvey) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: surveyKeys.lists() });
      notifications.show({
        title: 'Success',
        message: 'Survey created successfully',
        color: 'green',
      });
    },
    onError: (error: unknown) => {
      notifications.show({
        title: 'Error',
        message: (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create survey',
        color: 'red',
      });
    },
  });
}

export function useUpdateSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ surveyId, data }: { surveyId: string; data: SurveyRequest }) =>
      surveyService.updateSurvey(surveyId, data),
    onSuccess: (updatedSurvey) => {
      queryClient.invalidateQueries({ queryKey: surveyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: surveyKeys.detail(updatedSurvey.id) });
      notifications.show({
        title: 'Success',
        message: 'Survey updated successfully',
        color: 'green',
      });
    },
    onError: (error: unknown) => {
      notifications.show({
        title: 'Error',
        message: (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update survey',
        color: 'red',
      });
    },
  });
}

export function useUpdateSurveyStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ surveyId, status }: { surveyId: string; status: SurveyStatus }) =>
      surveyService.updateStatus(surveyId, status),
    onSuccess: (updatedSurvey) => {
      queryClient.invalidateQueries({ queryKey: surveyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: surveyKeys.detail(updatedSurvey.id) });
    },
  });
}

export function useLaunchSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (surveyId: string) => surveyService.launchSurvey(surveyId),
    onSuccess: (launchedSurvey) => {
      queryClient.invalidateQueries({ queryKey: surveyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: surveyKeys.detail(launchedSurvey.id) });
      queryClient.invalidateQueries({ queryKey: surveyKeys.active() });
      notifications.show({
        title: 'Success',
        message: 'Survey launched successfully',
        color: 'green',
      });
    },
    onError: (error: unknown) => {
      notifications.show({
        title: 'Error',
        message: (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to launch survey',
        color: 'red',
      });
    },
  });
}

export function useCompleteSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (surveyId: string) => surveyService.completeSurvey(surveyId),
    onSuccess: (completedSurvey) => {
      queryClient.invalidateQueries({ queryKey: surveyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: surveyKeys.detail(completedSurvey.id) });
      notifications.show({
        title: 'Success',
        message: 'Survey completed successfully',
        color: 'green',
      });
    },
    onError: (error: unknown) => {
      notifications.show({
        title: 'Error',
        message: (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to complete survey',
        color: 'red',
      });
    },
  });
}

export function useDeleteSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (surveyId: string) => surveyService.deleteSurvey(surveyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: surveyKeys.lists() });
      notifications.show({
        title: 'Success',
        message: 'Survey deleted successfully',
        color: 'green',
      });
    },
    onError: (error: unknown) => {
      notifications.show({
        title: 'Error',
        message: (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete survey',
        color: 'red',
      });
    },
  });
}
