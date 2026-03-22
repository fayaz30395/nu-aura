'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveService } from '@/lib/services/leave.service';
import { LeaveRequestRequest, LeaveRequestStatus, LeaveType, LeaveTypeRequest } from '@/lib/types/leave';

// Query keys for cache management
export const leaveKeys = {
  all: ['leaves'] as const,
  // Leave Types
  types: () => [...leaveKeys.all, 'types'] as const,
  typesList: (page: number, size: number) => [...leaveKeys.types(), 'list', { page, size }] as const,
  typesActive: () => [...leaveKeys.types(), 'active'] as const,
  typeDetail: (id: string) => [...leaveKeys.types(), 'detail', id] as const,
  // Leave Requests
  requests: () => [...leaveKeys.all, 'requests'] as const,
  requestsList: (page: number, size: number) => [...leaveKeys.requests(), 'list', { page, size }] as const,
  requestsByEmployee: (employeeId: string, page: number, size: number) =>
    [...leaveKeys.requests(), 'employee', employeeId, { page, size }] as const,
  requestsByStatus: (status: LeaveRequestStatus, page: number, size: number) =>
    [...leaveKeys.requests(), 'status', status, { page, size }] as const,
  requestDetail: (id: string) => [...leaveKeys.requests(), 'detail', id] as const,
  // Leave Balances
  balances: () => [...leaveKeys.all, 'balances'] as const,
  employeeBalances: (employeeId: string) => [...leaveKeys.balances(), 'employee', employeeId] as const,
  employeeBalancesYear: (employeeId: string, year: number) =>
    [...leaveKeys.balances(), 'employee', employeeId, 'year', year] as const,
};

// ========== Leave Types ==========

// Get all leave types (paginated)
export function useLeaveTypes(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: leaveKeys.typesList(page, size),
    queryFn: () => leaveService.getAllLeaveTypes(page, size),
    staleTime: 10 * 60 * 1000, // 10 minutes - leave types rarely change
  });
}

// Get active leave types
export function useActiveLeaveTypes() {
  return useQuery({
    queryKey: leaveKeys.typesActive(),
    queryFn: () => leaveService.getActiveLeaveTypes(),
    staleTime: 10 * 60 * 1000,
  });
}

// Get single leave type
export function useLeaveType(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: leaveKeys.typeDetail(id),
    queryFn: () => leaveService.getLeaveTypeById(id),
    enabled: enabled && !!id,
    staleTime: 10 * 60 * 1000,
  });
}

// ========== Leave Requests ==========

// Get all leave requests (paginated)
export function useLeaveRequests(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: leaveKeys.requestsList(page, size),
    queryFn: () => leaveService.getAllLeaveRequests(page, size),
    staleTime: 60 * 1000, // 1 minute - requests change more frequently
  });
}

// Get employee's leave requests
export function useEmployeeLeaveRequests(
  employeeId: string,
  page: number = 0,
  size: number = 20,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: leaveKeys.requestsByEmployee(employeeId, page, size),
    queryFn: () => leaveService.getEmployeeLeaveRequests(employeeId, page, size),
    enabled: enabled && !!employeeId,
    staleTime: 60 * 1000,
  });
}

// Get leave requests by status
export function useLeaveRequestsByStatus(
  status: LeaveRequestStatus,
  page: number = 0,
  size: number = 20
) {
  return useQuery({
    queryKey: leaveKeys.requestsByStatus(status, page, size),
    queryFn: () => leaveService.getLeaveRequestsByStatus(status, page, size),
    staleTime: 30 * 1000, // 30 seconds for pending approvals
    enabled: !!status, // Don't fire if status is empty/undefined
  });
}

// Get single leave request
export function useLeaveRequest(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: leaveKeys.requestDetail(id),
    queryFn: () => leaveService.getLeaveRequestById(id),
    enabled: enabled && !!id,
    staleTime: 60 * 1000,
  });
}

// ========== Leave Balances ==========

// Get employee balances
export function useEmployeeBalances(employeeId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: leaveKeys.employeeBalances(employeeId),
    queryFn: () => leaveService.getEmployeeBalances(employeeId),
    enabled: enabled && !!employeeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get employee balances for specific year
export function useEmployeeBalancesForYear(
  employeeId: string,
  year: number,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: leaveKeys.employeeBalancesYear(employeeId, year),
    queryFn: () => leaveService.getEmployeeBalancesForYear(employeeId, year),
    enabled: enabled && !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
}

// ========== Mutations ==========

// Create leave request
export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LeaveRequestRequest) => leaveService.createLeaveRequest(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.requests() });
      if (result.employeeId) {
        queryClient.invalidateQueries({
          queryKey: leaveKeys.employeeBalances(result.employeeId),
        });
      }
    },
  });
}

// Update leave request
export function useUpdateLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LeaveRequestRequest }) =>
      leaveService.updateLeaveRequest(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.requestDetail(id) });
      queryClient.invalidateQueries({ queryKey: leaveKeys.requests() });
    },
  });
}

// Approve leave request
export function useApproveLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    // API-004: Backend derives approver from SecurityContext
    mutationFn: ({ id }: { id: string; approverId?: string; comments?: string }) =>
      leaveService.approveLeaveRequest(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.requests() });
      if (result.employeeId) {
        queryClient.invalidateQueries({
          queryKey: leaveKeys.employeeBalances(result.employeeId),
        });
      }
    },
  });
}

// Reject leave request
export function useRejectLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, approverId, reason }: { id: string; approverId: string; reason: string }) =>
      leaveService.rejectLeaveRequest(id, approverId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.requests() });
    },
  });
}

// Cancel leave request
export function useCancelLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      leaveService.cancelLeaveRequest(id, reason),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.requests() });
      if (result.employeeId) {
        queryClient.invalidateQueries({
          queryKey: leaveKeys.employeeBalances(result.employeeId),
        });
      }
    },
  });
}

// ========== Leave Type Mutations ==========

// Create leave type
export function useCreateLeaveType() {
  const queryClient = useQueryClient();

  return useMutation<LeaveType, Error, LeaveTypeRequest>({
    mutationFn: (data) => leaveService.createLeaveType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.types() });
    },
  });
}

// Update leave type
export function useUpdateLeaveType() {
  const queryClient = useQueryClient();

  return useMutation<LeaveType, Error, { id: string; data: LeaveTypeRequest }>({
    mutationFn: ({ id, data }) =>
      leaveService.updateLeaveType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.types() });
    },
  });
}

// Delete leave type
export function useDeleteLeaveType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => leaveService.deleteLeaveType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.types() });
    },
  });
}

// Activate leave type
export function useActivateLeaveType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => leaveService.activateLeaveType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.types() });
    },
  });
}

// Deactivate leave type
export function useDeactivateLeaveType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => leaveService.deactivateLeaveType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.types() });
    },
  });
}
