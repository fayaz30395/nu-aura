'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { applicantService } from '@/lib/services/applicant.service';
import type {
  ApplicantRequest,
  ApplicantStatusUpdate,
} from '@/lib/types/applicant';

// ==================== Query Keys ====================

export const applicantKeys = {
  all: ['applicants'] as const,
  lists: () => [...applicantKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...applicantKeys.lists(), filters] as const,
  detail: (id: string) => [...applicantKeys.all, 'detail', id] as const,
  pipeline: (jobId: string) => [...applicantKeys.all, 'pipeline', jobId] as const,
};

// ==================== Query Hooks ====================

export function useApplicants(params: {
  page?: number;
  size?: number;
  jobOpeningId?: string;
  status?: string;
} = {}) {
  return useQuery({
    queryKey: applicantKeys.list(params),
    queryFn: () =>
      applicantService.listApplicants({
        page: params.page ?? 0,
        size: params.size ?? 20,
        jobOpeningId: params.jobOpeningId,
        status: params.status,
      }),
    staleTime: 3 * 60 * 1000,
  });
}

export function useApplicant(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: applicantKeys.detail(id),
    queryFn: () => applicantService.getApplicant(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePipelineByJob(jobOpeningId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: applicantKeys.pipeline(jobOpeningId),
    queryFn: () => applicantService.getPipeline(jobOpeningId),
    enabled: enabled && !!jobOpeningId,
    staleTime: 3 * 60 * 1000,
  });
}

// ==================== Mutation Hooks ====================

export function useCreateApplicant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ApplicantRequest) => applicantService.createApplicant(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: applicantKeys.all });
      if (data.jobOpeningId) {
        queryClient.invalidateQueries({ queryKey: applicantKeys.pipeline(data.jobOpeningId) });
      }
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to create applicant',
        color: 'red',
      });
    },
  });
}

export function useUpdateApplicantStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApplicantStatusUpdate }) =>
      applicantService.updateStatus(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: applicantKeys.all });
      if (data.jobOpeningId) {
        queryClient.invalidateQueries({ queryKey: applicantKeys.pipeline(data.jobOpeningId) });
      }
      queryClient.invalidateQueries({ queryKey: applicantKeys.detail(data.id) });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to update applicant status',
        color: 'red',
      });
    },
  });
}

export function useRateApplicant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: number }) =>
      applicantService.rateApplicant(id, rating),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: applicantKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: applicantKeys.all });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to rate applicant',
        color: 'red',
      });
    },
  });
}

export function useDeleteApplicant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => applicantService.deleteApplicant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicantKeys.all });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to delete applicant',
        color: 'red',
      });
    },
  });
}
