'use client';

import React, {memo, useCallback, useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {motion} from 'framer-motion';
import {format as formatDateFns} from 'date-fns';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle,
  Clock,
  LogIn,
  LogOut,
  RefreshCw,
  Repeat,
  Timer,
  Users,
} from 'lucide-react';

import {AppLayout} from '@/components/layout';
import {Button} from '@/components/ui/Button';
import {Skeleton} from '@/components/ui';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {useToast} from '@/components/ui/Toast';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {useAuth} from '@/lib/hooks/useAuth';
import {AttendanceRecord, Holiday} from '@/lib/types/hrms/attendance';
import {
  getDateOffsetString,
  getLocalDateString,
  getLocalDateTimeString,
  getMonthStartString,
} from '@/lib/utils/dateUtils';
import {
  useAttendanceByDateRange,
  useCheckIn,
  useCheckOut,
  useHolidaysByYear,
} from '@/lib/hooks/queries/useAttendance';

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

// Single ease curve, matching the resources blueprint.
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const {user, isAuthenticated, hasHydrated} = useAuth();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [showCheckOutConfirm, setShowCheckOutConfirm] = useState(false);

  const todayStr = getLocalDateString();
  const lastWeekStr = getDateOffsetString(-6);
  const now = useMemo(() => new Date(), []);
  const monthStartStr = getMonthStartString(now.getFullYear(), now.getMonth());

  const {data: todayData, isLoading: todayLoading, refetch: refetchToday} = useAttendanceByDateRange(
    todayStr, todayStr, isAuthenticated && hasHydrated
  );
  const {data: weeklyData, isLoading: weeklyLoading} = useAttendanceByDateRange(
    lastWeekStr, todayStr, isAuthenticated && hasHydrated
  );
  const {data: monthlyData} = useAttendanceByDateRange(
    monthStartStr, todayStr, isAuthenticated && hasHydrated
  );
  const {data: holidaysData} = useHolidaysByYear(now.getFullYear());

  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();

  const todayRecord: AttendanceRecord | null = todayData?.[0] ?? null;
  const weeklyRecords = useMemo<AttendanceRecord[]>(() => weeklyData ?? [], [weeklyData]);
  const monthlyRecords = useMemo<AttendanceRecord[]>(() => monthlyData ?? [], [monthlyData]);
  const holidays = useMemo<Holiday[]>(() => holidaysData ?? [], [holidaysData]);

  // Derived stats
  const streak = useMemo(() => computeStreak(monthlyRecords), [monthlyRecords]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const monthStats = useMemo(() => computeMonthStats(monthlyRecords, now), [monthlyRecords]);
  const weekStats = useMemo(() => computeWeekStats(weeklyRecords), [weeklyRecords]);
  const weekHours = useMemo(
    () => weeklyRecords.reduce(
      (acc, r) => acc + calculateHours(r.checkInTime ?? undefined, r.checkOutTime ?? undefined),
      0
    ),
    [weeklyRecords]
  );
  const upcomingHolidays = useMemo(
    () => holidays
      .filter(h => new Date(h.holidayDate + 'T00:00:00') >= new Date(todayStr + 'T00:00:00'))
      .sort((a, b) => a.holidayDate.localeCompare(b.holidayDate))
      .slice(0, 3),
    [holidays, todayStr]
  );

  // Today's punches (single-record but kept as list to support multi-punch in future)
  const todayPunches = useMemo(() => {
    if (!todayRecord) return [] as Array<{label: string; time: string; tone: 'in' | 'out'}>;
    const items: Array<{label: string; time: string; tone: 'in' | 'out'}> = [];
    if (todayRecord.checkInTime) items.push({label: 'Check-in', time: formatTime(todayRecord.checkInTime), tone: 'in'});
    if (todayRecord.checkOutTime) items.push({label: 'Check-out', time: formatTime(todayRecord.checkOutTime), tone: 'out'});
    return items;
  }, [todayRecord]);

  // ── Handlers ────────────────────────────────────────────────────────────
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
      const msg = (err as {response?: {data?: {message?: string}}})?.response?.data?.message;
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
      const msg = (err as {response?: {data?: {message?: string}}})?.response?.data?.message;
      setError(msg || 'Failed to check out. Please try again.');
    }
  }, [user?.employeeId, getLocation, checkOutMutation]);

  const dataLoading = todayLoading || weeklyLoading;

  return (
    <AppLayout activeMenuItem="attendance">
      <div className="mx-auto w-full max-w-7xl px-6 py-8 space-y-10">
        <PageHeader userName={user?.firstName} streak={streak} now={now} />

        {error && (
          <ErrorBanner message={error} onRetry={() => { setError(null); refetchToday(); }} />
        )}

        {/* Stats row — borders divide instead of card boxes */}
        {dataLoading ? (
          <StatsSkeleton />
        ) : (
          <StatsRow
            weekHours={weekHours}
            leavesTaken={monthStats.absent}
            presentThisMonth={monthStats.present}
            upcomingHolidayCount={upcomingHolidays.length}
          />
        )}

        {/* Bento — one wide hero (Today / check-in state) + smaller tiles */}
        <BentoNavigation
          todayRecord={todayRecord}
          now={now}
          onCheckIn={handleCheckIn}
          onCheckOutRequest={() => setShowCheckOutConfirm(true)}
          checkInPending={checkInMutation.isPending}
          checkOutPending={checkOutMutation.isPending}
        />

        {/* Today's punches — divide-y row */}
        {todayPunches.length > 0 && (
          <TodayPunches
            punches={todayPunches}
            workedHours={calculateHours(todayRecord?.checkInTime, todayRecord?.checkOutTime || undefined)}
          />
        )}

        {/* Late alert — one-line, no card stack */}
        <LateAttentionStrip todayRecord={todayRecord} />

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
      </div>
    </AppLayout>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────
function PageHeader({userName, streak, now}: {userName: string | undefined; streak: number; now: Date}) {
  const greeting = useMemo(() => {
    const h = now.getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, [now]);

  return (
    <motion.header
      initial={{opacity: 0, y: 4}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.4, ease: EASE}}
      className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"
    >
      <div className="space-y-2 max-w-2xl">
        <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Attendance
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--text-heading)] leading-[1.05]">
          {greeting}{userName ? `, ${userName}` : ''}. Let&apos;s get the day on the record.
        </h1>
        <p className="text-body-secondary max-w-[55ch]">
          Punch in, manage regularizations, swap shifts, and see how the team is tracking — all from one place.
        </p>
      </div>
      <div className="flex items-center gap-3 self-start sm:self-end">
        {streak > 0 && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2">
            <Timer className="h-4 w-4 text-warning-500" aria-hidden="true" />
            <span className="font-mono text-sm font-semibold tabular-nums text-[var(--text-heading)]">{streak}</span>
            <span className="text-2xs font-medium uppercase tracking-wider text-[var(--text-muted)]">day streak</span>
          </div>
        )}
        <p className="text-xs text-[var(--text-secondary)] hidden sm:block">
          {formatDateFns(now, 'EEEE, MMM d')}
        </p>
      </div>
    </motion.header>
  );
}

