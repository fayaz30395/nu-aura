'use client';

import React, {memo, useCallback, useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {motion} from 'framer-motion';
import {format as formatDateFns} from 'date-fns';
import {Reveal, Stagger, StaggerItem} from '@/components/motion';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle,
  Clock,
  Download,
  Fingerprint,
  LogIn,
  LogOut,
  Moon,
  Palmtree,
  RefreshCw,
  Repeat,
  Timer,
  UserCheck,
  Users,
} from 'lucide-react';

import {AppLayout} from '@/components/layout';
import {Button} from '@/components/ui/Button';
import {Skeleton} from '@/components/ui';
import {Card} from '@/components/ui/Card';
import {Stat} from '@/components/ui/Stat';
import {Segmented} from '@/components/ui/Segmented';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {useToast} from '@/components/ui/Toast';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {useAuth} from '@/lib/hooks/useAuth';
import {AttendanceRecord} from '@/lib/types/hrms/attendance';
import {
  getDateOffsetString,
  getLocalDateString,
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
  computeWeekStats,
  formatDuration,
  formatTime,
  GRACE_PERIOD_MINS,
  STANDARD_WORK_HOURS,
} from './utils';
import {MOTION_EASE} from '@/lib/animation';

// Single ease curve, matching the resources blueprint.
const EASE = MOTION_EASE.outExpo;

// ── Aura heatmap status model ────────────────────────────────────────────────
// Maps the real AttendanceStatus enum onto the prototype's compact P/R/L/A codes.
// Token-driven cell colors (no hardcoded hex) — chart-* vars per AURA_CONTRACT.
type HeatCode = 'P' | 'R' | 'L' | 'A' | 'O';
const HEAT_META: Record<HeatCode, {cellClass: string; color: string; label: string}> = {
  P: {cellClass: 'bg-[var(--chart-1)]', color: 'var(--chart-1)', label: 'Present'},
  R: {cellClass: 'bg-[var(--chart-3)]', color: 'var(--chart-3)', label: 'Remote'},
  L: {cellClass: 'bg-[var(--chart-4)]', color: 'var(--chart-4)', label: 'Leave'},
  A: {cellClass: 'bg-[var(--chart-danger)]', color: 'var(--chart-danger)', label: 'Absent'},
  O: {cellClass: 'bg-[var(--border)]', color: 'var(--border)', label: 'Off'},
};

/** Reduce a real AttendanceRecord status into a heatmap code. */
function statusToHeatCode(rec: AttendanceRecord | undefined): HeatCode {
  if (!rec) return 'A';
  switch (rec.status) {
    case 'PRESENT':
    case 'LATE':
    case 'HALF_DAY':
    case 'PENDING_REGULARIZATION':
      // Remote vs on-site: WEB punches with no fixed location read as remote.
      return rec.checkInSource === 'REMOTE' || rec.checkInLocation === 'Remote' ? 'R' : 'P';
    case 'ON_LEAVE':
    case 'LEAVE':
      return 'L';
    case 'WEEKLY_OFF':
    case 'HOLIDAY':
      return 'O';
    case 'ABSENT':
    default:
      return 'A';
  }
}

const HEAT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

/** A single heatmap row: one person's Mon–Fri codes + check-in + avg hours. */
interface HeatRow {
  name: string;
  week: Array<{code: HeatCode; date: string}>;
  checkIn: string;
  avgHrs: string;
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const {user, isAuthenticated, hasHydrated} = useAuth();
  const router = useRouter();
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
  // Holidays kept fetched (warm cache for sub-routes); not surfaced on this view.
  useHolidaysByYear(now.getFullYear());

  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();

  const todayRecord: AttendanceRecord | null = todayData?.[0] ?? null;
  const weeklyRecords = useMemo<AttendanceRecord[]>(() => weeklyData ?? [], [weeklyData]);
  const monthlyRecords = useMemo<AttendanceRecord[]>(() => monthlyData ?? [], [monthlyData]);

