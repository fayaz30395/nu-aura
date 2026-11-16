'use client';

import {useEffect, useState} from 'react';
import {useAuth} from '@/lib/hooks/useAuth';
import {
  useAttendanceByDateRange,
  useCheckIn,
  useCheckOut,
  useMyTimeEntries,
  useRequestRegularization,
  useTodayAttendance
} from '@/lib/hooks/queries/useAttendance';
import type {AttendanceRecord} from '@/lib/types/hrms/attendance';
import {getLocalDateString, getMonthEndString, getMonthStartString} from '@/lib/utils/dateUtils';
import {createLogger} from '@/lib/utils/logger';

const log = createLogger('AttendancePage');

type ApiError = { response?: { data?: { message?: string } } };
const apiMessage = (err: unknown, fallback: string) => (err as ApiError)?.response?.data?.message || fallback;

const toDateKey = (value: string | undefined) => (value?.includes('T') ? value.split('T')[0] : value);

export function useMyAttendance() {
  const {user, isAuthenticated, hasHydrated} = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const startOfMonth = getMonthStartString(currentDate.getFullYear(), currentDate.getMonth());
  const endOfMonth = getMonthEndString(currentDate.getFullYear(), currentDate.getMonth());

  const {
    data: attendance = [],
    isLoading: isLoadingAttendance
  } = useAttendanceByDateRange(startOfMonth, endOfMonth, Boolean(hasHydrated && user?.employeeId));
  const todayDateStr = getLocalDateString();
  const {
    data: selectedDateTimeEntries = [],
    isLoading: isLoadingTimeEntries
  } = useMyTimeEntries(selectedDate ? getLocalDateString(selectedDate) : todayDateStr, Boolean(selectedDate));

  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const requestRegularization = useRequestRegularization();

  const {data: todayAttendance} = useTodayAttendance(Boolean(hasHydrated && user?.employeeId));

  useEffect(() => {
    if (!hasHydrated) return;

    if (isAuthenticated && user?.employeeId) {
      setSelectedDate(new Date());
    }
  }, [hasHydrated, isAuthenticated, user]);

  useEffect(() => {
    document.title = 'My Attendance | NU-AURA';
  }, []);

  const handleCheckIn = async () => {
    try {
      setError(null);

      // Omit the time so the backend stamps the tenant-local instant (single source of truth);
      // attendanceDate stays client-local only to key the optimistic cache entry.
      const localDate = getLocalDateString();

      await checkIn.mutateAsync({
        employeeId: user!.employeeId!,
        attendanceDate: localDate,
      });
    } catch (err: unknown) {
      log.error('Failed to check in:', err);
      setError(apiMessage(err, 'Failed to check in'));
    }
  };

  const handleCheckOut = async () => {
    try {
      setError(null);

      // Omit the time so the backend stamps the tenant-local instant (single source of truth).
      const localDate = getLocalDateString();

      await checkOut.mutateAsync({
        employeeId: user!.employeeId!,
        attendanceDate: localDate,
      });
    } catch (err: unknown) {
      log.error('Failed to check out:', err);
      setError(apiMessage(err, 'Failed to check out'));
    }
  };

  /** Resolves true when the request was accepted. */
  const submitRegularization = async (record: AttendanceRecord, reason: string) => {
    try {
      setError(null);
      await requestRegularization.mutateAsync({
        id: record.id,
        data: {reason},
      });
      return true;
    } catch (err: unknown) {
      log.error('Failed to request regularization:', err);
      setError(apiMessage(err, 'Failed to request regularization'));
      return false;
    }
  };

  const getAttendanceForDate = (date: Date) => {
    // Use local date format to avoid UTC timezone issues
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return attendance.find((a) => toDateKey(a.attendanceDate) === dateStr);
  };

  const workingDaysCount = attendance.filter(a => a.workDurationMinutes && a.workDurationMinutes > 0).length;
  const totalMinutes = attendance.reduce((sum, a) => sum + (a.workDurationMinutes || 0), 0);
  const monthStats = {
    present: attendance.filter((a) => a.status === 'PRESENT').length,
    absent: attendance.filter((a) => a.status === 'ABSENT').length,
    leave: attendance.filter((a) => a.status === 'ON_LEAVE').length,
    totalMinutes,
    avgHours: workingDaysCount > 0 ? totalMinutes / workingDaysCount / 60 : 0,
  };

  const hasCheckedIn = Boolean(todayAttendance?.checkInTime);
  const hasCheckedOut = Boolean(todayAttendance?.checkOutTime);

  return {
    user,
    error,
    clearError: () => setError(null),
    currentDate,
    previousMonth: () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)),
    nextMonth: () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)),
    selectedDate,
    setSelectedDate,
    selectedAttendance: selectedDate ? getAttendanceForDate(selectedDate) : null,
    selectedDateTimeEntries,
    isLoadingTimeEntries,
    isLoadingAttendance,
    getAttendanceForDate,
    todayAttendance,
    monthStats,
    canCheckIn: !hasCheckedIn,
    canCheckOut: hasCheckedIn && !hasCheckedOut,
    attendanceComplete: hasCheckedIn && hasCheckedOut,
    clockPending: checkIn.isPending || checkOut.isPending,
    handleCheckIn,
    handleCheckOut,
    submitRegularization,
    regularizationPending: requestRegularization.isPending,
  };
}

export type MyAttendanceState = ReturnType<typeof useMyAttendance>;
