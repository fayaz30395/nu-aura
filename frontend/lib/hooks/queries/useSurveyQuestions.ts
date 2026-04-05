'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {apiClient} from '@/lib/api/client';
import {notifications} from '@mantine/notifications';
import type {
  QuestionRequest,
  SubmitResponseRequest,
  Survey,
  SurveyAnalyticsSummary,
  SurveyQuestion,
} from '@/lib/types/grow/survey';

// ─── Query Key Factory ─────────────────────────────────────────────────────
export const surveyQuestionKeys = {
  all: ['survey-questions'] as const,
  list: (surveyId: string) => [...surveyQuestionKeys.all, 'list', surveyId] as const,
  analytics: (surveyId: string) => [...surveyQuestionKeys.all, 'analytics', surveyId] as const,
  templates: () => [...surveyQuestionKeys.all, 'templates'] as const,
};

// ─── Query Hooks ───────────────────────────────────────────────────────────

export function useSurveyQuestions(surveyId: string) {
  return useQuery({
    queryKey: surveyQuestionKeys.list(surveyId),
    queryFn: async () => {
      const response = await apiClient.get<SurveyQuestion[]>(
        `/survey-management/${surveyId}/questions`
      );
      return response.data;
    },
    enabled: !!surveyId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSurveyAnalytics(surveyId: string) {
  return useQuery({
    queryKey: surveyQuestionKeys.analytics(surveyId),
    queryFn: async () => {
      const response = await apiClient.get<SurveyAnalyticsSummary>(
        `/survey-management/${surveyId}/analytics`
      );
      return response.data;
    },
    enabled: !!surveyId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSurveyTemplates() {
  return useQuery({
    queryKey: surveyQuestionKeys.templates(),
    queryFn: async () => {
      const response = await apiClient.get<Survey[]>('/survey-management/templates');
      return response.data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

// ─── Mutation Hooks ────────────────────────────────────────────────────────

export function useAddQuestion(surveyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<QuestionRequest, 'surveyId'>) => {
      const response = await apiClient.post<SurveyQuestion>(
        `/survey-management/${surveyId}/questions`,
        {...data, surveyId}
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: surveyQuestionKeys.list(surveyId)});
      notifications.show({
        title: 'Success',
        message: 'Question added successfully',
        color: 'green',
      });
    },
    onError: (error: unknown) => {
      notifications.show({
        title: 'Error',
        message:
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to add question',
        color: 'red',
      });
    },
  });
}

export function useDeleteQuestion(surveyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (questionId: string) => {
      await apiClient.delete(`/survey-management/${surveyId}/questions/${questionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: surveyQuestionKeys.list(surveyId)});
      notifications.show({
        title: 'Success',
        message: 'Question deleted successfully',
        color: 'green',
      });
    },
    onError: (error: unknown) => {
      notifications.show({
        title: 'Error',
        message:
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to delete question',
        color: 'red',
      });
    },
  });
}

export function useSubmitSurveyResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SubmitResponseRequest) => {
      const response = await apiClient.post<void>('/survey-management/submit', data);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: surveyQuestionKeys.analytics(variables.surveyId),
      });
      notifications.show({
        title: 'Success',
        message: 'Survey response submitted successfully',
        color: 'green',
      });
    },
    onError: (error: unknown) => {
      notifications.show({
        title: 'Error',
        message:
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to submit response',
        color: 'red',
      });
    },
  });
}

export function useCloneSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({surveyId, newTitle}: { surveyId: string; newTitle: string }) => {
      const response = await apiClient.post<Survey>(
        `/survey-management/${surveyId}/clone?newTitle=${encodeURIComponent(newTitle)}`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['surveys']});
      notifications.show({
        title: 'Success',
        message: 'Survey cloned successfully',
        color: 'green',
      });
    },
    onError: (error: unknown) => {
      notifications.show({
        title: 'Error',
        message:
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to clone survey',
        color: 'red',
      });
    },
  });
}