  // Derived stats. `now` is a mount-time `useMemo(() => new Date(), [])` and is
  // intentionally omitted from the deps: it is stable for the component lifetime,
  // and listing it would not change recomputation (it never changes) — recompute
  // is driven purely by `monthlyRecords`.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const monthStats = useMemo(() => computeMonthStats(monthlyRecords, now), [monthlyRecords]);

  // Weekly aggregate stats for the KPI strip (Aura spec: avg check-in, avg hrs).
  const weekStats = useMemo(() => computeWeekStats(weeklyRecords), [weeklyRecords]);
  const weekOvertimeHours = useMemo(
    () => weeklyRecords.reduce((acc, r) => acc + (r.overtimeMinutes ?? 0) / 60, 0),
    [weeklyRecords]
  );

  // Heatmap row model from REAL weekly data — Mon–Fri of the current week.
  // The self-service page owns one person's records, so the heatmap shows the
  // signed-in employee's week (the spec's team grid maps to /attendance/team).
  const heatRows = useMemo<HeatRow[]>(() => {
    const now2 = new Date();
    const monday = new Date(now2);
    const dow = (monday.getDay() + 6) % 7; // 0 = Monday
    monday.setDate(monday.getDate() - dow);

    const byDate = new Map<string, AttendanceRecord>();
    for (const r of weeklyRecords) byDate.set(r.attendanceDate, r);

    const week = HEAT_DAYS.map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = getLocalDateString(d);
      const rec = byDate.get(key);
      const isFuture = d > now2;
      return {code: isFuture ? ('O' as HeatCode) : statusToHeatCode(rec), date: key};
    });

