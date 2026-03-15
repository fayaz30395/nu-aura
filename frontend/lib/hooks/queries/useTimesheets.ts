'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timesheetService } from '@/lib/services/timesheet.service';
import { Timesheet, TimeEntry, CreateTimesheetRequest, CreateTimeEntryRequest } from '@/lib/types/timesheet';

// Query keys for cache management
export const timesheetKeys = {
  all: ['timesheets'] as const,
  employeeTimesheets: (employeeId: string) =>
    [...timesheetKeys.all, 'employee', employeeId] as const,
  detail: (id: string) => [...timesheetKeys.all, 'detail', id] as const,
  entries: (timesheetId: string) =>
    [...timesheetKeys.all, 'entries', timesheetId] as const,
};

// ========== Queries ==========

/**
 * Fetch all timesheets for an employee
 */
export function useEmployeeTimesheets(employeeId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: timesheetKeys.employeeTimesheets(employeeId),
    queryFn: () => timesheetService.getEmployeeTimesheets(employeeId),
    enabled: enabled && !!employeeId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Fetch a single timesheet by ID
 */
export function useTimesheet(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: timesheetKeys.detail(id),
    queryFn: () => timesheetService.getTimesheet(id),
    enabled: enabled && !!id,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch time entries for a specific timesheet
 */
export function useTimesheetEntries(timesheetId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: timesheetKeys.entries(timesheetId),
    queryFn: () => timesheetService.getTimesheetEntries(timesheetId),
    enabled: enabled && !!timesheetId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ========== Mutations ==========

/**
 * Create a new timesheet
 */
export function useCreateTimesheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTimesheetRequest) => timesheetService.createTimesheet(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: timesheetKeys.employeeTimesheets(data.employeeId),
      });
    },
  });
}

/**
 * Submit a timesheet for approval
 */
export function useSubmitTimesheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => timesheetService.submitTimesheet(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.detail(id) });
    },
  });
}

/**
 * Approve a timesheet
 */
export function useApproveTimesheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, approverId }: { id: string; approverId: string }) =>
      timesheetService.approveTimesheet(id, approverId),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.detail(id) });
    },
  });
}

/**
 * Reject a timesheet
 */
export function useRejectTimesheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      timesheetService.rejectTimesheet(id, reason),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.detail(id) });
    },
  });
}

/**
 * Add a time entry to a timesheet
 */
export function useAddTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ timesheetId, entry }: { timesheetId: string; entry: CreateTimeEntryRequest }) =>
      timesheetService.addTimeEntry(timesheetId, entry),
    onSuccess: (_data, { timesheetId }) => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.entries(timesheetId) });
      queryClient.invalidateQueries({ queryKey: timesheetKeys.detail(timesheetId) });
    },
  });
}
