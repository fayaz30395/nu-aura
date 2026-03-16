'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { shiftsApi } from '@/lib/api/shifts';
import {
  CreateShiftRequest,
  UpdateShiftRequest,
  CreateShiftAssignmentRequest,
} from '@/lib/types/shifts';

// Query key factory
const shiftKeys = {
  all: ['shifts'] as const,
  lists: () => [...shiftKeys.all, 'list'] as const,
  list: (page: number, size: number) =>
    [...shiftKeys.lists(), { page, size }] as const,
  active: () => [...shiftKeys.all, 'active'] as const,
  detail: (id: string) => [...shiftKeys.all, 'detail', id] as const,
  assignments: () => [...shiftKeys.all, 'assignments'] as const,
  employeeAssignments: (employeeId: string, page: number, size: number) =>
    [...shiftKeys.assignments(), 'employee', employeeId, { page, size }] as const,
  assignmentsForDate: (date: string) =>
    [...shiftKeys.assignments(), 'date', date] as const,
};

// ========== Queries ==========

/**
 * Fetch all shifts (paginated)
 */
export function useShiftsList(
  page: number = 0,
  size: number = 100,
  sortBy?: string,
  sortDirection?: 'ASC' | 'DESC'
) {
  return useQuery({
    queryKey: shiftKeys.list(page, size),
    queryFn: () =>
      shiftsApi.getAllShifts({
        page,
        size,
        sortBy,
        sortDirection,
      }),
  });
}

/**
 * Fetch all active shifts
 */
export function useActiveShiftsList() {
  return useQuery({
    queryKey: shiftKeys.active(),
    queryFn: () => shiftsApi.getActiveShifts(),
  });
}

/**
 * Fetch a single shift by ID
 */
export function useShiftById(shiftId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: shiftKeys.detail(shiftId),
    queryFn: () => shiftsApi.getShiftById(shiftId),
    enabled: enabled && !!shiftId,
  });
}

/**
 * Fetch shift assignments for an employee
 */
export function useEmployeeShiftAssignments(
  employeeId: string,
  page: number = 0,
  size: number = 50,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: shiftKeys.employeeAssignments(employeeId, page, size),
    queryFn: () =>
      shiftsApi.getEmployeeAssignments(employeeId, { page, size }),
    enabled: enabled && !!employeeId,
  });
}

/**
 * Fetch shift assignments for a specific date
 */
export function useShiftAssignmentsForDate(date: string, enabled: boolean = true) {
  return useQuery({
    queryKey: shiftKeys.assignmentsForDate(date),
    queryFn: () => shiftsApi.getAssignmentsForDate(date),
    enabled: enabled && !!date,
  });
}

// ========== Mutations ==========

/**
 * Create a new shift
 */
export function useCreateNewShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateShiftRequest) => shiftsApi.createShift(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.lists() });
      queryClient.invalidateQueries({ queryKey: shiftKeys.active() });
      notifications.show({
        title: 'Success',
        message: 'Shift created successfully',
        color: 'green',
      });
    },
    onError: (error) => {
      console.error('Failed to create shift:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to create shift',
        color: 'red',
      });
    },
  });
}

/**
 * Update an existing shift
 */
export function useUpdateShiftDetails(shiftId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateShiftRequest) =>
      shiftsApi.updateShift(shiftId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.lists() });
      queryClient.invalidateQueries({ queryKey: shiftKeys.active() });
      queryClient.invalidateQueries({ queryKey: shiftKeys.detail(shiftId) });
      notifications.show({
        title: 'Success',
        message: 'Shift updated successfully',
        color: 'green',
      });
    },
    onError: (error) => {
      console.error('Failed to update shift:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to update shift',
        color: 'red',
      });
    },
  });
}

/**
 * Delete a shift
 */
export function useRemoveShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shiftId: string) => shiftsApi.deleteShift(shiftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.lists() });
      queryClient.invalidateQueries({ queryKey: shiftKeys.active() });
      notifications.show({
        title: 'Success',
        message: 'Shift deleted successfully',
        color: 'green',
      });
    },
    onError: (error) => {
      console.error('Failed to delete shift:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete shift',
        color: 'red',
      });
    },
  });
}

/**
 * Assign a shift to employees
 */
export function useAssignShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateShiftAssignmentRequest) =>
      shiftsApi.assignShift(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.assignments() });
      notifications.show({
        title: 'Success',
        message: 'Shift assigned successfully',
        color: 'green',
      });
    },
    onError: (error) => {
      console.error('Failed to assign shift:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to assign shift',
        color: 'red',
      });
    },
  });
}

/**
 * Cancel a shift assignment
 */
export function useCancelShiftAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) =>
      shiftsApi.cancelAssignment(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.assignments() });
      notifications.show({
        title: 'Success',
        message: 'Shift assignment cancelled successfully',
        color: 'green',
      });
    },
    onError: (error) => {
      console.error('Failed to cancel shift assignment:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to cancel shift assignment',
        color: 'red',
      });
    },
  });
}