    return [{
      name: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'You',
      week,
      checkIn: weekStats.avgCheckIn,
      avgHrs: weekStats.avgHours,
    }];
  }, [weeklyRecords, weekStats, user?.firstName, user?.lastName]);

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
      // Omit checkInTime so the backend stamps the tenant-local time (single source of truth).
      // Sending a browser-local timestamp here skewed the record for tenants outside the browser tz.
      await checkInMutation.mutateAsync({
        employeeId: user.employeeId,
        attendanceDate: todayStr,
        source: 'WEB',
        location,
      });
    } catch (err: unknown) {
      const msg = (err as {response?: {data?: {message?: string}}})?.response?.data?.message;
      setError(msg || 'Failed to check in. Please try again.');
    }
  }, [user?.employeeId, getLocation, checkInMutation, todayStr]);

  const performCheckOut = useCallback(async () => {
    try {
      setError(null);
      if (!user?.employeeId) {
        setError('User not found. Please login again.');
        return;
      }
      const location = await getLocation();
      // Omit checkOutTime so the backend stamps the tenant-local time (single source of truth).
      await checkOutMutation.mutateAsync({
        employeeId: user.employeeId,
        attendanceDate: todayStr,
        source: 'WEB',
        location,
      });
      setShowCheckOutConfirm(false);
    } catch (err: unknown) {
      const msg = (err as {response?: {data?: {message?: string}}})?.response?.data?.message;
      setError(msg || 'Failed to check out. Please try again.');
    }
  }, [user?.employeeId, getLocation, checkOutMutation, todayStr]);

  const dataLoading = todayLoading || weeklyLoading;

  return (
    <AppLayout activeMenuItem="attendance">
      <div className="mx-auto w-full max-w-7xl px-6 py-8 space-y-8">
        <PageHeader
          view="attendance"
          onViewChange={(v) => router.push(v === 'leave' ? '/leave' : '/attendance')}
        />

        {error && (
          <ErrorBanner message={error} onRetry={() => { setError(null); refetchToday(); }} />
        )}

        {/* KPI row — Aura StatCards (Present/check-in/hours/overtime) */}
        {dataLoading ? (
          <StatsSkeleton />
        ) : (
          <StatsRow
            presentThisMonth={monthStats.present}
            attendanceRate={monthStats.attendanceRate}
            avgCheckIn={weekStats.avgCheckIn}
            avgHours={weekStats.avgHours}
            overtimeHours={weekOvertimeHours}
          />
        )}

        {/* Weekly attendance heatmap — built from real weekly records */}
        {!dataLoading && <WeeklyHeatmap rows={heatRows} now={now} />}

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

// ── Header (title + Attendance/Leave segmented + Export) ─────────────────────
function PageHeader({
  view,
  onViewChange,
}: {
  view: 'attendance' | 'leave';
  onViewChange: (next: 'attendance' | 'leave') => void;
}) {
  return (
    <header className="motion-rise grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
      <div className="space-y-1.5 max-w-2xl">
        <h1 className="text-aura-title text-[var(--text-1)]">Attendance</h1>
        <p className="text-sm text-[var(--text-3)]">
          Live attendance, check-ins and weekly patterns.
        </p>
      </div>
      <div className="flex items-center gap-4 self-start">
        <Segmented
          aria-label="Attendance or Leave"
          value={view}
          onChange={onViewChange}
          options={[
            {value: 'attendance', label: 'Attendance', icon: <Fingerprint className="h-[15px] w-[15px]" aria-hidden="true" />},
            {value: 'leave', label: 'Leave', icon: <Palmtree className="h-[15px] w-[15px]" aria-hidden="true" />},
          ]}
        />
        <Button variant="ghost" leftIcon={<Download className="h-4 w-4" aria-hidden="true" />}>
          Export
        </Button>
      </div>
    </header>
  );
}

// ── KPI row (Aura StatCards) ─────────────────────────────────────────────────
function StatsRow({
  presentThisMonth,
  attendanceRate,
  avgCheckIn,
  avgHours,
  overtimeHours,
}: {
  presentThisMonth: number;
  attendanceRate: number;
  avgCheckIn: string;
  avgHours: string;
  overtimeHours: number;
}) {
  const onTime = avgCheckIn !== '--:--' && avgCheckIn <= '09:15';
  return (
    <Stagger
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      delayChildren={0.06}
    >
      <StaggerItem>
        <Card className="p-5">
          <Stat
            icon={<UserCheck className="h-[18px] w-[18px]" aria-hidden="true" />}
            iconTone="accent"
            label="Present this month"
            value={<span className="num">{presentThisMonth}</span>}
            delta={<span className="num">{attendanceRate}%</span>}
            deltaDir={attendanceRate >= 85 ? 'up' : 'down'}
            foot="Days logged"
          />
        </Card>
      </StaggerItem>
      <StaggerItem>
        <Card className="p-5">
          <Stat
            icon={<Clock className="h-[18px] w-[18px]" aria-hidden="true" />}
            iconTone="info"
            label="Avg check-in"
            value={<span className="num">{avgCheckIn}</span>}
            delta={onTime ? 'On time' : 'Late'}
            deltaDir={onTime ? 'flat' : 'down'}
            foot="Target 09:15"
          />
        </Card>
      </StaggerItem>
      <StaggerItem>
        <Card className="p-5">
          <Stat
            icon={<Timer className="h-[18px] w-[18px]" aria-hidden="true" />}
            iconTone="warning"
            label="Avg hours / day"
            value={<span className="num">{avgHours}h</span>}
            foot="This week"
          />
        </Card>
      </StaggerItem>
      <StaggerItem>
        <Card className="p-5">
          <Stat
            icon={<Moon className="h-[18px] w-[18px]" aria-hidden="true" />}
            iconTone="neutral"
            label="Overtime logged"
            value={<span className="num">{overtimeHours.toFixed(0)}h</span>}
            foot="This week"
          />
        </Card>
      </StaggerItem>
    </Stagger>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({length: 4}).map((_, i) => (
        <Card key={i} className="p-5">
          <Skeleton className="h-[38px] w-[38px] rounded-aura-lg" />
          <Skeleton className="mt-3 h-3 w-28 rounded" />
          <Skeleton className="mt-3 h-8 w-20 rounded" />
        </Card>
      ))}
    </div>
  );
}

// ── Page-local avatar (initials chip) — no shared Avatar primitive exists ─────
function HeatAvatar({name}: {name: string}) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span
      aria-hidden="true"
      className="inline-grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[11.5px] font-semibold text-[var(--accent-text)]"
    >
      {initials}
    </span>
  );
}

