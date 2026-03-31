'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftService } from '@/lib/services/hrms/shift.service';
import {
  ShiftDefinitionRequest,
  ShiftPatternRequest,
  ShiftAssignmentRequest,
  GenerateScheduleRequest,
  SubmitSwapRequest,
} from '@/lib/types/hrms/shift';
import { notifications } from '@mantine/notifications';

// ─── Query Keys ────────────────────────────────────────────────────────────

export const shiftKeys = {
  all: ['shifts'] as const,
  definitions: () => [...shiftKeys.all, 'definitions'] as const,
  definitionsList: (page: number, size: number) =>
    [...shiftKeys.definitions(), 'list', { page, size }] as const,
  definitionsActive: () => [...shiftKeys.definitions(), 'active'] as const,
  definitionDetail: (id: string) => [...shiftKeys.definitions(), 'detail', id] as const,
  patterns: () => [...shiftKeys.all, 'patterns'] as const,
  patternsList: (page: number, size: number) =>
    [...shiftKeys.patterns(), 'list', { page, size }] as const,
  patternsActive: () => [...shiftKeys.patterns(), 'active'] as const,
  patternDetail: (id: string) => [...shiftKeys.patterns(), 'detail', id] as const,
  assignments: () => [...shiftKeys.all, 'assignments'] as const,
  employeeAssignments: (employeeId: string, page: number, size: number) =>
    [...shiftKeys.assignments(), 'employee', employeeId, { page, size }] as const,
  dateAssignments: (date: string) => [...shiftKeys.assignments(), 'date', date] as const,
  schedule: () => [...shiftKeys.all, 'schedule'] as const,
  employeeSchedule: (employeeId: string, startDate: string, endDate: string) =>
    [...shiftKeys.schedule(), 'employee', employeeId, startDate, endDate] as const,
  teamSchedule: (managerId: string, startDate: string, endDate: string) =>
    [...shiftKeys.schedule(), 'team', managerId, startDate, endDate] as const,
  swaps: () => [...shiftKeys.all, 'swaps'] as const,
  mySwaps: (employeeId: string, page: number, size: number) =>
    [...shiftKeys.swaps(), 'my', employeeId, { page, size }] as const,
  incomingSwaps: (employeeId: string) =>
    [...shiftKeys.swaps(), 'incoming', employeeId] as const,
  pendingApprovalSwaps: () => [...shiftKeys.swaps(), 'pending-approval'] as const,
  allSwaps: (page: number, size: number) =>
    [...shiftKeys.swaps(), 'all', { page, size }] as const,
};

// ─── Shift Definitions ─────────────────────────────────────────────────────

export function useShiftDefinitions(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: shiftKeys.definitionsList(page, size),
    queryFn: () => shiftService.getAllShifts(page, size),
    staleTime: 5 * 60 * 1000,
  });
}

export function useActiveShiftDefinitions(enabled: boolean = true) {
  return useQuery({
    queryKey: shiftKeys.definitionsActive(),
    queryFn: () => shiftService.getActiveShifts(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useShiftDefinition(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: shiftKeys.definitionDetail(id),
    queryFn: () => shiftService.getShiftById(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateShiftDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ShiftDefinitionRequest) => shiftService.createShift(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.definitions() });
      notifications.show({ title: 'Success', message: 'Shift created successfully', color: 'green' });
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to create shift', color: 'red' });
    },
  });
}

export function useUpdateShiftDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ShiftDefinitionRequest }) =>
      shiftService.updateShift(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.definitions() });
      notifications.show({ title: 'Success', message: 'Shift updated successfully', color: 'green' });
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to update shift', color: 'red' });
    },
  });
}

export function useDeleteShiftDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => shiftService.deleteShift(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.definitions() });
      notifications.show({ title: 'Success', message: 'Shift deleted', color: 'green' });
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to delete shift', color: 'red' });
    },
  });
}

// ─── Shift Patterns ────────────────────────────────────────────────────────

export function useShiftPatterns(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: shiftKeys.patternsList(page, size),
    queryFn: () => shiftService.getAllPatterns(page, size),
    staleTime: 5 * 60 * 1000,
  });
}

export function useActivePatterns(enabled: boolean = true) {
  return useQuery({
    queryKey: shiftKeys.patternsActive(),
    queryFn: () => shiftService.getActivePatterns(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePattern() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ShiftPatternRequest) => shiftService.createPattern(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.patterns() });
      notifications.show({ title: 'Success', message: 'Pattern created successfully', color: 'green' });
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to create pattern', color: 'red' });
    },
  });
}

export function useUpdatePattern() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ShiftPatternRequest }) =>
      shiftService.updatePattern(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.patterns() });
      notifications.show({ title: 'Success', message: 'Pattern updated', color: 'green' });
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to update pattern', color: 'red' });
    },
  });
}

