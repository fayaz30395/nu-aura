'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '@/lib/services/attendance.service';
import {
  AttendanceRecord,
  CheckInRequest,
  CheckOutRequest,
  RegularizationRequest,
  Shift,
  Holiday,
  ShiftRequest,
  HolidayRequest,
  Page,
} from '@/lib/types/attendance';

// Query keys for cache management
export const attendanceKeys = {
  all: ['attendance'] as const,
  // Attendance records
  records: () => [...attendanceKeys.all, 'records'] as const,
  employeeRecords: (employeeId: string, page: number, size: number) =>
    [...attendanceKeys.records(), 'employee', employeeId, { page, size }] as const,
  dateRange: (startDate: string, endDate: string) =>
    [...attendanceKeys.records(), 'range', { startDate, endDate }] as const,
  byDate: (date: string, page: number, size: number) =>
    [...attendanceKeys.records(), 'date', date, { page, size }] as const,
  pendingRegularizations: (page: number, size: number) =>
    [...attendanceKeys.records(), 'pending-regularizations', { page, size }] as const,
  timeEntries: (date: string) =>
    [...attendanceKeys.records(), 'time-entries', date] as const,
  // Shifts
  shifts: () => [...attendanceKeys.all, 'shifts'] as const,
  shiftsList: (page: number, size: number) =>
    [...attendanceKeys.shifts(), 'list', { page, size }] as const,
  shiftsActive: () => [...attendanceKeys.shifts(), 'active'] as const,
  shiftDetail: (id: string) => [...attendanceKeys.shifts(), 'detail', id] as const,
  // Holidays
  holidays: () => [...attendanceKeys.all, 'holidays'] as const,
  holidaysByYear: (year: number) => [...attendanceKeys.holidays(), 'year', year] as const,
  holidayDetail: (id: string) => [...attendanceKeys.holidays(), 'detail', id] as const,
};

// ========== Attendance Records ==========

// Get employee attendance records
export function useEmployeeAttendance(
  employeeId: string,
  page: number = 0,
  size: number = 50,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: attendanceKeys.employeeRecords(employeeId, page, size),
    queryFn: () => attendanceService.getEmployeeAttendance(employeeId, page, size),
    enabled: enabled && !!employeeId,
    staleTime: 60 * 1000, // 1 minute
  });
}

// Get attendance by date range (my attendance)
export function useAttendanceByDateRange(
  startDate: string,
  endDate: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: attendanceKeys.dateRange(startDate, endDate),
    queryFn: () => attendanceService.getAttendanceByDateRange(startDate, endDate),
    enabled: enabled && !!startDate && !!endDate,
    staleTime: 60 * 1000,
  });
}

// Get attendance by specific date
export function useAttendanceByDate(
  date: string,
  page: number = 0,
  size: number = 100,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: attendanceKeys.byDate(date, page, size),
    queryFn: () => attendanceService.getAttendanceByDate(date, page, size),
    enabled: enabled && !!date,
    staleTime: 30 * 1000, // 30 seconds for real-time view
  });
}

// Get pending regularizations
export function usePendingRegularizations(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: attendanceKeys.pendingRegularizations(page, size),
    queryFn: () => attendanceService.getPendingRegularizations(page, size),
    staleTime: 30 * 1000,
  });
}

// Get my time entries for a date
export function useMyTimeEntries(date: string, enabled: boolean = true) {
  return useQuery({
    queryKey: attendanceKeys.timeEntries(date),
    queryFn: () => attendanceService.getMyTimeEntries(date),
    enabled: enabled && !!date,
    staleTime: 30 * 1000,
  });
}

// ========== Shifts ==========

// Get all shifts
export function useShifts(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: attendanceKeys.shiftsList(page, size),
    queryFn: () => attendanceService.getAllShifts(page, size),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Get active shifts
export function useActiveShifts() {
  return useQuery({
    queryKey: attendanceKeys.shiftsActive(),
    queryFn: () => attendanceService.getActiveShifts(),
    staleTime: 10 * 60 * 1000,
  });
}

// Get single shift
export function useShift(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: attendanceKeys.shiftDetail(id),
    queryFn: () => attendanceService.getShiftById(id),
    enabled: enabled && !!id,
    staleTime: 10 * 60 * 1000,
  });
}

// ========== Holidays ==========

// Get holidays by year
export function useHolidaysByYear(year: number) {
  return useQuery({
    queryKey: attendanceKeys.holidaysByYear(year),
    queryFn: () => attendanceService.getHolidaysByYear(year),
    staleTime: 60 * 60 * 1000, // 1 hour - holidays rarely change
  });
}

