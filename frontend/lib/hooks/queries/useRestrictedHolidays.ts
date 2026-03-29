'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { restrictedHolidayService } from '@/lib/services/restrictedHoliday.service';
import {
  RestrictedHolidayRequest,
  PolicyRequest,
  SelectionStatus,
  SelectionActionRequest,
} from '@/lib/types/restricted-holiday';
import { notifications } from '@mantine/notifications';

// ─── Query Keys ─────────────────────────────────────────────────

export const restrictedHolidayKeys = {
  all: ['restricted-holidays'] as const,
  holidays: () => [...restrictedHolidayKeys.all, 'holidays'] as const,
  holidaysList: (year?: number, page?: number, size?: number) =>
    [...restrictedHolidayKeys.holidays(), 'list', { year, page, size }] as const,
  holidaysAvailable: (year: number) =>
    [...restrictedHolidayKeys.holidays(), 'available', year] as const,
  holidayDetail: (id: string) =>
    [...restrictedHolidayKeys.holidays(), 'detail', id] as const,
  selections: () => [...restrictedHolidayKeys.all, 'selections'] as const,
  mySelections: (year: number) =>
    [...restrictedHolidayKeys.selections(), 'me', year] as const,
  mySummary: (year: number) =>
    [...restrictedHolidayKeys.all, 'summary', 'me', year] as const,
  selectionsByStatus: (status: SelectionStatus, page: number, size: number) =>
    [...restrictedHolidayKeys.selections(), 'status', status, { page, size }] as const,
  selectionsByHoliday: (holidayId: string, page: number, size: number) =>
    [...restrictedHolidayKeys.selections(), 'holiday', holidayId, { page, size }] as const,
  policy: (year: number) =>
    [...restrictedHolidayKeys.all, 'policy', year] as const,
};

// ─── Holiday Queries ────────────────────────────────────────────

export function useRestrictedHolidays(
  page: number = 0,
  size: number = 20,
  year?: number,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: restrictedHolidayKeys.holidaysList(year, page, size),
    queryFn: () => restrictedHolidayService.listHolidays(page, size, year),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAvailableRestrictedHolidays(
  year: number,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: restrictedHolidayKeys.holidaysAvailable(year),
    queryFn: () => restrictedHolidayService.getAvailableHolidays(year),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRestrictedHolidayDetail(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: restrictedHolidayKeys.holidayDetail(id),
    queryFn: () => restrictedHolidayService.getHolidayById(id),
    enabled: enabled && !!id,
  });
}

// ─── Holiday Mutations ──────────────────────────────────────────

export function useCreateRestrictedHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RestrictedHolidayRequest) =>
      restrictedHolidayService.createHoliday(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: restrictedHolidayKeys.holidays() });
      notifications.show({
        title: 'Holiday Created',
        message: 'Restricted holiday created successfully.',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create holiday.',
        color: 'red',
      });
    },
  });
}

export function useUpdateRestrictedHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RestrictedHolidayRequest }) =>
      restrictedHolidayService.updateHoliday(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: restrictedHolidayKeys.holidays() });
      notifications.show({
        title: 'Holiday Updated',
        message: 'Restricted holiday updated successfully.',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update holiday.',
        color: 'red',
      });
    },
  });
}

export function useDeleteRestrictedHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restrictedHolidayService.deleteHoliday(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: restrictedHolidayKeys.holidays() });
      notifications.show({
        title: 'Holiday Deleted',
        message: 'Restricted holiday deleted.',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to delete holiday.',
        color: 'red',
      });
    },
  });
}

// ─── Selection Queries ──────────────────────────────────────────

export function useMyRestrictedHolidaySelections(
  year: number,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: restrictedHolidayKeys.mySelections(year),
    queryFn: () => restrictedHolidayService.getMySelections(year),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useMyRestrictedHolidaySummary(
  year: number,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: restrictedHolidayKeys.mySummary(year),
    queryFn: () => restrictedHolidayService.getMySummary(year),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useSelectionsByStatus(
  status: SelectionStatus,
  page: number = 0,
  size: number = 20,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: restrictedHolidayKeys.selectionsByStatus(status, page, size),
    queryFn: () =>
      restrictedHolidayService.getSelectionsByStatus(status, page, size),
    enabled,
    staleTime: 1 * 60 * 1000,
  });
}

// ─── Selection Mutations ────────────────────────────────────────

export function useSelectRestrictedHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (holidayId: string) =>
      restrictedHolidayService.selectHoliday(holidayId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: restrictedHolidayKeys.selections() });
      queryClient.invalidateQueries({ queryKey: restrictedHolidayKeys.all });
      notifications.show({
        title: 'Holiday Selected',
        message: 'Your restricted holiday selection has been submitted.',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Selection Failed',
        message: error.message || 'Failed to select holiday.',
        color: 'red',
      });
    },
  });
}

export function useCancelSelection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (selectionId: string) =>
      restrictedHolidayService.cancelSelection(selectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: restrictedHolidayKeys.selections() });
      queryClient.invalidateQueries({ queryKey: restrictedHolidayKeys.all });
      notifications.show({
        title: 'Selection Cancelled',
        message: 'Your selection has been cancelled.',
        color: 'blue',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to cancel selection.',
        color: 'red',
      });
    },
  });
}

export function useApproveSelection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (selectionId: string) =>
      restrictedHolidayService.approveSelection(selectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: restrictedHolidayKeys.selections() });
      notifications.show({
        title: 'Approved',
        message: 'Selection approved successfully.',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to approve.',
        color: 'red',
      });
    },
  });
}

export function useRejectSelection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      selectionId,
      data,
    }: {
      selectionId: string;
      data?: SelectionActionRequest;
    }) => restrictedHolidayService.rejectSelection(selectionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: restrictedHolidayKeys.selections() });
      notifications.show({
        title: 'Rejected',
        message: 'Selection rejected.',
        color: 'orange',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to reject.',
        color: 'red',
      });
    },
  });
}

// ─── Policy Queries & Mutations ─────────────────────────────────

export function useRestrictedHolidayPolicy(
  year: number,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: restrictedHolidayKeys.policy(year),
    queryFn: () => restrictedHolidayService.getPolicy(year),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}

export function useSaveRestrictedHolidayPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PolicyRequest) =>
      restrictedHolidayService.savePolicy(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: restrictedHolidayKeys.policy(variables.year),
      });
      notifications.show({
        title: 'Policy Saved',
        message: 'Restricted holiday policy updated.',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to save policy.',
        color: 'red',
      });
    },
  });
}
