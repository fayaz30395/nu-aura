'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mileageService } from '@/lib/services/expenses/mileage.service';
import { CreateMileageLogRequest, CreateMileagePolicyRequest } from '@/lib/types/hrms/expense';

export const mileageKeys = {
  all: ['mileage'] as const,
  logs: () => [...mileageKeys.all, 'logs'] as const,
  logsList: (employeeId: string, page: number, size: number) =>
    [...mileageKeys.logs(), 'list', { employeeId, page, size }] as const,
  summary: (employeeId: string, year: number, month: number) =>
    [...mileageKeys.all, 'summary', { employeeId, year, month }] as const,
  pendingApprovals: (page: number, size: number) =>
    [...mileageKeys.all, 'pending', { page, size }] as const,
  policies: () => [...mileageKeys.all, 'policies'] as const,
  activePolicies: () => [...mileageKeys.policies(), 'active'] as const,
};

// ========== MILEAGE LOG QUERIES ==========

export function useEmployeeMileageLogs(
  employeeId: string | undefined,
  page: number = 0,
  size: number = 20
) {
  return useQuery({
    queryKey: mileageKeys.logsList(employeeId || '', page, size),
    queryFn: () => mileageService.getEmployeeMileageLogs(employeeId!, page, size),
    enabled: !!employeeId,
    staleTime: 60 * 1000,
  });
}

export function useMileageSummary(
  employeeId: string | undefined,
  year: number,
  month: number
) {
  return useQuery({
    queryKey: mileageKeys.summary(employeeId || '', year, month),
    queryFn: () => mileageService.getMonthlySummary(employeeId!, year, month),
    enabled: !!employeeId,
    staleTime: 60 * 1000,
  });
}

export function usePendingMileageApprovals(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: mileageKeys.pendingApprovals(page, size),
    queryFn: () => mileageService.getPendingApprovals(page, size),
    staleTime: 30 * 1000,
  });
}

// ========== MILEAGE POLICY QUERIES ==========

export function useMileagePolicies() {
  return useQuery({
    queryKey: mileageKeys.activePolicies(),
    queryFn: () => mileageService.getActiveMileagePolicies(),
    staleTime: 10 * 60 * 1000,
  });
}

// ========== MILEAGE LOG MUTATIONS ==========

export function useCreateMileageLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, data }: { employeeId: string; data: CreateMileageLogRequest }) =>
      mileageService.createMileageLog(employeeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mileageKeys.logs() });
      queryClient.invalidateQueries({ queryKey: mileageKeys.all });
    },
  });
}

export function useUpdateMileageLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ logId, data }: { logId: string; data: CreateMileageLogRequest }) =>
      mileageService.updateMileageLog(logId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mileageKeys.logs() });
      queryClient.invalidateQueries({ queryKey: mileageKeys.all });
    },
  });
}

export function useSubmitMileageLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (logId: string) => mileageService.submitMileageLog(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mileageKeys.logs() });
      queryClient.invalidateQueries({ queryKey: mileageKeys.pendingApprovals(0, 20) });
    },
  });
}

export function useApproveMileageLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (logId: string) => mileageService.approveMileageLog(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mileageKeys.all });
    },
  });
}

export function useRejectMileageLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ logId, reason }: { logId: string; reason: string }) =>
      mileageService.rejectMileageLog(logId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mileageKeys.all });
    },
  });
}

// ========== MILEAGE POLICY MUTATIONS ==========

export function useCreateMileagePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMileagePolicyRequest) => mileageService.createMileagePolicy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mileageKeys.policies() });
    },
  });
}

export function useUpdateMileagePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ policyId, data }: { policyId: string; data: CreateMileagePolicyRequest }) =>
      mileageService.updateMileagePolicy(policyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mileageKeys.policies() });
    },
  });
}

export function useToggleMileagePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ policyId, active }: { policyId: string; active: boolean }) =>
      mileageService.toggleMileagePolicy(policyId, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mileageKeys.policies() });
    },
  });
}

export function useDeleteMileagePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (policyId: string) => mileageService.deleteMileagePolicy(policyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mileageKeys.policies() });
    },
  });
}
