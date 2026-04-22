'use client';

import {useCallback, useState} from 'react';
import dynamic from 'next/dynamic';
import {motion} from 'framer-motion';
import {AppLayout} from '@/components/layout';
import {Skeleton} from '@/components/ui';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {useToast} from '@/components/ui/Toast';
import {useAuth} from '@/lib/hooks/useAuth';
import {useCheckIn, useCheckOut} from '@/lib/hooks/queries/useAttendance';
import {getLocalDateTimeString} from '@/lib/utils/dateUtils';
import {ChartLoadingFallback} from '@/lib/utils/lazy-components';
import {AttendanceMonthlyStats} from './AttendanceMonthlyStats';
import {AttendanceQuickActions, AttendanceUpcomingHolidays, AttendanceWeekProgress} from './AttendanceSidebar';
import {calculateHours, formatDuration} from './utils';
import {AttendanceClockWidget} from './_components/AttendanceClockWidget';
import {useAttendanceState} from './_components/useAttendanceState';

const AttendanceWeeklyChart = dynamic(
  () => import('./AttendanceWeeklyChart').then((mod) => ({default: mod.AttendanceWeeklyChart})),
  {loading: () => <ChartLoadingFallback/>, ssr: false},
);

export default function AttendancePage() {
  const {user, isAuthenticated, hasHydrated} = useAuth();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [showCheckOutConfirm, setShowCheckOutConfirm] = useState(false);

  const {
    todayStr,
    todayRecord,
    weeklyRecords,
    streak,
    monthStats,
    weekStats,
    chartData,
    upcomingHolidays,
    dataLoading,
  } = useAttendanceState(isAuthenticated && hasHydrated);

  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();

  const getLocation = useCallback(async (): Promise<string> => {
    try {
      if (navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {timeout: 5000}),
        );
        return `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
      }
    } catch {
      toast.info('Location services unavailable. Attendance recorded without location.');
    }
    return 'Location unavailable';
  }, [toast]);

  const handleCheckIn = useCallback(async () => {
    try {
      setError(null);
      if (!user?.employeeId) {
        setError('User not found. Please login again.');
        return;
      }
      const location = await getLocation();
      await checkInMutation.mutateAsync({
        employeeId: user.employeeId,
        checkInTime: getLocalDateTimeString(),
        source: 'WEB',
        location,
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to check in. Please try again.');
    }
  }, [user?.employeeId, getLocation, checkInMutation]);

  const performCheckOut = useCallback(async () => {
    try {
      setError(null);
      if (!user?.employeeId) {
        setError('User not found. Please login again.');
        return;
      }
      const location = await getLocation();
      await checkOutMutation.mutateAsync({
        employeeId: user.employeeId,
        checkOutTime: getLocalDateTimeString(),
        source: 'WEB',
        location,
      });
      setShowCheckOutConfirm(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to check out. Please try again.');
    }
  }, [user?.employeeId, getLocation, checkOutMutation]);

  if (dataLoading) {
    return (
      <AppLayout activeMenuItem="attendance">
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-2"><Skeleton className="h-8 w-48 rounded-lg"/><Skeleton
              className="h-4 w-32 rounded"/></div>
            <Skeleton className="h-14 w-48 rounded-xl"/>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2"><Skeleton className="h-56 rounded-lg"/></div>
            <div className="space-y-4">
              <Skeleton className="h-24 rounded-xl"/>
              <Skeleton className="h-24 rounded-xl"/>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl"/>)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2"><Skeleton className="h-80 rounded-lg"/></div>
            <div className="space-y-4">
              <Skeleton className="h-28 rounded-xl"/>
              <Skeleton className="h-28 rounded-xl"/>
              <Skeleton className="h-28 rounded-xl"/>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="attendance">
      <motion.div
        className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6"
        initial={{opacity: 0, y: 8}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.25, ease: 'easeOut'}}
      >
        <AttendanceClockWidget
          todayRecord={todayRecord}
          userName={user?.firstName}
          streak={streak}
          weekStats={weekStats}
          error={error}
          onCheckIn={handleCheckIn}
          onCheckOutRequest={() => setShowCheckOutConfirm(true)}
          checkInPending={checkInMutation.isPending}
          checkOutPending={checkOutMutation.isPending}
        />

        <AttendanceMonthlyStats monthStats={monthStats}/>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AttendanceWeeklyChart chartData={chartData} attendanceRate={monthStats.attendanceRate}/>

          <div className="space-y-4">
            <AttendanceQuickActions/>
            <AttendanceUpcomingHolidays holidays={upcomingHolidays} todayStr={todayStr}/>
            <AttendanceWeekProgress weekStats={weekStats} weeklyRecords={weeklyRecords}/>
          </div>
        </div>

        <ConfirmDialog
          isOpen={showCheckOutConfirm}
          onClose={() => setShowCheckOutConfirm(false)}
          onConfirm={performCheckOut}
          title="Confirm Check Out"
          message={`You have worked ${formatDuration(calculateHours(todayRecord?.checkInTime, undefined))} today. Are you sure you want to check out?`}
          confirmText="Check Out"
          cancelText="Cancel"
          type="warning"
          loading={checkOutMutation.isPending}
        />
      </motion.div>
    </AppLayout>
  );
}