export function useDeletePattern() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => shiftService.deletePattern(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.patterns() });
      notifications.show({ title: 'Success', message: 'Pattern deleted', color: 'green' });
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to delete pattern', color: 'red' });
    },
  });
}

// ─── Schedule ──────────────────────────────────────────────────────────────

export function useEmployeeSchedule(
  employeeId: string,
  startDate: string,
  endDate: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: shiftKeys.employeeSchedule(employeeId, startDate, endDate),
    queryFn: () => shiftService.getEmployeeSchedule(employeeId, startDate, endDate),
    enabled: enabled && !!employeeId && !!startDate && !!endDate,
    staleTime: 2 * 60 * 1000,
  });
}

export function useTeamSchedule(
  managerId: string,
  startDate: string,
  endDate: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: shiftKeys.teamSchedule(managerId, startDate, endDate),
    queryFn: () => shiftService.getTeamSchedule(managerId, startDate, endDate),
    enabled: enabled && !!managerId && !!startDate && !!endDate,
    staleTime: 2 * 60 * 1000,
  });
}

export function useGenerateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GenerateScheduleRequest) => shiftService.generateSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.schedule() });
      queryClient.invalidateQueries({ queryKey: shiftKeys.assignments() });
      notifications.show({ title: 'Success', message: 'Schedule generated', color: 'green' });
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to generate schedule', color: 'red' });
    },
  });
}

// ─── Assignments ───────────────────────────────────────────────────────────

export function useAssignShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ShiftAssignmentRequest) => shiftService.assignShift(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.assignments() });
      queryClient.invalidateQueries({ queryKey: shiftKeys.schedule() });
      notifications.show({ title: 'Success', message: 'Shift assigned', color: 'green' });
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to assign shift', color: 'red' });
    },
  });
}

// ─── Shift Swaps ───────────────────────────────────────────────────────────

export function useMySwapRequests(employeeId: string, page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: shiftKeys.mySwaps(employeeId, page, size),
    queryFn: () => shiftService.getMySwapRequests(employeeId, page, size),
    enabled: !!employeeId,
    staleTime: 60 * 1000,
  });
}

export function useIncomingSwapRequests(employeeId: string) {
  return useQuery({
    queryKey: shiftKeys.incomingSwaps(employeeId),
    queryFn: () => shiftService.getIncomingSwapRequests(employeeId),
    enabled: !!employeeId,
    staleTime: 60 * 1000,
  });
}

export function usePendingApprovalSwaps() {
  return useQuery({
    queryKey: shiftKeys.pendingApprovalSwaps(),
    queryFn: () => shiftService.getPendingApprovalSwaps(),
    staleTime: 60 * 1000,
  });
}

export function useSubmitSwapRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SubmitSwapRequest) => shiftService.submitSwapRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.swaps() });
      notifications.show({ title: 'Success', message: 'Swap request submitted', color: 'green' });
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to submit swap request', color: 'red' });
    },
  });
}

export function useAcceptSwapRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, employeeId }: { requestId: string; employeeId: string }) =>
      shiftService.acceptSwapRequest(requestId, employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.swaps() });
      notifications.show({ title: 'Success', message: 'Swap request accepted', color: 'green' });
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to accept request', color: 'red' });
    },
  });
}

export function useApproveSwapRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, managerId }: { requestId: string; managerId: string }) =>
      shiftService.approveSwapRequest(requestId, managerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.swaps() });
      notifications.show({ title: 'Success', message: 'Swap approved', color: 'green' });
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to approve swap', color: 'red' });
    },
  });
}

export function useRejectSwapRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      managerId,
      reason,
    }: {
      requestId: string;
      managerId: string;
      reason?: string;
    }) => shiftService.rejectSwapRequest(requestId, managerId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.swaps() });
      notifications.show({ title: 'Success', message: 'Swap rejected', color: 'green' });
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to reject swap', color: 'red' });
    },
  });
}

// Backward-compatible aliases for existing admin/shifts page
export const useShiftsList = useShiftDefinitions;
export const useCreateNewShift = useCreateShiftDefinition;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useUpdateShiftDetails(shiftId: string) {
  const mutation = useUpdateShiftDefinition();
  return {
    ...mutation,
    mutateAsync: (data: any) => mutation.mutateAsync({ id: shiftId, data }),  // eslint-disable-line @typescript-eslint/no-explicit-any
    mutate: (data: any) => mutation.mutate({ id: shiftId, data }),  // eslint-disable-line @typescript-eslint/no-explicit-any
  };
}
export const useRemoveShift = useDeleteShiftDefinition;
