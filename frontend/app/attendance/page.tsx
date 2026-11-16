'use client';

import {useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Button} from '@mantine/core';
import {Fingerprint, Palmtree, RefreshCw} from 'lucide-react';

import {AppLayout} from '@/components/layout';
import {Callout} from '@/components/ui/Callout';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {Segmented} from '@/components/ui/Segmented';
import {useAuth} from '@/lib/hooks/useAuth';
import {AttendanceRecord} from '@/lib/types/hrms/attendance';
import {getDateOffsetString, getLocalDateString, getMonthStartString} from '@/lib/utils/dateUtils';
import {useAttendanceByDateRange, useHolidaysByYear} from '@/lib/hooks/queries/useAttendance';

import {calculateHours, computeMonthStats, computeWeekStats, formatDuration} from './utils';
import {useAttendanceClock} from './_hooks/useAttendanceClock';
import {TodayCard} from './_components/TodayCard';
import {WeeklyHeatmap} from './_components/WeeklyHeatmap';
import {
  AttendanceQuickLinks,
  AttendanceStatsRow,
  LateAttentionStrip,
  PanelSkeleton,
  TodayPunches,
} from './_components/AttendanceOverviewParts';

export default function AttendancePage() {
  const {user, isAuthenticated, hasHydrated} = useAuth();
  const router = useRouter();
  const [showCheckOutConfirm, setShowCheckOutConfirm] = useState(false);

  const todayStr = getLocalDateString();
  const lastWeekStr = getDateOffsetString(-6);
  const now = useMemo(() => new Date(), []);
  const monthStartStr = getMonthStartString(now.getFullYear(), now.getMonth());
  const ready = isAuthenticated && hasHydrated;

  const todayQuery = useAttendanceByDateRange(todayStr, todayStr, ready);
  const weeklyQuery = useAttendanceByDateRange(lastWeekStr, todayStr, ready);
  const monthlyQuery = useAttendanceByDateRange(monthStartStr, todayStr, ready);
  // Holidays kept fetched (warm cache for sub-routes); not surfaced on this view.
  useHolidaysByYear(now.getFullYear());

  const clock = useAttendanceClock(user?.employeeId, todayStr);

  const todayRecord: AttendanceRecord | null = todayQuery.data?.[0] ?? null;
  const monthlyRecords = useMemo<AttendanceRecord[]>(() => monthlyQuery.data ?? [], [monthlyQuery.data]);
  // `now` is stable for the component lifetime; recompute is driven by monthlyRecords only.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const monthStats = useMemo(() => computeMonthStats(monthlyRecords, now), [monthlyRecords]);
  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'You';

  const handleConfirmCheckOut = async () => {
    if (await clock.checkOut()) setShowCheckOutConfirm(false);
  };

  return (
    <AppLayout activeMenuItem="attendance">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Attendance"
          description="Live attendance, check-ins and weekly patterns."
          actions={
            <Segmented
              aria-label="Attendance or Leave"
              value="attendance"
              onChange={(v) => router.push(v === 'leave' ? '/leave' : '/attendance')}
              options={[
                {value: 'attendance', label: 'Attendance', icon: <Fingerprint className="h-4 w-4" aria-hidden="true"/>},
                {value: 'leave', label: 'Leave', icon: <Palmtree className="h-4 w-4" aria-hidden="true"/>},
              ]}
            />
          }
        />

        {clock.error && (
          <Callout
            tone="danger"
            title="Could not complete request"
            action={
              <Button
                variant="default"
                size="xs"
                leftSection={<RefreshCw size={14} aria-hidden="true"/>}
                onClick={() => {
                  clock.clearError();
                  todayQuery.refetch();
                }}
              >
                Retry
              </Button>
            }
          >
            {clock.error}
          </Callout>
        )}

        <QueryState
          query={weeklyQuery}
          skeleton={<PanelSkeleton height={160}/>}
          errorTitle="Couldn't load your attendance this week"
        >
          {(weekly) => {
            const weekStats = computeWeekStats(weekly);
            const overtimeHours = weekly.reduce((acc, r) => acc + (r.overtimeMinutes ?? 0) / 60, 0);
            return (
              <div className="flex flex-col gap-6">
                <AttendanceStatsRow
                  presentThisMonth={monthStats.present}
                  attendanceRate={monthStats.attendanceRate}
                  avgCheckIn={weekStats.avgCheckIn}
                  avgHours={weekStats.avgHours}
                  overtimeHours={overtimeHours}
                />
                <WeeklyHeatmap
                  name={userName}
                  weeklyRecords={weekly}
                  avgCheckIn={weekStats.avgCheckIn}
                  avgHours={weekStats.avgHours}
                />
              </div>
            );
          }}
        </QueryState>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <QueryState
              query={todayQuery}
              skeleton={<PanelSkeleton height={200}/>}
              errorTitle="Couldn't load today's attendance"
            >
              {() => (
                <>
                  <TodayCard
                    todayRecord={todayRecord}
                    onCheckIn={clock.checkIn}
                    onCheckOutRequest={() => setShowCheckOutConfirm(true)}
                    checkInPending={clock.checkInPending}
                    checkOutPending={clock.checkOutPending}
                  />
                  <LateAttentionStrip todayRecord={todayRecord}/>
                  {todayRecord && (
                    <TodayPunches
                      todayRecord={todayRecord}
                      workedHours={calculateHours(todayRecord.checkInTime, todayRecord.checkOutTime || undefined)}
                    />
                  )}
                </>
              )}
            </QueryState>
          </div>
          <div className="lg:col-span-5">
            <AttendanceQuickLinks/>
          </div>
        </div>

        <ConfirmDialog
          isOpen={showCheckOutConfirm}
          onClose={() => setShowCheckOutConfirm(false)}
          onConfirm={handleConfirmCheckOut}
          title="Confirm Check Out"
          message={`You have worked ${formatDuration(calculateHours(todayRecord?.checkInTime, undefined))} today. Are you sure you want to check out?`}
          confirmText="Check Out"
          cancelText="Cancel"
          type="warning"
          loading={clock.checkOutPending}
        />
      </div>
    </AppLayout>
  );
}