// ── Stats row ────────────────────────────────────────────────────────────────
function StatsRow({
  weekHours,
  leavesTaken,
  presentThisMonth,
  upcomingHolidayCount,
}: {
  weekHours: number;
  leavesTaken: number;
  presentThisMonth: number;
  upcomingHolidayCount: number;
}) {
  const items = [
    {label: 'Worked this week', value: `${weekHours.toFixed(1)}h`, icon: Clock, tone: 'neutral' as const},
    {label: 'Leaves this month', value: leavesTaken, icon: CalendarClock, tone: leavesTaken > 0 ? 'warning' as const : 'neutral' as const},
    {label: 'Present this month', value: presentThisMonth, icon: CheckCircle, tone: 'neutral' as const},
    {label: 'Upcoming holidays', value: upcomingHolidayCount, icon: Users, tone: 'neutral' as const},
  ];

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={{visible: {transition: {staggerChildren: 0.06, delayChildren: 0.08}}}}
      aria-label="Attendance at a glance"
      className="grid grid-cols-2 sm:grid-cols-4 border-y border-[var(--border-subtle)] divide-x divide-[var(--border-subtle)]"
    >
      {items.map((item) => (
        <motion.div
          key={item.label}
          variants={{hidden: {opacity: 0, y: 6}, visible: {opacity: 1, y: 0, transition: {duration: 0.4, ease: EASE}}}}
          className="px-5 py-6 sm:px-7 sm:py-8 first:pl-0 last:pr-0"
        >
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-2xs font-medium uppercase tracking-wider">{item.label}</span>
          </div>
          <p
            className={`mt-3 font-mono text-3xl sm:text-4xl tabular-nums tracking-tight ${
              item.tone === 'warning'
                ? 'text-warning-700 dark:text-warning-300'
                : 'text-[var(--text-heading)]'
            }`}
          >
            {item.value}
          </p>
        </motion.div>
      ))}
    </motion.section>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 border-y border-[var(--border-subtle)] divide-x divide-[var(--border-subtle)]">
      {Array.from({length: 4}).map((_, i) => (
        <div key={i} className="px-5 py-6 sm:px-7 sm:py-8 first:pl-0 last:pr-0">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="mt-3 h-9 w-20 rounded" />
        </div>
      ))}
    </div>
  );
}

