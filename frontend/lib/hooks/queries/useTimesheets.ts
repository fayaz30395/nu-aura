'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timesheetService } from '@/lib/services/hrms/timesheet.service';
import { CreateTimesheetRequest, CreateTimeEntryRequest } from '@/lib/types/hrms/timesheet';
import { useToast } from '@/components/notifications/ToastProvider';

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
  const toast = useToast();

  return useMutation({
    mutationFn: (data: CreateTimesheetRequest) => timesheetService.createTimesheet(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: timesheetKeys.employeeTimesheets(data.employeeId),
      });
      toast.success('Timesheet Created', 'New timesheet has been created successfully');
    },
    onError: (error: Error) => {
      toast.error('Operation Failed', error.message || 'Failed to create timesheet');
    },
  });
}

/**
 * Submit a timesheet for approval
 */
export function useSubmitTimesheet() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) => timesheetService.submitTimesheet(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.detail(id) });
      toast.success('Timesheet Submitted', 'Timesheet has been submitted for approval');
    },
    onError: (error: Error) => {
      toast.error('Submission Failed', error.message || 'Failed to submit timesheet');
    },
  });
}

/**
 * Approve a timesheet
 */
export function useApproveTimesheet() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, approverId }: { id: string; approverId: string }) =>
      timesheetService.approveTimesheet(id, approverId),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.detail(id) });
      toast.success('Timesheet Approved', 'Timesheet has been approved');
    },
    onError: (error: Error) => {
      toast.error('Approval Failed', error.message || 'Failed to approve timesheet');
    },
  });
}

/**
 * Reject a timesheet
 */
export function useRejectTimesheet() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      timesheetService.rejectTimesheet(id, reason),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.detail(id) });
      toast.info('Timesheet Rejected', 'Timesheet has been rejected');
    },
    onError: (error: Error) => {
      toast.error('Rejection Failed', error.message || 'Failed to reject timesheet');
    },
  });
}

/**
 * Add a time entry to a timesheet
 */
export function useAddTimeEntry() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ timesheetId, entry }: { timesheetId: string; entry: CreateTimeEntryRequest }) =>
      timesheetService.addTimeEntry(timesheetId, entry),
    onSuccess: (_data, { timesheetId }) => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.entries(timesheetId) });
      queryClient.invalidateQueries({ queryKey: timesheetKeys.detail(timesheetId) });
      toast.success('Time Entry Added', 'Time entry has been recorded');
    },
    onError: (error: Error) => {
      toast.error('Operation Failed', error.message || 'Failed to add time entry');
    },
  });
}
