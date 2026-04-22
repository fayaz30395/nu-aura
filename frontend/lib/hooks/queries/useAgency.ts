'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {agencyService} from '@/lib/services/hire/agency.service';
import {
  AgencyStatus,
  CreateAgencyRequest,
  UpdateAgencyRequest,
  CreateSubmissionRequest,
  UpdateSubmissionStatusRequest,
} from '@/lib/types/hire/recruitment';

// ==================== Query Keys ====================

export const agencyKeys = {
  all: ['agencies'] as const,
  list: (page: number, size: number, status?: AgencyStatus, search?: string) =>
    [...agencyKeys.all, 'list', {page, size, status, search}] as const,
  detail: (id: string) => [...agencyKeys.all, 'detail', id] as const,
  submissions: (agencyId: string, page: number, size: number) =>
    [...agencyKeys.all, 'submissions', agencyId, {page, size}] as const,
  submissionsByJob: (jobId: string) =>
    [...agencyKeys.all, 'submissions-by-job', jobId] as const,
  performance: (agencyId: string) =>
    [...agencyKeys.all, 'performance', agencyId] as const,
};

// ==================== Query Hooks ====================

export function useAgencies(
  page: number = 0,
  size: number = 20,
  status?: AgencyStatus,
  search?: string
) {
  return useQuery({
    queryKey: agencyKeys.list(page, size, status, search),
    queryFn: () => agencyService.listAgencies(page, size, status, search),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAgency(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: agencyKeys.detail(id),
    queryFn: () => agencyService.getAgency(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAgencySubmissions(
  agencyId: string,
  page: number = 0,
  size: number = 20
) {
  return useQuery({
    queryKey: agencyKeys.submissions(agencyId, page, size),
    queryFn: () => agencyService.getAgencySubmissions(agencyId, page, size),
    enabled: !!agencyId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAgencyPerformance(agencyId: string) {
  return useQuery({
    queryKey: agencyKeys.performance(agencyId),
    queryFn: () => agencyService.getAgencyPerformance(agencyId),
    enabled: !!agencyId,
    staleTime: 10 * 60 * 1000,
  });
}

// ==================== Mutation Hooks ====================

export function useCreateAgency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAgencyRequest) => agencyService.createAgency(data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: agencyKeys.all});
    },
  });
}

export function useUpdateAgency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({id, data}: { id: string; data: UpdateAgencyRequest }) =>
      agencyService.updateAgency(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({queryKey: agencyKeys.detail(variables.id)});
      queryClient.invalidateQueries({queryKey: agencyKeys.all});
    },
  });
}

export function useDeleteAgency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => agencyService.deleteAgency(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: agencyKeys.all});
    },
  });
}

export function useSubmitCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
                   agencyId,
                   data,
                 }: {
      agencyId: string;
      data: CreateSubmissionRequest;
    }) => agencyService.submitCandidate(agencyId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: agencyKeys.submissions(variables.agencyId, 0, 20),
      });
      queryClient.invalidateQueries({
        queryKey: agencyKeys.performance(variables.agencyId),
      });
    },
  });
}

export function useUpdateSubmissionStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
                   agencyId,
                   submissionId,
                   data,
                 }: {
      agencyId: string;
      submissionId: string;
      data: UpdateSubmissionStatusRequest;
    }) => agencyService.updateSubmissionStatus(agencyId, submissionId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: agencyKeys.submissions(variables.agencyId, 0, 20),
      });
      queryClient.invalidateQueries({
        queryKey: agencyKeys.performance(variables.agencyId),
      });
    },
  });
}