// ── Bento ────────────────────────────────────────────────────────────────────
const BentoNavigation = memo(function BentoNavigation({
  todayRecord,
  now,
  onCheckIn,
  onCheckOutRequest,
  checkInPending,
  checkOutPending,
}: {
  todayRecord: AttendanceRecord | null;
  now: Date;
  onCheckIn: () => Promise<void>;
  onCheckOutRequest: () => void;
  checkInPending: boolean;
  checkOutPending: boolean;
}) {
  const tiles = [
    {
      title: 'Team attendance',
      description: 'See who is in, who is out, and which approvals are queued for your sign-off.',
      icon: Users,
      href: '/attendance/team',
    },
    {
      title: 'Regularization',
      description: 'Raise or review missed-punch corrections with a clear audit trail.',
      icon: CalendarClock,
      href: '/attendance/regularization',
    },
    {
      title: 'Shift swap',
      description: 'Trade shifts with a teammate and route the request through your manager.',
      icon: Repeat,
      href: '/attendance/shift-swap',
    },
    {
      title: 'Compensation time',
      description: 'Track overtime banked and request comp-offs against approved hours.',
      icon: Timer,
      href: '/attendance/comp-off',
    },
  ];

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={{visible: {transition: {staggerChildren: 0.07, delayChildren: 0.18}}}}
      className="grid gap-4 grid-cols-1 lg:grid-cols-12"
      aria-label="Today and workflows"
    >
      <BentoHero
        todayRecord={todayRecord}
        now={now}
        onCheckIn={onCheckIn}
        onCheckOutRequest={onCheckOutRequest}
        checkInPending={checkInPending}
        checkOutPending={checkOutPending}
      />
      {tiles.map((tile) => (
        <BentoTile key={tile.href} {...tile} />
      ))}
    </motion.section>
  );
});

