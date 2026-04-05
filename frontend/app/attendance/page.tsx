'use client';

import {memo, useCallback, useEffect, useMemo, useState} from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Flame,
  LogIn,
  LogOut,
  MapPin,
  Sunrise,
  Target,
} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Card, CardContent} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Skeleton} from '@/components/ui';
import {useAuth} from '@/lib/hooks/useAuth';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {AttendanceRecord, Holiday} from '@/lib/types/hrms/attendance';
import {
  getDateOffsetString,
  getLocalDateString,
  getLocalDateTimeString,
  getMonthStartString
} from '@/lib/utils/dateUtils';
import {motion} from 'framer-motion';
import {useAttendanceByDateRange, useCheckIn, useCheckOut, useHolidaysByYear,} from '@/lib/hooks/queries/useAttendance';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {useToast} from '@/components/ui/Toast';

// Extracted sub-components (Loop 3 refactor — FE-016)
import {
  calculateHours,
  computeMonthStats,
  computeStreak,
  computeWeekStats,
  formatDuration,
  formatTime,
  GRACE_PERIOD_MINS,
  STANDARD_WORK_HOURS,
} from './utils';
import dynamic from 'next/dynamic';
import type {ChartEntry} from './AttendanceWeeklyChart';
import {ChartLoadingFallback} from '@/lib/utils/lazy-components';
import {AttendanceMonthlyStats} from './AttendanceMonthlyStats';
import {AttendanceQuickActions, AttendanceUpcomingHolidays, AttendanceWeekProgress} from './AttendanceSidebar';

const AttendanceWeeklyChart = dynamic(
  () => import('./AttendanceWeeklyChart').then((mod) => ({default: mod.AttendanceWeeklyChart})),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);