// Get single holiday
export function useHoliday(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: attendanceKeys.holidayDetail(id),
    queryFn: () => attendanceService.getHolidayById(id),
    enabled: enabled && !!id,
    staleTime: 60 * 60 * 1000,
  });
}

// ========== Mutations with Optimistic Updates ==========

// Check in with optimistic update
export function useCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CheckInRequest) => attendanceService.checkIn(data),
    onMutate: async (data) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: attendanceKeys.records() });

      // Snapshot the previous value for rollback
      const today = data.attendanceDate || new Date().toISOString().split('T')[0];
      const previousData = queryClient.getQueryData(
        attendanceKeys.dateRange(today, today)
      );

      return { previousData, today };
    },
    onError: (_err, _data, context) => {
      // Rollback on error
      if (context?.previousData && context?.today) {
        queryClient.setQueryData(
          attendanceKeys.dateRange(context.today, context.today),
          context.previousData
        );
      }
    },
    onSettled: (_data, _error, variables) => {
      // Refetch to ensure data is fresh
      const today = variables.attendanceDate || new Date().toISOString().split('T')[0];
      queryClient.invalidateQueries({ queryKey: attendanceKeys.records() });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.timeEntries(today) });
    },
  });
}

// Check out with optimistic update
export function useCheckOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CheckOutRequest) => attendanceService.checkOut(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: attendanceKeys.records() });

      const today = data.attendanceDate || new Date().toISOString().split('T')[0];
      const previousData = queryClient.getQueryData(
        attendanceKeys.dateRange(today, today)
      );

      return { previousData, today };
    },
    onError: (_err, _data, context) => {
      if (context?.previousData && context?.today) {
        queryClient.setQueryData(
          attendanceKeys.dateRange(context.today, context.today),
          context.previousData
        );
      }
    },
    onSettled: (_data, _error, variables) => {
      const today = variables.attendanceDate || new Date().toISOString().split('T')[0];
      queryClient.invalidateQueries({ queryKey: attendanceKeys.records() });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.timeEntries(today) });
    },
  });
}

// Request regularization
export function useRequestRegularization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RegularizationRequest }) =>
      attendanceService.requestRegularization(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.records() });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.pendingRegularizations(0, 20) });
    },
  });
}

// Approve regularization with optimistic update
export function useApproveRegularization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => attendanceService.approveRegularization(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: attendanceKeys.pendingRegularizations(0, 20),
      });

      const previousData = queryClient.getQueryData<Page<AttendanceRecord>>(
        attendanceKeys.pendingRegularizations(0, 20)
      );

      // Optimistically remove from pending list
      if (previousData) {
        queryClient.setQueryData(
          attendanceKeys.pendingRegularizations(0, 20),
          {
            ...previousData,
            content: previousData.content.filter((record) => record.id !== id),
            totalElements: previousData.totalElements - 1,
          }
        );
      }

      return { previousData };
    },
    onError: (_err, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          attendanceKeys.pendingRegularizations(0, 20),
          context.previousData
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.records() });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.pendingRegularizations(0, 20) });
    },
  });
}

// ========== Shift Mutations ==========

export function useCreateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ShiftRequest) => attendanceService.createShift(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.shifts() });
    },
  });
}

export function useUpdateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ShiftRequest }) =>
      attendanceService.updateShift(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.shiftDetail(id) });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.shifts() });
    },
  });
}

export function useDeleteShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => attendanceService.deleteShift(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.shifts() });
    },
  });
}

export function useActivateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => attendanceService.activateShift(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.shifts() });
    },
  });
}

export function useDeactivateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => attendanceService.deactivateShift(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.shifts() });
    },
  });
}

// ========== Holiday Mutations ==========

export function useCreateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: HolidayRequest) => attendanceService.createHoliday(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: attendanceKeys.holidaysByYear(new Date(result.holidayDate).getFullYear()),
      });
    },
  });
}

export function useUpdateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: HolidayRequest }) =>
      attendanceService.updateHoliday(id, data),
    onSuccess: (result, { id }) => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.holidayDetail(id) });
      queryClient.invalidateQueries({
        queryKey: attendanceKeys.holidaysByYear(new Date(result.holidayDate).getFullYear()),
      });
    },
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => attendanceService.deleteHoliday(id),
    onSuccess: () => {
      // Invalidate all holiday queries since we don't know the year
      queryClient.invalidateQueries({ queryKey: attendanceKeys.holidays() });
    },
  });
}
