'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timeTrackingService } from '@/lib/services/time-tracking.service';
import {
  TimeEntry,
  CreateTimeEntryRequest,
  TimeEntryStatus,
  TimeSummary,
  ProjectTimeSummary,
  Page,
} from '@/lib/types/time-tracking';

export const timeTrackingKeys = {
  all: ['time-tracking'] as const,
  myEntries: (page: number, size: number) =>
    [...timeTrackingKeys.all, 'my', { page, size }] as const,
  myEntriesRange: (startDate: string, endDate: string) =>
    [...timeTrackingKeys.all, 'my-range', { startDate, endDate }] as const,
  allEntries: (page: number, size: number, status?: TimeEntryStatus) =>
    [...timeTrackingKeys.all, 'all', { page, size, status }] as const,
  detail: (id: string) => [...timeTrackingKeys.all, 'detail', id] as const,
  byProject: (projectId: string) =>
    [...timeTrackingKeys.all, 'project', projectId] as const,
  pending: (page: number, size: number) =>
    [...timeTrackingKeys.all, 'pending', { page, size }] as const,
  summary: (startDate: string, endDate: string) =>
    [...timeTrackingKeys.all, 'summary', { startDate, endDate }] as const,
  projectSummary: (projectId: string) =>
    [...timeTrackingKeys.all, 'summary-project', projectId] as const,
};

// ========== Queries ==========

/**
 * Fetch current user's time entries with pagination
 */
export function useMyTimeTrackingEntries(
  page: number = 0,
  size: number = 20,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: timeTrackingKeys.myEntries(page, size),
    queryFn: () => timeTrackingService.getMyEntries(page, size),
    enabled,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch current user's time entries for a date range
 */
export function useMyTimeEntriesForRange(
  startDate: string,
  endDate: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: timeTrackingKeys.myEntriesRange(startDate, endDate),
    queryFn: () => timeTrackingService.getMyEntriesForRange(startDate, endDate),
    enabled,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch all time entries (admin view)
 */
export function useAllTimeEntries(
  page: number = 0,
  size: number = 20,
  status?: TimeEntryStatus,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: timeTrackingKeys.allEntries(page, size, status),
    queryFn: () => timeTrackingService.getAllEntries(page, size, status),
    enabled,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch a single time entry by ID
 */
export function useTimeEntry(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: timeTrackingKeys.detail(id),
    queryFn: () => timeTrackingService.getEntryById(id),
    enabled,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch time entries by project
 */
export function useTimeEntriesByProject(projectId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: timeTrackingKeys.byProject(projectId),
    queryFn: () => timeTrackingService.getEntriesByProject(projectId),
    enabled,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch pending approvals
 */
export function useTimePendingApprovals(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: timeTrackingKeys.pending(page, size),
    queryFn: () => timeTrackingService.getPendingApprovals(page, size),
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch time summary for a date range
 */
export function useTimeSummary(startDate: string, endDate: string) {
  return useQuery({
    queryKey: timeTrackingKeys.summary(startDate, endDate),
    queryFn: () => timeTrackingService.getTimeSummary(startDate, endDate),
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch project time summary
 */
export function useProjectTimeSummary(projectId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: timeTrackingKeys.projectSummary(projectId),
    queryFn: () => timeTrackingService.getProjectTimeSummary(projectId),
    enabled,
    staleTime: 60 * 1000,
  });
}

// ========== Mutations ==========

/**
 * Create a new time entry
 */
export function useCreateTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTimeEntryRequest) =>
      timeTrackingService.createEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeTrackingKeys.all });
    },
  });
}

/**
 * Update an existing time entry
 */
export function useUpdateTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateTimeEntryRequest }) =>
      timeTrackingService.updateEntry(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: timeTrackingKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: timeTrackingKeys.all });
    },
  });
}

/**
 * Delete a time entry
 */
export function useDeleteTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => timeTrackingService.deleteEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeTrackingKeys.all });
    },
  });
}

/**
 * Submit a single time entry for approval
 */
export function useSubmitTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => timeTrackingService.submitEntry(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: timeTrackingKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: timeTrackingKeys.all });
    },
  });
}

/**
 * Submit multiple time entries for approval
 */
export function useSubmitMultipleTimeEntries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryIds: string[]) =>
      timeTrackingService.submitMultiple(entryIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeTrackingKeys.all });
    },
  });
}

/**
 * Approve a single time entry
 */
export function useApproveTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => timeTrackingService.approveEntry(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: timeTrackingKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: timeTrackingKeys.all });
    },
  });
}

/**
 * Approve multiple time entries
 */
export function useApproveMultipleTimeEntries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryIds: string[]) =>
      timeTrackingService.approveMultiple(entryIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeTrackingKeys.all });
    },
  });
}

/**
 * Reject a time entry
 */
export function useRejectTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      timeTrackingService.rejectEntry(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: timeTrackingKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: timeTrackingKeys.all });
    },
  });
}
