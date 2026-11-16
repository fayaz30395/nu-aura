'use client';

import {useCallback, useState} from 'react';
import {useToast} from '@/components/ui/Toast';
import {useCheckIn, useCheckOut} from '@/lib/hooks/queries/useAttendance';

function apiMessage(err: unknown): string | undefined {
  return (err as {response?: {data?: {message?: string}}})?.response?.data?.message;
}

/** Check-in / check-out handlers for the signed-in employee, with a page-level error message. */
export function useAttendanceClock(employeeId: string | undefined, todayStr: string) {
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();

  const getLocation = useCallback(async (): Promise<string> => {
    try {
      if (navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {timeout: 5000})
        );
        return `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
      }
    } catch {
      toast.info('Location services unavailable. Attendance recorded without location.');
    }
    return 'Location unavailable';
  }, [toast]);

  const checkIn = useCallback(async () => {
    try {
      setError(null);
      if (!employeeId) {
        setError('User not found. Please login again.');
        return;
      }
      const location = await getLocation();
      // Omit checkInTime so the backend stamps the tenant-local time (single source of truth).
      await checkInMutation.mutateAsync({employeeId, attendanceDate: todayStr, source: 'WEB', location});
    } catch (err: unknown) {
      setError(apiMessage(err) || 'Failed to check in. Please try again.');
    }
  }, [employeeId, getLocation, checkInMutation, todayStr]);

  /** Resolves true when the check-out succeeded. */
  const checkOut = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      if (!employeeId) {
        setError('User not found. Please login again.');
        return false;
      }
      const location = await getLocation();
      // Omit checkOutTime so the backend stamps the tenant-local time (single source of truth).
      await checkOutMutation.mutateAsync({employeeId, attendanceDate: todayStr, source: 'WEB', location});
      return true;
    } catch (err: unknown) {
      setError(apiMessage(err) || 'Failed to check out. Please try again.');
      return false;
    }
  }, [employeeId, getLocation, checkOutMutation, todayStr]);

  return {
    error,
    clearError: () => setError(null),
    checkIn,
    checkOut,
    checkInPending: checkInMutation.isPending,
    checkOutPending: checkOutMutation.isPending,
  };
}
