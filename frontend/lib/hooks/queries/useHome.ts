'use client';

import { useQuery } from '@tanstack/react-query';
import {
  homeService,
  BirthdayResponse,
  WorkAnniversaryResponse,
  NewJoineeResponse,
  OnLeaveEmployeeResponse,
  RemoteWorkerResponse,
  UpcomingHolidayResponse,
  AttendanceTodayResponse,
} from '@/lib/services/home.service';
import { wallService, WallPostResponse, PageResponse } from '@/lib/services/wall.service';
import { leaveService } from '@/lib/services/leave.service';
import { LeaveBalance } from '@/lib/types/leave';

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const homeKeys = {
  all: ['home'] as const,
  // Birthdays
  birthdays: () => [...homeKeys.all, 'birthdays'] as const,
  birthdaysList: (days: number) => [...homeKeys.birthdays(), { days }] as const,
  // Anniversaries
  anniversaries: () => [...homeKeys.all, 'anniversaries'] as const,
  anniversariesList: (days: number) => [...homeKeys.anniversaries(), { days }] as const,
  // New joinees
  newJoinees: () => [...homeKeys.all, 'newJoinees'] as const,
  newJoineesList: (days: number) => [...homeKeys.newJoinees(), { days }] as const,
  // Holidays
  holidays: () => [...homeKeys.all, 'holidays'] as const,
  holidaysList: (days: number) => [...homeKeys.holidays(), { days }] as const,
  // Employees on leave
  onLeave: () => [...homeKeys.all, 'onLeave'] as const,
  // Remote workers
  remoteWorkers: () => [...homeKeys.all, 'remoteWorkers'] as const,
  // My attendance
  myAttendance: () => [...homeKeys.all, 'myAttendance'] as const,
  // Wall posts
  wallPosts: () => [...homeKeys.all, 'wallPosts'] as const,
  wallPostsList: (page: number, size: number) =>
    [...homeKeys.wallPosts(), { page, size }] as const,
  // Leave balances
  leaveBalances: () => [...homeKeys.all, 'leaveBalances'] as const,
  leaveBalancesForEmployee: (employeeId: string) =>
    [...homeKeys.leaveBalances(), employeeId] as const,
};

// ─── Home Dashboard Queries ──────────────────────────────────────────────────

export function useUpcomingBirthdays(days: number = 30, enabled: boolean = true) {
  return useQuery({
    queryKey: homeKeys.birthdaysList(days),
    queryFn: () => homeService.getUpcomingBirthdays(days),
    enabled,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnWindowFocus: false,
  });
}

export function useUpcomingAnniversaries(days: number = 30, enabled: boolean = true) {
  return useQuery({
    queryKey: homeKeys.anniversariesList(days),
    queryFn: () => homeService.getUpcomingAnniversaries(days),
    enabled,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useNewJoinees(days: number = 30, enabled: boolean = true) {
  return useQuery({
    queryKey: homeKeys.newJoineesList(days),
    queryFn: () => homeService.getNewJoinees(days),
    enabled,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useUpcomingHolidays(days: number = 90, enabled: boolean = true) {
  return useQuery({
    queryKey: homeKeys.holidaysList(days),
    queryFn: () => homeService.getUpcomingHolidays(days),
    enabled,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useEmployeesOnLeaveToday(enabled: boolean = true) {
  return useQuery({
    queryKey: homeKeys.onLeave(),
    queryFn: () => homeService.getEmployeesOnLeaveToday(),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
  });
}

export function useRemoteWorkersToday(enabled: boolean = true) {
  return useQuery({
    queryKey: homeKeys.remoteWorkers(),
    queryFn: () => homeService.getRemoteWorkersToday(),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
  });
}

export function useMyAttendanceToday(enabled: boolean = true) {
  return useQuery({
    queryKey: homeKeys.myAttendance(),
    queryFn: () => homeService.getMyAttendanceToday(),
    enabled,
    staleTime: 30 * 1000, // 30 seconds for real-time
    gcTime: 5 * 60 * 1000,
  });
}

export function useWallPostsHome(page: number = 0, size: number = 10, enabled: boolean = true) {
  return useQuery({
    queryKey: homeKeys.wallPostsList(page, size),
    queryFn: () => wallService.getPosts(page, size),
    enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useLeaveBalances(employeeId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: homeKeys.leaveBalancesForEmployee(employeeId || ''),
    queryFn: () => leaveService.getEmployeeBalances(employeeId!),
    enabled: enabled && !!employeeId,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

// ─── Home Dashboard Data (combined hook) ────────────────────────────────────

export interface HomeDashboardData {
  birthdays: BirthdayResponse[];
  anniversaries: WorkAnniversaryResponse[];
  newJoinees: NewJoineeResponse[];
  holidays: UpcomingHolidayResponse[];
  onLeaveToday: OnLeaveEmployeeResponse[];
  remoteWorkers: RemoteWorkerResponse[];
  attendanceToday: AttendanceTodayResponse | null;
  wallPosts: WallPostResponse[];
  leaveBalances: LeaveBalance[];
}

/**
 * Composite hook that loads all home dashboard data in parallel
 * Use this for the initial page load to fetch all data at once
 */
export function useHomeDashboard(enabled: boolean = true) {
  const birthdays = useUpcomingBirthdays(30, enabled);
  const anniversaries = useUpcomingAnniversaries(30, enabled);
  const newJoinees = useNewJoinees(30, enabled);
  const holidays = useUpcomingHolidays(90, enabled);
  const onLeaveToday = useEmployeesOnLeaveToday(enabled);
  const remoteWorkers = useRemoteWorkersToday(enabled);
  const attendanceToday = useMyAttendanceToday(enabled);
  const wallPosts = useWallPostsHome(0, 10, enabled);
  const leaveBalances = useLeaveBalances(
    attendanceToday.data?.employeeId || null,
    enabled && !!attendanceToday.data?.employeeId
  );

  const isLoading =
    birthdays.isLoading ||
    anniversaries.isLoading ||
    newJoinees.isLoading ||
    holidays.isLoading ||
    onLeaveToday.isLoading ||
    remoteWorkers.isLoading ||
    attendanceToday.isLoading ||
    wallPosts.isLoading;

  const isError =
    birthdays.isError ||
    anniversaries.isError ||
    newJoinees.isError ||
    holidays.isError ||
    onLeaveToday.isError ||
    remoteWorkers.isError ||
    attendanceToday.isError ||
    wallPosts.isError;

  const data: HomeDashboardData = {
    birthdays: birthdays.data || [],
    anniversaries: anniversaries.data || [],
    newJoinees: newJoinees.data || [],
    holidays: holidays.data || [],
    onLeaveToday: onLeaveToday.data || [],
    remoteWorkers: remoteWorkers.data || [],
    attendanceToday: attendanceToday.data || null,
    wallPosts: (wallPosts.data as PageResponse<WallPostResponse>)?.content || [],
    leaveBalances: leaveBalances.data || [],
  };

  return {
    data,
    isLoading,
    isError,
    error: birthdays.error || anniversaries.error || newJoinees.error || holidays.error,
  };
}
