'use client';

import {keepPreviousData, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {compensationService} from '@/lib/services/hrms/compensation.service';
import type {CompensationCycleRequest, CycleStatus, SalaryRevisionRequest,} from '@/lib/types/hrms/compensation';

// Query keys for cache management
export const compensationKeys = {
  all: ['compensation'] as const,
  cycles: () => [...compensationKeys.all, 'cycles'] as const,
  cycleList: (page: number, size: number) => [...compensationKeys.cycles(), {page, size}] as const,
  cycleDetail: (id: string) => [...compensationKeys.cycles(), id] as const,
  activeCycles: () => [...compensationKeys.cycles(), 'active'] as const,
  cycleStats: (id: string) => [...compensationKeys.cycles(), id, 'statistics'] as const,
  revisions: () => [...compensationKeys.all, 'revisions'] as const,
  revisionList: (page: number, size: number) => [...compensationKeys.revisions(), {page, size}] as const,
  revisionDetail: (id: string) => [...compensationKeys.revisions(), id] as const,
  revisionsByCycle: (cycleId: string, page: number, size: number) =>
    [...compensationKeys.cycles(), cycleId, 'revisions', {page, size}] as const,
  pendingApprovals: (page: number, size: number) =>
    [...compensationKeys.revisions(), 'pending', {page, size}] as const,
  employeeHistory: (employeeId: string) => [...compensationKeys.revisions(), 'history', employeeId] as const,
};

// ── Compensation Cycles ──────────────────────────────

/**
 * Fetch paginated list of compensation cycles
 */
export function useCompensationCycles(page: number = 0, size: number = 10) {
  return useQuery({
    queryKey: compensationKeys.cycleList(page, size),
    queryFn: () => compensationService.getAllCycles(page, size),
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData,
  });
}

/**
 * Fetch active compensation cycles
 */
export function useActiveCycles() {
  return useQuery({
    queryKey: compensationKeys.activeCycles(),
    queryFn: () => compensationService.getActiveCycles(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch single cycle by ID
 */
export function useCompensationCycleDetail(cycleId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: compensationKeys.cycleDetail(cycleId),
    queryFn: () => compensationService.getCycleById(cycleId),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

/**
 * Fetch cycle statistics
 */
export function useCycleStatistics(cycleId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: compensationKeys.cycleStats(cycleId),
    queryFn: () => compensationService.getCycleStatistics(cycleId),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

/**
 * Create compensation cycle mutation
 */
export function useCreateCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CompensationCycleRequest) => compensationService.createCycle(data),
    onSuccess: () => {
      // Invalidate all cycle-related queries
      queryClient.invalidateQueries({queryKey: compensationKeys.cycles()});
    },
  });
}

/**
 * Update cycle status mutation
 */
export function useUpdateCycleStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({cycleId, status}: { cycleId: string; status: CycleStatus }) =>
      compensationService.updateCycleStatus(cycleId, status),
    onSuccess: (data) => {
      // Update the specific cycle detail
      queryClient.setQueryData(compensationKeys.cycleDetail(data.id), data);
      // Invalidate cycle lists
      queryClient.invalidateQueries({queryKey: compensationKeys.cycles()});
    },
  });
}

// ── Salary Revisions ──────────────────────────────

/**
 * Fetch paginated list of salary revisions
 */
export function useCompensationRevisions(page: number = 0, size: number = 10) {
  return useQuery({
    queryKey: compensationKeys.revisionList(page, size),
    queryFn: () => compensationService.getAllRevisions(page, size),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

/**
 * Fetch revisions for a specific cycle
 */
export function useRevisionsByCycle(cycleId: string, page: number = 0, size: number = 10) {
  return useQuery({
    queryKey: compensationKeys.revisionsByCycle(cycleId, page, size),
    queryFn: () => compensationService.getRevisionsByCycle(cycleId, page, size),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

/**
 * Fetch pending approvals for current user
 */
export function usePendingApprovals(page: number = 0, size: number = 10) {
  return useQuery({
    queryKey: compensationKeys.pendingApprovals(page, size),
    queryFn: () => compensationService.getPendingApprovals(page, size),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

/**
 * Fetch single revision by ID
 */
export function useRevisionDetail(revisionId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: compensationKeys.revisionDetail(revisionId),
    queryFn: () => compensationService.getRevisionById(revisionId),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

/**
 * Fetch revision history for an employee
 */
export function useEmployeeRevisionHistory(employeeId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: compensationKeys.employeeHistory(employeeId),
    queryFn: () => compensationService.getEmployeeRevisionHistory(employeeId),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

/**
 * Create salary revision mutation
 */
export function useCreateRevision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SalaryRevisionRequest) => compensationService.createRevision(data),
    onSuccess: () => {
      // Invalidate all revision-related queries
      queryClient.invalidateQueries({queryKey: compensationKeys.revisions()});
    },
  });
}

/**
 * Submit revision mutation
 */
export function useSubmitRevision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (revisionId: string) => compensationService.submitRevision(revisionId),
    onSuccess: (data) => {
      // Update the specific revision detail
      queryClient.setQueryData(compensationKeys.revisionDetail(data.id), data);
      // Invalidate revision lists
      queryClient.invalidateQueries({queryKey: compensationKeys.revisions()});
    },
  });
}

/**
 * Review revision mutation
 */
export function useReviewRevision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({revisionId, comments}: { revisionId: string; comments?: string }) =>
      compensationService.reviewRevision(revisionId, comments),
    onSuccess: (data) => {
      // Update the specific revision detail
      queryClient.setQueryData(compensationKeys.revisionDetail(data.id), data);
      // Invalidate revision lists
      queryClient.invalidateQueries({queryKey: compensationKeys.revisions()});
    },
  });
}

/**
 * Approve revision mutation
 */
export function useApproveRevision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({revisionId, comments}: { revisionId: string; comments?: string }) =>
      compensationService.approveRevision(revisionId, comments),
    onSuccess: (data) => {
      // Update the specific revision detail
      queryClient.setQueryData(compensationKeys.revisionDetail(data.id), data);
      // Invalidate revision lists to refresh status
      queryClient.invalidateQueries({queryKey: compensationKeys.revisions()});
      // Invalidate ALL pending approval pages (not just page 0/size 10)
      queryClient.invalidateQueries({
        queryKey: [...compensationKeys.revisions(), 'pending'],
      });
    },
  });
}

/**
 * Reject revision mutation
 */
export function useRejectRevision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({revisionId, reason}: { revisionId: string; reason: string }) =>
      compensationService.rejectRevision(revisionId, reason),
    onSuccess: (data) => {
      // Update the specific revision detail
      queryClient.setQueryData(compensationKeys.revisionDetail(data.id), data);
      // Invalidate revision lists to refresh status
      queryClient.invalidateQueries({queryKey: compensationKeys.revisions()});
      // Invalidate ALL pending approval pages (not just page 0/size 10)
      queryClient.invalidateQueries({
        queryKey: [...compensationKeys.revisions(), 'pending'],
      });
    },
  });
}

/**
 * Apply revision mutation
 */
export function useApplyRevision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (revisionId: string) => compensationService.applyRevision(revisionId),
    onSuccess: (data) => {
      // Update the specific revision detail
      queryClient.setQueryData(compensationKeys.revisionDetail(data.id), data);
      // Invalidate revision lists
      queryClient.invalidateQueries({queryKey: compensationKeys.revisions()});
    },
  });
}
