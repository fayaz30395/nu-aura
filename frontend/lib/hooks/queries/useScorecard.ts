'use client';

import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {notifications} from '@mantine/notifications';
import {scorecardService} from '@/lib/services/hire/scorecard.service';
import type {
  CreateScorecardRequest,
  UpdateScorecardRequest,
  CreateScorecardTemplateRequest,
} from '@/lib/types/hire/scorecard';

// ==================== Query Keys ====================

export const scorecardKeys = {
  all: ['scorecards'] as const,
  byApplicant: (applicantId: string) =>
    [...scorecardKeys.all, 'applicant', applicantId] as const,
  byInterview: (interviewId: string) =>
    [...scorecardKeys.all, 'interview', interviewId] as const,
  templates: () => [...scorecardKeys.all, 'templates'] as const,
};

// ==================== Query Hooks ====================

export function useApplicantScorecards(applicantId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: scorecardKeys.byApplicant(applicantId),
    queryFn: () => scorecardService.getScorecardsByApplicant(applicantId),
    enabled: enabled && !!applicantId,
    staleTime: 3 * 60 * 1000,
  });
}

export function useInterviewScorecards(interviewId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: scorecardKeys.byInterview(interviewId),
    queryFn: () => scorecardService.getScorecardsByInterview(interviewId),
    enabled: enabled && !!interviewId,
    staleTime: 3 * 60 * 1000,
  });
}

export function useScorecardTemplates(enabled: boolean = true) {
  return useQuery({
    queryKey: scorecardKeys.templates(),
    queryFn: () => scorecardService.getTemplates(),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}

// ==================== Mutation Hooks ====================

export function useCreateScorecardMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateScorecardRequest) => scorecardService.createScorecard(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: scorecardKeys.all});
      notifications.show({
        title: 'Scorecard saved',
        message: 'Interview scorecard has been created',
        color: 'green',
      });
      return data;
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to create scorecard',
        color: 'red',
      });
    },
  });
}

export function useUpdateScorecardMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({id, data}: { id: string; data: UpdateScorecardRequest }) =>
      scorecardService.updateScorecard(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: scorecardKeys.all});
      notifications.show({
        title: 'Scorecard updated',
        message: 'Interview scorecard has been updated',
        color: 'green',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to update scorecard',
        color: 'red',
      });
    },
  });
}

export function useSubmitScorecardMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scorecardService.submitScorecard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: scorecardKeys.all});
      notifications.show({
        title: 'Scorecard submitted',
        message: 'Interview scorecard has been submitted for review',
        color: 'green',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to submit scorecard',
        color: 'red',
      });
    },
  });
}

export function useCreateScorecardTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateScorecardTemplateRequest) =>
      scorecardService.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: scorecardKeys.templates()});
      notifications.show({
        title: 'Template created',
        message: 'Scorecard template has been created',
        color: 'green',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to create template',
        color: 'red',
      });
    },
  });
}