const BentoHero = memo(function BentoHero({
  todayRecord,
  now,
  onCheckIn,
  onCheckOutRequest,
  checkInPending,
  checkOutPending,
}: {
  todayRecord: AttendanceRecord | null;
  now: Date;
  onCheckIn: () => Promise<void>;
  onCheckOutRequest: () => void;
  checkInPending: boolean;
  checkOutPending: boolean;
}) {
  const [currentTime, setCurrentTime] = useState(now);
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const isCheckedIn = !!todayRecord?.checkInTime;
  const isCheckedOut = !!todayRecord?.checkOutTime;
  const dayComplete = isCheckedIn && isCheckedOut;
  const currentWorkHours = calculateHours(
    todayRecord?.checkInTime,
    todayRecord?.checkOutTime || undefined
  );
  const workProgress = Math.min((currentWorkHours / STANDARD_WORK_HOURS) * 100, 100);

  const status = dayComplete ? 'Day complete' : isCheckedIn ? 'Currently working' : 'Not started';

  return (
    <motion.div
      variants={{hidden: {opacity: 0, y: 8}, visible: {opacity: 1, y: 0, transition: {duration: 0.5, ease: EASE}}}}
      className="lg:col-span-7 lg:row-span-2"
    >
      <div className="flex h-full flex-col rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-7 sm:p-9">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  dayComplete
                    ? 'bg-success-500'
                    : isCheckedIn
                      ? 'bg-success-500 animate-pulse'
                      : 'bg-[var(--text-muted)]'
                }`}
                aria-hidden="true"
              />
              {status}
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-heading)]">
              Today, {formatDateFns(currentTime, 'MMM d')}
            </h2>
            <p className="text-body-secondary max-w-[44ch]">
              {dayComplete
                ? 'You wrapped the day. Logged hours are ready for payroll review.'
                : isCheckedIn
                  ? 'You are checked in. Tap out when your day is done.'
                  : 'You have not punched in yet. Tap in to start logging hours.'}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-3xl sm:text-4xl font-semibold tabular-nums text-[var(--text-heading)]">
              {currentTime.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})}
            </p>
            <p className="text-2xs font-medium uppercase tracking-wider text-[var(--text-muted)] mt-1">
              Live time
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-6">
          <div>
            <p className="text-2xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Check-in</p>
            <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-[var(--text-heading)]">
              {todayRecord?.checkInTime ? formatTime(todayRecord.checkInTime) : '--:--'}
            </p>
          </div>
          <div>
            <p className="text-2xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Check-out</p>
            <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-[var(--text-heading)]">
              {todayRecord?.checkOutTime ? formatTime(todayRecord.checkOutTime) : '--:--'}
            </p>
          </div>
          <div>
            <p className="text-2xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Hours</p>
            <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-[var(--text-heading)]">
              {currentWorkHours.toFixed(1)}h
            </p>
          </div>
        </div>

        {/* Progress bar — flat, no nested card */}
        <div className="mt-8" aria-hidden={!isCheckedIn}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-2xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Progress
            </p>
            <p className="font-mono text-xs tabular-nums text-[var(--text-secondary)]">
              {Math.round(workProgress)}% of {STANDARD_WORK_HOURS}h
            </p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[var(--border-subtle)] overflow-hidden">
            <motion.div
              initial={{width: 0}}
              animate={{width: `${workProgress}%`}}
              transition={{duration: 0.7, ease: EASE}}
              className={`h-full ${workProgress >= 100 ? 'bg-success-500' : 'bg-accent-500'}`}
            />
          </div>
        </div>

        {/* Action */}
        <div className="mt-8 flex items-center justify-between gap-4">
          <p className="text-2xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {dayComplete
              ? `Logged ${formatDuration(currentWorkHours)}`
              : isCheckedIn
                ? `${formatDuration(Math.max(0, STANDARD_WORK_HOURS - currentWorkHours))} remaining`
                : 'Ready when you are'}
          </p>
          {dayComplete ? (
            <div className="inline-flex items-center gap-2 text-sm font-medium text-success-700 dark:text-success-300">
              <CheckCircle className="h-4 w-4" aria-hidden="true" />
              All set for today
            </div>
          ) : !isCheckedIn ? (
            <PermissionGate permission={Permissions.ATTENDANCE_MARK}>
              <Button variant="primary" onClick={onCheckIn} isLoading={checkInPending}>
                <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
                Check in
              </Button>
            </PermissionGate>
          ) : (
            <PermissionGate permission={Permissions.ATTENDANCE_MARK}>
              <Button variant="outline" onClick={onCheckOutRequest} isLoading={checkOutPending}>
                <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                Check out
              </Button>
            </PermissionGate>
          )}
        </div>
      </div>
    </motion.div>
  );
});

function BentoTile({title, description, icon: Icon, href}: {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
}) {
  return (
    <motion.div
      variants={{hidden: {opacity: 0, y: 8}, visible: {opacity: 1, y: 0, transition: {duration: 0.4, ease: EASE}}}}
      className="lg:col-span-5"
    >
      <Link
        href={href}
        className="group flex h-full items-start gap-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 sm:p-6 transition-all hover:border-[var(--border-main)] hover:shadow-[0_12px_30px_-12px_rgba(15,23,42,0.07)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-[var(--text-heading)]">{title}</h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)] leading-relaxed">{description}</p>
        </div>
        <ArrowRight
          className="h-4 w-4 self-center text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
    </motion.div>
  );
}

// ── Today's punches (divide-y row) ───────────────────────────────────────────
function TodayPunches({
  punches,
  workedHours,
}: {
  punches: Array<{label: string; time: string; tone: 'in' | 'out'}>;
  workedHours: number;
}) {
  return (
    <motion.section
      initial={{opacity: 0, y: 6}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.45, ease: EASE, delay: 0.32}}
      className="space-y-4"
    >
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-heading)]">
          Today&apos;s punches
        </h2>
        <Link
          href="/attendance/my-attendance"
          className="inline-flex items-center gap-1 text-sm font-medium text-accent-700 dark:text-accent-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded"
        >
          View history
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
        {punches.map((p) => (
          <li key={p.label} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4 sm:gap-6">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full ${
                p.tone === 'in'
                  ? 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-300'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
              }`}
            >
              {p.tone === 'in' ? <LogIn className="h-4 w-4" aria-hidden="true" /> : <LogOut className="h-4 w-4" aria-hidden="true" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-heading)]">{p.label}</p>
              <p className="text-xs text-[var(--text-secondary)]">Recorded today</p>
            </div>
            <p className="font-mono text-sm font-semibold tabular-nums text-[var(--text-heading)]">{p.time}</p>
          </li>
        ))}
        <li className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4 sm:gap-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-surface)] text-[var(--text-secondary)]">
            <Clock className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--text-heading)]">Total today</p>
            <p className="text-xs text-[var(--text-secondary)]">Worked hours so far</p>
          </div>
          <p className="font-mono text-sm font-semibold tabular-nums text-[var(--text-heading)]">
            {formatDuration(workedHours)}
          </p>
        </li>
      </ul>
    </motion.section>
  );
}

