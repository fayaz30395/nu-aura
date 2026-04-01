'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { overtimeService } from '@/lib/services/hrms/overtime.service';
import { OvertimeRecordRequest, OvertimeApprovalRequest } from '@/lib/types/hrms/overtime';

// Query keys for cache management
export const overtimeKeys = {
  all: ['overtime'] as const,
  list: () => [...overtimeKeys.all, 'list'] as const,
  listPaginated: (page: number, size: number) => [...overtimeKeys.list(), { page, size }] as const,
  byEmployee: (employeeId: string, page: number, size: number) =>
    [...overtimeKeys.all, 'employee', employeeId, { page, size }] as const,
  pending: (page: number, size: number) =>
    [...overtimeKeys.all, 'pending', { page, size }] as const,
  detail: (id: string) => [...overtimeKeys.all, 'detail', id] as const,
  compTimeBalance: (employeeId: string) =>
    [...overtimeKeys.all, 'comp-time', employeeId] as const,
};

// ========== QUERIES ==========

export function useAllOvertimeRecords(page = 0, size = 10) {
  return useQuery({
    queryKey: overtimeKeys.listPaginated(page, size),
    queryFn: () => overtimeService.getAllOvertimeRecords(page, size),
    staleTime: 5 * 60 * 1000,
  });
}

export function useEmployeeOvertimeRecords(
  employeeId: string,
  page = 0,
  size = 10,
  enabled = true
) {
  return useQuery({
    queryKey: overtimeKeys.byEmployee(employeeId, page, size),
    queryFn: () => overtimeService.getEmployeeOvertimeRecords(employeeId, page, size),
    enabled: enabled && !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePendingOvertimeRecords(page = 0, size = 10) {
  return useQuery({
    queryKey: overtimeKeys.pending(page, size),
    queryFn: () => overtimeService.getPendingOvertimeRecords(page, size),
    staleTime: 2 * 60 * 1000,
  });
}

export function useOvertimeRecord(recordId: string, enabled = true) {
  return useQuery({
    queryKey: overtimeKeys.detail(recordId),
    queryFn: () => overtimeService.getOvertimeRecordById(recordId),
    enabled: enabled && !!recordId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCompTimeBalance(employeeId: string, enabled = true) {
  return useQuery({
    queryKey: overtimeKeys.compTimeBalance(employeeId),
    queryFn: () => overtimeService.getCompTimeBalance(employeeId),
    enabled: enabled && !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
}

// ========== MUTATIONS ==========

export function useCreateOvertimeRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: OvertimeRecordRequest) => overtimeService.createOvertimeRecord(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: overtimeKeys.all });
    },
  });
}

export function useApproveOrRejectOvertime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      recordId,
      approverId,
      data,
    }: {
      recordId: string;
      approverId: string;
      data: OvertimeApprovalRequest;
    }) => overtimeService.approveOrRejectOvertime(recordId, approverId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: overtimeKeys.all });
    },
  });
}

export function useDeleteOvertimeRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recordId: string) => overtimeService.deleteOvertimeRecord(recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: overtimeKeys.all });
    },
  });
}
