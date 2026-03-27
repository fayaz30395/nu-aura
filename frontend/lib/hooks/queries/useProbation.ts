'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { probationService } from '@/lib/services/probation.service';
import {
  ProbationPeriodRequest,
  ProbationEvaluationRequest,
  ProbationExtensionRequest,
  ProbationConfirmationRequest,
  ProbationTerminationRequest,
  ProbationStatus,
} from '@/lib/types/probation';

// Query keys for cache management
export const probationKeys = {
  all: ['probation'] as const,
  list: () => [...probationKeys.all, 'list'] as const,
  listPaginated: (page: number, size: number) => [...probationKeys.list(), { page, size }] as const,
  byStatus: (status: ProbationStatus, page: number, size: number) =>
    [...probationKeys.all, 'status', status, { page, size }] as const,
  myTeam: (page: number, size: number) =>
    [...probationKeys.all, 'my-team', { page, size }] as const,
  detail: (id: string) => [...probationKeys.all, 'detail', id] as const,
  byEmployee: (employeeId: string) =>
    [...probationKeys.all, 'employee', employeeId] as const,
  evaluations: (probationId: string) =>
    [...probationKeys.all, 'evaluations', probationId] as const,
  overdue: () => [...probationKeys.all, 'overdue'] as const,
  endingSoon: (days: number) => [...probationKeys.all, 'ending-soon', days] as const,
  evaluationsDue: () => [...probationKeys.all, 'evaluations-due'] as const,
  statistics: () => [...probationKeys.all, 'statistics'] as const,
};

// ========== QUERIES ==========

export function useAllProbations(page = 0, size = 20) {
  return useQuery({
    queryKey: probationKeys.listPaginated(page, size),
    queryFn: () => probationService.getAllProbations(page, size),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProbationsByStatus(status: ProbationStatus, page = 0, size = 20) {
  return useQuery({
    queryKey: probationKeys.byStatus(status, page, size),
    queryFn: () => probationService.getProbationsByStatus(status, page, size),
    enabled: !!status,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMyTeamProbations(page = 0, size = 20) {
  return useQuery({
    queryKey: probationKeys.myTeam(page, size),
    queryFn: () => probationService.getMyTeamProbations(page, size),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProbation(probationId: string, enabled = true) {
  return useQuery({
    queryKey: probationKeys.detail(probationId),
    queryFn: () => probationService.getProbationById(probationId),
    enabled: enabled && !!probationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useActiveProbationByEmployee(employeeId: string, enabled = true) {
  return useQuery({
    queryKey: probationKeys.byEmployee(employeeId),
    queryFn: () => probationService.getActiveProbationByEmployee(employeeId),
    enabled: enabled && !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useProbationEvaluations(probationId: string, enabled = true) {
  return useQuery({
    queryKey: probationKeys.evaluations(probationId),
    queryFn: () => probationService.getEvaluationsForProbation(probationId),
    enabled: enabled && !!probationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOverdueProbations() {
  return useQuery({
    queryKey: probationKeys.overdue(),
    queryFn: () => probationService.getOverdueProbations(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProbationsEndingSoon(daysAhead = 7) {
  return useQuery({
    queryKey: probationKeys.endingSoon(daysAhead),
    queryFn: () => probationService.getProbationsEndingSoon(daysAhead),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProbationsWithEvaluationsDue() {
  return useQuery({
    queryKey: probationKeys.evaluationsDue(),
    queryFn: () => probationService.getProbationsWithEvaluationsDue(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProbationStatistics() {
  return useQuery({
    queryKey: probationKeys.statistics(),
    queryFn: () => probationService.getStatistics(),
    staleTime: 5 * 60 * 1000,
  });
}

// ========== MUTATIONS ==========

export function useCreateProbation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProbationPeriodRequest) => probationService.createProbation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: probationKeys.all });
    },
  });
}

export function useExtendProbation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      probationId,
      data,
    }: {
      probationId: string;
      data: ProbationExtensionRequest;
    }) => probationService.extendProbation(probationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: probationKeys.all });
    },
  });
}

export function useConfirmEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      probationId,
      data,
    }: {
      probationId: string;
      data: ProbationConfirmationRequest;
    }) => probationService.confirmEmployee(probationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: probationKeys.all });
    },
  });
}

export function useFailProbation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      probationId,
      data,
    }: {
      probationId: string;
      data: ProbationTerminationRequest;
    }) => probationService.failProbation(probationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: probationKeys.all });
    },
  });
}

export function useAddEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProbationEvaluationRequest) => probationService.addEvaluation(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: probationKeys.evaluations(variables.probationPeriodId),
      });
      queryClient.invalidateQueries({ queryKey: probationKeys.all });
    },
  });
}

export function useAcknowledgeEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      evaluationId,
      comments,
    }: {
      evaluationId: string;
      comments?: string;
    }) => probationService.acknowledgeEvaluation(evaluationId, comments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: probationKeys.all });
    },
  });
}