// ── Late attention strip (one-line, replaces former alert card) ──────────────
function LateAttentionStrip({todayRecord}: {todayRecord: AttendanceRecord | null}) {
  const lateByMinutes = useMemo(() => {
    if (!todayRecord?.checkInTime) return 0;
    const checkIn = new Date(todayRecord.checkInTime);
    const shiftStart = new Date(checkIn);
    shiftStart.setHours(9, GRACE_PERIOD_MINS, 0, 0);
    if (checkIn <= shiftStart) return 0;
    return Math.round((checkIn.getTime() - shiftStart.getTime()) / 60000);
  }, [todayRecord]);

  if (lateByMinutes <= 0) return null;

  return (
    <motion.aside
      initial={{opacity: 0, y: 6}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.45, ease: EASE, delay: 0.42}}
      role="status"
      aria-live="polite"
      className="flex items-center justify-between gap-4 rounded-xl border border-warning-200 bg-warning-50/40 dark:border-warning-700/40 dark:bg-warning-950/30 px-5 py-4"
    >
      <div className="flex items-center gap-3 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0 text-warning-600 dark:text-warning-400" aria-hidden="true" />
        <p className="text-[var(--text-primary)]">
          You checked in <span className="font-semibold">{lateByMinutes}m</span> past the grace window. File a regularization if this was approved.
        </p>
      </div>
      <Link href="/attendance/regularization">
        <Button variant="outline" size="sm">
          Regularize
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </Link>
    </motion.aside>
  );
}

// ── Error banner ─────────────────────────────────────────────────────────────
function ErrorBanner({message, onRetry}: {message: string; onRetry: () => void}) {
  return (
    <div
      role="alert"
      className="flex items-center gap-4 rounded-xl border border-danger-200 bg-danger-50/40 dark:border-danger-700/40 dark:bg-danger-950/30 px-5 py-4"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-danger-600 dark:text-danger-400" aria-hidden="true" />
      <div className="flex-1 text-sm">
        <p className="font-medium text-danger-700 dark:text-danger-300">Could not complete request</p>
        <p className="text-[var(--text-secondary)]">{message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        Retry
      </Button>
    </div>
  );
}