// ── Weekly heatmap (real weekly records → P/R/L/A tinted cells) ───────────────
function WeeklyHeatmap({rows, now}: {rows: HeatRow[]; now: Date}) {
  const weekLabel = useMemo(() => {
    const monday = new Date(now);
    const dow = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - dow);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    return `This week · ${formatDateFns(monday, 'MMM d')} – ${formatDateFns(friday, 'MMM d')}`;
  }, [now]);

  return (
    <Reveal delay={0.18}>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 pt-5">
          <div>
            <h2 className="text-[15px] font-bold leading-tight text-[var(--text-1)]">Team attendance</h2>
            <p className="mt-1 text-xs text-[var(--text-3)]">{weekLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {(['P', 'R', 'L', 'A'] as HeatCode[]).map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--text-3)]">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${HEAT_META[k].cellClass}`}
                />
                {HEAT_META[k].label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto px-2 pb-3">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-aura-micro text-[var(--text-3)]">
                <th className="px-3 py-2.5 text-left font-bold">Employee</th>
                {HEAT_DAYS.map((d) => (
                  <th key={d} className="px-2 py-2.5 text-center font-bold">{d}</th>
                ))}
                <th className="px-2 py-2.5 text-center font-bold">Check-in</th>
                <th className="px-2 py-2.5 text-center font-bold">Avg hrs</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.name}
                  className="h-[58px] border-t border-[var(--border-soft)] transition-colors hover:bg-[var(--surface-2)]"
                >
                  <td className="px-3">
                    <div className="flex items-center gap-2.5">
                      <HeatAvatar name={row.name} />
                      <span className="text-sm font-medium text-[var(--text-1)]">{row.name}</span>
                    </div>
                  </td>
                  {row.week.map((cell, i) => (
                    <td key={`${row.name}-${i}`} className="px-2 text-center">
                      <span
                        title={HEAT_META[cell.code].label}
                        className="num inline-grid h-7 w-9 place-items-center rounded-aura-sm border text-xs font-semibold"
                        style={{
                          background: `color-mix(in srgb, ${HEAT_META[cell.code].color} ${cell.code === 'O' ? 100 : 18}%, transparent)`,
                          color: HEAT_META[cell.code].color,
                          borderColor: `color-mix(in srgb, ${HEAT_META[cell.code].color} 36%, transparent)`,
                        }}
                      >
                        {cell.code}
                      </span>
                    </td>
                  ))}
                  <td className="num px-2 text-center text-[12.5px] text-[var(--text-2)]">{row.checkIn}</td>
                  <td className="num px-2 text-center text-[12.5px] font-semibold text-[var(--text-1)]">{row.avgHrs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Reveal>
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
    <section
      aria-label="Today and workflows"
      className="grid gap-4 grid-cols-1 lg:grid-cols-12"
    >
      <Stagger className="contents" delayChildren={0.18}>
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
      </Stagger>
    </section>
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
    <StaggerItem className="lg:col-span-7 lg:row-span-2">
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

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
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
              initial={{scaleX: 0}}
              animate={{scaleX: Math.min(workProgress, 100) / 100}}
              transition={{duration: 0.7, ease: EASE}}
              style={{originX: 0}}
              className={`h-full w-full origin-left ${workProgress >= 100 ? 'bg-success-500' : 'bg-accent-500'}`}
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
    </StaggerItem>
  );
});

function BentoTile({title, description, icon: Icon, href}: {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
}) {
  return (
    <StaggerItem className="lg:col-span-5">
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
    </StaggerItem>
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
    <Reveal className="space-y-4" delay={0.32}>
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
    </Reveal>
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
    <aside
      role="status"
      aria-live="polite"
      className="motion-rise flex items-center justify-between gap-4 rounded-xl border border-warning-200 bg-warning-50/40 dark:border-warning-700/40 dark:bg-warning-950/30 px-5 py-4"
    >
      <div className="flex items-center gap-4 text-sm">
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
    </aside>
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