// ─── Progress Ring ────────────────────────────────────────────────────────────
function ProgressRing({
                        progress,
                        size = 120,
                        strokeWidth = 8,
                        color = 'var(--chart-primary)',
                        bgColor = 'var(--border-subtle)',
                        children,
                      }: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const offset = circumference - (clampedProgress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{width: size, height: size}}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={bgColor} strokeWidth={strokeWidth}/>
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

// ─── Clock Widget ─────────────────────────────────────────────────────────────
// Isolated into its own memoized component so the 1-second clock tick only
// re-renders this subtree. AttendanceMonthlyStats, AttendanceWeeklyChart, and
// the sidebar are completely unaffected by the interval.
interface AttendanceClockWidgetProps {
  todayRecord: AttendanceRecord | null;
  userName: string | undefined;
  streak: number;
  weekStats: ReturnType<typeof computeWeekStats>;
  error: string | null;
  onCheckIn: () => Promise<void>;
  onCheckOutRequest: () => void;
  checkInPending: boolean;
  checkOutPending: boolean;
}

const AttendanceClockWidget = memo(function AttendanceClockWidget({
                                                                    todayRecord,
                                                                    userName,
                                                                    streak,
                                                                    weekStats,
                                                                    error,
                                                                    onCheckIn,
                                                                    onCheckOutRequest,
                                                                    checkInPending,
                                                                    checkOutPending,
                                                                  }: AttendanceClockWidgetProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const greeting = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, [currentTime]);

  const isCheckedIn = !!todayRecord?.checkInTime;
  const isCheckedOut = !!todayRecord?.checkOutTime;
  const dayComplete = isCheckedIn && isCheckedOut;

  const currentWorkHours = useMemo(
    () => calculateHours(todayRecord?.checkInTime, todayRecord?.checkOutTime || undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todayRecord, currentTime]
  );

  const workProgress = Math.min((currentWorkHours / STANDARD_WORK_HOURS) * 100, 100);
  const isOvertime = currentWorkHours > STANDARD_WORK_HOURS;
  const overtimeHours = isOvertime ? currentWorkHours - STANDARD_WORK_HOURS : 0;

  const isLateToday = useMemo(() => {
    if (!todayRecord?.checkInTime) return false;
    const checkIn = new Date(todayRecord.checkInTime);
    const shiftStart = new Date(checkIn);
    shiftStart.setHours(9, GRACE_PERIOD_MINS, 0, 0);
    return checkIn > shiftStart;
  }, [todayRecord]);

  const lateByMinutes = useMemo(() => {
    if (!isLateToday || !todayRecord?.checkInTime) return 0;
    const checkIn = new Date(todayRecord.checkInTime);
    const shiftStart = new Date(checkIn);
    shiftStart.setHours(9, GRACE_PERIOD_MINS, 0, 0);
    return Math.round((checkIn.getTime() - shiftStart.getTime()) / 60000);
  }, [isLateToday, todayRecord]);

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center">
              <Clock className="h-4 w-4 text-white"/>
            </div>
            <h1 className="text-page-title text-[var(--text-primary)] skeuo-emboss">Attendance</h1>
          </div>
          <p className="text-sm ml-10">
            <span className="font-medium text-[var(--text-primary)]">{greeting}, {userName || 'there'}</span>
            <span className="text-[var(--text-muted)]"> · </span>
            <span className="text-[var(--text-secondary)]">{currentTime.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Streak Badge */}
          {streak > 0 && (
            <div
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-warning-50 to-warning-50 dark:from-warning-900/20 dark:to-warning-900/20 rounded-lg border border-warning-200 dark:border-warning-800">
              <Flame className="h-5 w-5 text-warning-500"/>
              <div>
                <div className="text-lg font-bold text-warning-600 dark:text-warning-400 leading-none">{streak}</div>
                <div className="text-xs text-warning-500 dark:text-warning-400">day streak</div>
              </div>
            </div>
          )}
          {/* Live Clock */}
          <div
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-surface)] rounded-lg shadow-[var(--shadow-card)] border border-[var(--border-main)]">
            <div
              className="h-10 w-10 rounded-full bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center">
              <Clock className="h-5 w-5 text-white animate-pulse"/>
            </div>
            <div>
              <div className="text-xs font-semibold text-accent-500 dark:text-accent-400 uppercase tracking-wider">Live
                Time
              </div>
              <div className="text-xl font-mono font-bold text-[var(--text-primary)] tabular-nums">
                {currentTime.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', second: '2-digit'})}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="p-4 tint-danger border-l-4 border-danger-500 rounded-lg flex items-start gap-2 text-danger-700 dark:text-danger-400">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0"/>
          <div><p className="font-semibold text-sm">Error</p><p className="text-xs">{error}</p></div>
        </div>
      )}

      {/* ── Main Section: Clock Card + Progress Ring ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Attendance Card */}
        <div className="lg:col-span-2">
          <Card
            className="bg-gradient-to-br from-accent-600 via-accent-600 to-accent-700 text-white overflow-hidden relative border-0 shadow-[var(--shadow-dropdown)]">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                backgroundSize: '32px 32px'
              }}/>
            </div>
            <div
              className="absolute top-0 right-0 w-64 h-64 bg-[var(--bg-card)] opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"/>

            <CardContent className="flex flex-col justify-between p-6 relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div className="space-y-1">
                  <div
                    className={`inline-flex items-center gap-1.5 px-4 py-1 backdrop-blur-sm rounded-full text-xs font-bold uppercase tracking-wider ${
                      dayComplete ? 'bg-success-500/25 text-success-200' : isCheckedIn ? 'bg-success-400/25 text-success-200' : 'bg-white/15 text-white/80'
                    }`}>
                    <div
                      className={`h-2 w-2 rounded-full ${isCheckedIn && !isCheckedOut ? 'bg-success-400 animate-pulse' : dayComplete ? 'bg-success-400' : 'bg-white/50'}`}/>
                    {dayComplete ? 'Day Complete' : isCheckedIn ? 'Currently Working' : 'Not Started'}
                  </div>
                  <div className="text-2xl lg:text-3xl font-extrabold text-white drop-shadow-[var(--shadow-card)]">
                    {currentTime.toLocaleDateString('en-US', {weekday: 'long', month: 'short', day: 'numeric'})}
                  </div>
                  {isLateToday && (
                    <div
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-danger-500/30 rounded-full text-xs font-medium text-danger-200">
                      <AlertTriangle className="h-3 w-3"/>
                      Late by {lateByMinutes}m
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div
                    className="text-4xl lg:text-5xl font-extrabold font-mono tracking-tight tabular-nums drop-shadow-[var(--shadow-elevated)]">
                    {currentTime.toLocaleTimeString('en-US', {hour12: true, hour: '2-digit', minute: '2-digit'})}
                  </div>
                  <div className="flex items-center gap-2 text-accent-200/80 justify-end mt-1.5">
                    <MapPin className="h-3.5 w-3.5"/>
                    <span
                      className="text-xs font-medium">{todayRecord?.checkInLocation || 'Location unavailable'}</span>
                  </div>
                </div>
              </div>

              {/* Time + Action */}
              <div className="flex items-end justify-between">
                <div className="flex gap-6">
                  <div>
                    <div className="text-xs font-semibold text-accent-200/70 uppercase tracking-wider mb-1">Check In
                    </div>
                    <div className="text-xl font-bold tabular-nums text-white">
                      {todayRecord?.checkInTime ? formatTime(todayRecord.checkInTime) : '--:--'}
                    </div>
                  </div>
                  {isCheckedOut && todayRecord?.checkOutTime && (
                    <div>
                      <div className="text-xs font-semibold text-accent-200/70 uppercase tracking-wider mb-1">Check
                        Out
                      </div>
                      <div
                        className="text-xl font-bold tabular-nums text-white">{formatTime(todayRecord.checkOutTime)}</div>
                    </div>
                  )}
                  {isCheckedIn && (
                    <div>
                      <div className="text-xs font-semibold text-accent-200/70 uppercase tracking-wider mb-1">Duration
                      </div>
                      <div
                        className="text-xl font-bold tabular-nums text-white">{formatDuration(currentWorkHours)}</div>
                    </div>
                  )}
                  {isOvertime && (
                    <div>
                      <div
                        className="text-xs font-semibold text-warning-300/80 uppercase tracking-wider mb-1">Overtime
                      </div>
                      <div
                        className="text-xl font-bold tabular-nums text-warning-300">+{formatDuration(overtimeHours)}</div>
                    </div>
                  )}
                </div>

                <div>
                  {dayComplete ? (
                    <div
                      className="bg-white/15 backdrop-blur-sm rounded-lg px-6 py-4 text-center border border-white/20">
                      <CheckCircle className="h-8 w-8 text-success-300 mx-auto mb-1"/>
                      <div className="text-sm font-bold">Day Complete!</div>
                      <div className="text-xs text-accent-100 mt-0.5">
                        {formatDuration(calculateHours(todayRecord?.checkInTime, todayRecord?.checkOutTime))} worked
                      </div>
                    </div>
                  ) : !isCheckedIn ? (
                    <PermissionGate permission={Permissions.ATTENDANCE_MARK}>
                      <Button
                        onClick={onCheckIn}
                        isLoading={checkInPending}
                        className="h-14 px-8 text-base font-semibold bg-[var(--bg-card)] text-accent-700 hover:bg-[var(--bg-surface)] border-0 shadow-[var(--shadow-dropdown)] hover:shadow-[var(--shadow-dropdown)] hover:scale-105 transition-all rounded-xl"
                      >
                        <LogIn className="h-5 w-5 mr-2"/>
                        Check In
                      </Button>
                    </PermissionGate>
                  ) : (
                    <PermissionGate permission={Permissions.ATTENDANCE_MARK}>
                      <Button
                        onClick={onCheckOutRequest}
                        isLoading={checkOutPending}
                        className="h-14 px-8 text-base font-semibold bg-gradient-to-r from-danger-500 to-accent-600 text-white hover:from-danger-600 hover:to-accent-700 border-0 shadow-[var(--shadow-dropdown)] hover:shadow-[var(--shadow-dropdown)] hover:scale-105 transition-all rounded-xl"
                      >
                        <LogOut className="h-5 w-5 mr-2"/>
                        Check Out
                      </Button>
                    </PermissionGate>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Ring + Today Stats */}
        <div className="space-y-4">
          {/* Work Progress */}
          <Card
            className="card-aura skeuo-card border border-[var(--border-main)] shadow-[var(--shadow-elevated)] overflow-hidden">
            <CardContent className="p-6 flex items-center gap-6 relative">
              <div
                className={`absolute inset-0 opacity-[0.04] ${isOvertime ? 'bg-gradient-to-br from-warning-500 to-warning-500' : workProgress >= 100 ? 'bg-gradient-to-br from-success-500 to-success-500' : 'bg-gradient-to-br from-accent-500 to-accent-500'}`}/>
              <ProgressRing
                progress={workProgress}
                size={110}
                strokeWidth={10}
                color={isOvertime ? 'var(--chart-warning)' : workProgress >= 100 ? 'var(--chart-success)' : 'var(--chart-info)'}
              >
                <div className="text-center">
                  <div className="text-stat-medium text-[var(--text-primary)] tabular-nums leading-none skeuo-emboss">
                    {currentWorkHours.toFixed(1)}
                  </div>
                  <div className="text-xs font-medium text-[var(--text-muted)] mt-0.5">/ {STANDARD_WORK_HOURS}h</div>
                </div>
              </ProgressRing>
              <div className="flex-1 space-y-2 relative z-10">
                <h3 className="text-card-title text-[var(--text-primary)]">Work Progress</h3>
                <div className={`text-sm font-medium ${
                  dayComplete ? 'text-success-600 dark:text-success-400' :
                    isOvertime ? 'text-warning-600 dark:text-warning-400' :
                      isCheckedIn ? 'text-[var(--text-secondary)]' :
                        'text-accent-700 dark:text-accent-400'
                }`}>
                  {dayComplete
                    ? 'Great work today!'
                    : isOvertime
                      ? `+${formatDuration(overtimeHours)} overtime`
                      : isCheckedIn
                        ? `${formatDuration(STANDARD_WORK_HOURS - currentWorkHours)} remaining`
                        : 'Clock in to start your day'}
                </div>
                {isCheckedIn && (
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`h-2 w-2 rounded-full ${isOvertime ? 'bg-warning-500' : workProgress >= 100 ? 'bg-success-500' : 'bg-accent-500'} animate-pulse`}/>
                    <span
                      className={`text-xs font-bold ${isOvertime ? 'text-warning-600 dark:text-warning-400' : workProgress >= 100 ? 'text-success-600 dark:text-success-400' : 'text-accent-700 dark:text-accent-400'}`}>
                      {Math.round(workProgress)}% complete
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Averages */}
          <Card className="card-aura skeuo-card border border-[var(--border-main)] shadow-[var(--shadow-elevated)]">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-[var(--shadow-card)]">
                      <Sunrise className="h-4 w-4 text-white"/>
                    </div>
                    <p className="text-micro text-accent-600 dark:text-accent-400">Avg In</p>
                  </div>
                  <p
                    className="text-stat-medium text-[var(--text-primary)] tabular-nums skeuo-emboss">{weekStats.avgCheckIn}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="h-8 w-8 rounded-lg bg-gradient-to-br from-warning-500 to-warning-600 flex items-center justify-center shadow-[var(--shadow-card)]">
                      <Target className="h-4 w-4 text-white"/>
                    </div>
                    <p className="text-micro text-warning-600 dark:text-warning-400">Avg Hrs</p>
                  </div>
                  <p
                    className="text-stat-medium text-[var(--text-primary)] tabular-nums skeuo-emboss">{weekStats.avgHours}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
});

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const {user, isAuthenticated, hasHydrated} = useAuth();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [showCheckOutConfirm, setShowCheckOutConfirm] = useState(false);

  const todayStr = getLocalDateString();
  const lastWeekStr = getDateOffsetString(-6);

  // Monthly range for stats
  const now = new Date();
  const monthStartStr = getMonthStartString(now.getFullYear(), now.getMonth());

  // Fetch today's attendance
  const {data: todayData, isLoading: todayLoading} = useAttendanceByDateRange(
    todayStr, todayStr, isAuthenticated && hasHydrated
  );

  // Fetch weekly attendance (last 7 days)
  const {data: weeklyData, isLoading: weeklyLoading} = useAttendanceByDateRange(
    lastWeekStr, todayStr, isAuthenticated && hasHydrated
  );

  // Fetch monthly attendance
  const {data: monthlyData} = useAttendanceByDateRange(
    monthStartStr, todayStr, isAuthenticated && hasHydrated
  );

  // Fetch holidays
  const currentYear = now.getFullYear();
  const {data: holidaysData} = useHolidaysByYear(currentYear);

  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();

  const todayRecord: AttendanceRecord | null = todayData?.[0] ?? null;
  // Stable references prevent downstream useMemo hooks from re-running on every render
  const weeklyRecords = useMemo<AttendanceRecord[]>(() => weeklyData ?? [], [weeklyData]);
  const monthlyRecords = useMemo<AttendanceRecord[]>(() => monthlyData ?? [], [monthlyData]);
  const holidays = useMemo<Holiday[]>(() => holidaysData ?? [], [holidaysData]);

  // ─── Handlers ─────────────────────────────────────────────────────────
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

  // ─── Derived Data ──────────────────────────────────────────────────────
  const streak = useMemo(() => computeStreak(monthlyRecords), [monthlyRecords]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const monthStats = useMemo(() => computeMonthStats(monthlyRecords, now), [monthlyRecords]);

  const weekStats = useMemo(() => computeWeekStats(weeklyRecords), [weeklyRecords]);

  const holidaySet = useMemo(() => new Set(holidays.map(h => h.holidayDate)), [holidays]);

  const chartData: ChartEntry[] = useMemo(() => {
    const days: ChartEntry[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = getLocalDateString(d);
      const dayName = d.toLocaleDateString('en-US', {weekday: 'short'});
      const record = weeklyRecords.find(r => r.attendanceDate === dateStr);
      const hours = record ? calculateHours(record.checkInTime, record.checkOutTime) : 0;
      const isWeeklyOff = d.getDay() === 0 || d.getDay() === 6;
      const isHoliday = holidaySet.has(dateStr);

      days.push({
        name: dayName,
        date: dateStr,
        hours: parseFloat(hours.toFixed(1)),
        isToday: i === 0,
        isHoliday,
        isWeeklyOff,
        checkIn: record?.checkInTime ? formatTime(record.checkInTime) : null,
        checkOut: record?.checkOutTime ? formatTime(record.checkOutTime) : null,
        status: record?.status || (isHoliday ? 'HOLIDAY' : isWeeklyOff ? 'WEEKLY_OFF' : 'ABSENT'),
        overtime: Math.max(0, parseFloat((hours - STANDARD_WORK_HOURS).toFixed(1))),
      });
    }
    return days;
  }, [weeklyRecords, holidaySet]);

  const upcomingHolidays = useMemo(() => {
    return holidays
      .filter(h => new Date(h.holidayDate + 'T00:00:00') >= new Date(todayStr + 'T00:00:00'))
      .sort((a, b) => a.holidayDate.localeCompare(b.holidayDate))
      .slice(0, 3);
  }, [holidays, todayStr]);

  // ─── Loading ──────────────────────────────────────────────────────────
  const dataLoading = todayLoading || weeklyLoading;

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
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl"/>)}
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

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <AppLayout activeMenuItem="attendance">
      <motion.div
        className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6"
        initial={{opacity: 0, y: 8}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.25, ease: 'easeOut'}}
      >
        {/* Clock widget — owns currentTime; isolated so the 1s tick doesn't
            propagate to the stats, chart, or sidebar below */}
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

        {/* ── Monthly Stats Row ───────────────────────────────── */}
        <AttendanceMonthlyStats monthStats={monthStats}/>

        {/* ── Chart + Quick Actions ───────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AttendanceWeeklyChart chartData={chartData} attendanceRate={monthStats.attendanceRate}/>

          <div className="space-y-4">
            <AttendanceQuickActions/>
            <AttendanceUpcomingHolidays holidays={upcomingHolidays} todayStr={todayStr}/>
            <AttendanceWeekProgress weekStats={weekStats} weeklyRecords={weeklyRecords}/>
          </div>
        </div>

        {/* Checkout Confirmation */}
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
