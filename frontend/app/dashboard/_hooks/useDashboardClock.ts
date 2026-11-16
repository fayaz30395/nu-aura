'use client';

import {useState} from 'react';
import {useAttendanceByDateRange, useCheckIn, useCheckOut, useMyTimeEntries} from '@/lib/hooks/queries/useAttendance';
import {getLocalDateString, getLocalDateTimeString} from '@/lib/utils/dateUtils';

function errorMessage(err: unknown, fallback: string): string {
  return (err as {response?: {data?: {message?: string}}})?.response?.data?.message || fallback;
}

/** Today's attendance record, time-entry sessions and the check-in / check-out actions. */
export function useDashboardClock(employeeId: string | undefined) {
  const [clockError, setClockError] = useState<string | null>(null);
  const today = getLocalDateString();
  const {data: attendanceRangeData = []} = useAttendanceByDateRange(today, today, !!employeeId);
  const {data: timeEntries = []} = useMyTimeEntries(today, !!employeeId);
  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();

  const todayAttendance = attendanceRangeData.length > 0 ? attendanceRangeData[0] : null;
  const hasCheckedIn = Boolean(todayAttendance?.checkInTime);
  const hasCheckedOut = Boolean(todayAttendance?.checkOutTime);
  const hasOpenSession =
    timeEntries.some(entry => (entry.open ?? !entry.checkOutTime)) ||
    (timeEntries.length === 0 && hasCheckedIn && !hasCheckedOut);

  const handleCheckIn = async () => {
    if (!employeeId) return;
    try {
      setClockError(null);
      await checkInMutation.mutateAsync({
        employeeId,
        checkInTime: getLocalDateTimeString(),
        attendanceDate: getLocalDateString(),
      });
    } catch (err: unknown) {
      setClockError(errorMessage(err, 'Failed to check in'));
    }
  };

  const handleCheckOut = async () => {
    if (!employeeId) return;
    try {
      setClockError(null);
      await checkOutMutation.mutateAsync({
        employeeId,
        checkOutTime: getLocalDateTimeString(),
        attendanceDate: getLocalDateString(),
      });
    } catch (err: unknown) {
      setClockError(errorMessage(err, 'Failed to check out'));
    }
  };

  return {
    todayAttendance,
    timeEntries,
    hasOpenSession,
    canCheckIn: !hasOpenSession,
    canCheckOut: hasOpenSession,
    attendanceComplete: !hasOpenSession && (hasCheckedIn || hasCheckedOut || timeEntries.length > 0),
    clockError,
    handleCheckIn,
    handleCheckOut,
    checkInPending: checkInMutation.isPending,
    checkOutPending: checkOutMutation.isPending,
  };
}
