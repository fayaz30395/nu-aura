'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Clock, LogIn, LogOut, Calendar, MapPin, CheckCircle, AlertCircle,
  CalendarDays, ClipboardCheck, History, Coffee,
  BarChart3, Target, ArrowRight, Flame, Zap, Users,
  Sun, Moon, Sunrise, AlertTriangle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui';
import { useAuth } from '@/lib/hooks/useAuth';
import { AttendanceRecord, Holiday } from '@/lib/types/attendance';
import { getLocalDateString, getDateOffsetString, getMonthStartString } from '@/lib/utils/dateUtils';
import { getLocalDateTimeString } from '@/lib/utils/dateUtils';
import { motion } from 'framer-motion';
import {
  useAttendanceByDateRange,
  useCheckIn,
  useCheckOut,
  useHolidaysByYear,
} from '@/lib/hooks/queries/useAttendance';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

const STANDARD_WORK_HOURS = 8;
const GRACE_PERIOD_MINS = 15; // Grace period for late marking (configurable later)

// ─── Progress Ring Component ──────────────────────────────────────────────────
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
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={bgColor} strokeWidth={strokeWidth} />
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

// ─── Custom Chart Tooltip ─────────────────────────────────────────────────────
interface ChartEntry {
  name: string;
  date: string;
  hours: number;
  isToday: boolean;
  isHoliday: boolean;
  isWeeklyOff: boolean;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  overtime: number;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartEntry }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xl p-4 min-w-[180px]">
      <div className="text-xs font-semibold text-[var(--text-primary)] mb-2">
        {d.name} · {new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </div>
      {d.isHoliday ? (
        <div className="flex items-center gap-1.5 text-xs text-purple-600"><Sun className="h-3 w-3" /> Holiday</div>
      ) : d.isWeeklyOff ? (
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]"><Moon className="h-3 w-3" /> Weekly Off</div>
      ) : d.hours > 0 ? (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-secondary)]">Hours</span>
            <span className="font-bold text-[var(--text-primary)]">{d.hours}h</span>
          </div>
          {d.checkIn && (
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-secondary)]">Check In</span>
              <span className="font-medium text-[var(--text-primary)]">{d.checkIn}</span>
            </div>
          )}
          {d.checkOut && (
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-secondary)]">Check Out</span>
              <span className="font-medium text-[var(--text-primary)]">{d.checkOut}</span>
            </div>
          )}
          {d.overtime > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-amber-600">Overtime</span>
              <span className="font-bold text-amber-600">+{d.overtime}h</span>
            </div>
          )}
          <div className="pt-1 border-t border-[var(--border-subtle)]">
            <span className={`inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded ${
              d.hours >= STANDARD_WORK_HOURS ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
              d.hours >= STANDARD_WORK_HOURS / 2 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {d.hours >= STANDARD_WORK_HOURS ? 'Full Day' : d.hours >= STANDARD_WORK_HOURS / 2 ? 'Half Day' : 'Short Day'}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-xs text-[var(--text-muted)]">No attendance</div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const { user, isAuthenticated, hasHydrated } = useAuth();
  const toast = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [showCheckOutConfirm, setShowCheckOutConfirm] = useState(false);

  const todayStr = getLocalDateString();
  const lastWeekStr = getDateOffsetString(-6);

  // Monthly range for stats
  const now = new Date();
  const monthStartStr = getMonthStartString(now.getFullYear(), now.getMonth());

  // Fetch today's attendance
  const { data: todayData, isLoading: todayLoading } = useAttendanceByDateRange(
    todayStr, todayStr, isAuthenticated && hasHydrated
  );

  // Fetch weekly attendance (last 7 days)
  const { data: weeklyData, isLoading: weeklyLoading } = useAttendanceByDateRange(
    lastWeekStr, todayStr, isAuthenticated && hasHydrated
  );

  // Fetch monthly attendance
  const { data: monthlyData } = useAttendanceByDateRange(
    monthStartStr, todayStr, isAuthenticated && hasHydrated
  );

  // Fetch holidays
  const currentYear = now.getFullYear();
  const { data: holidaysData } = useHolidaysByYear(currentYear);

  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayRecord: AttendanceRecord | null = todayData?.[0] ?? null;
  // Stable references: prevents downstream useMemo hooks from re-running on every render.
  const weeklyRecords = useMemo<AttendanceRecord[]>(() => weeklyData ?? [], [weeklyData]);
  const monthlyRecords = useMemo<AttendanceRecord[]>(() => monthlyData ?? [], [monthlyData]);
  const holidays = useMemo<Holiday[]>(() => holidaysData ?? [], [holidaysData]);

  // ─── Handlers ─────────────────────────────────────────────────────────
  const getLocation = useCallback(async (): Promise<string> => {
    try {
      if (navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        return `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
      }
    } catch {
      toast.info('Location services unavailable. Attendance recorded without location.');
    }
    return 'Location unavailable';
  }, [toast]);

  const handleCheckIn = async () => {
    try {
      setError(null);
      if (!user?.employeeId) { setError('User not found. Please login again.'); return; }
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
  };

  const performCheckOut = async () => {
    try {
      setError(null);
      if (!user?.employeeId) { setError('User not found. Please login again.'); return; }
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
  };

  // ─── Computed Values ──────────────────────────────────────────────────
  const calculateHours = (checkInStr?: string, checkOutStr?: string) => {
    if (!checkInStr) return 0;
    const start = new Date(checkInStr).getTime();
    const end = checkOutStr ? new Date(checkOutStr).getTime() : Date.now();
    return Math.max(0, (end - start) / (1000 * 60 * 60));
  };

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatTime = (isoStr: string) =>
    new Date(isoStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

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

  // Late check detection
  const isLateToday = useMemo(() => {
    if (!todayRecord?.checkInTime) return false;
    const checkIn = new Date(todayRecord.checkInTime);
    // Default shift start 9:00 AM + grace period
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

  // ─── Streak Calculation ───────────────────────────────────────────────
  const streak = useMemo(() => {
    if (!monthlyRecords.length) return 0;
    const sorted = [...monthlyRecords]
      .filter(r => r.status === 'PRESENT' || r.status === 'HALF_DAY' || r.checkInTime)
      .sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate));
    let count = 0;
    const today = new Date();
    for (let i = 0; i < sorted.length; i++) {
      const recDate = new Date(sorted[i].attendanceDate + 'T00:00:00');
      const expected = new Date(today);
      expected.setDate(today.getDate() - i);
      // Skip weekends
      while (expected.getDay() === 0 || expected.getDay() === 6) {
        expected.setDate(expected.getDate() - 1);
      }
      if (recDate.toDateString() === expected.toDateString()) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }, [monthlyRecords]);

  // ─── Monthly Stats ────────────────────────────────────────────────────
  const monthStats = useMemo(() => {
    const present = monthlyRecords.filter(r =>
      r.status === 'PRESENT' || r.checkInTime
    ).length;
    const late = monthlyRecords.filter(r => r.isLate).length;
    const totalHours = monthlyRecords.reduce((acc, r) =>
      acc + calculateHours(r.checkInTime, r.checkOutTime), 0);
    const overtimeTotal = monthlyRecords.reduce((acc, r) => {
      const h = calculateHours(r.checkInTime, r.checkOutTime);
      return acc + Math.max(0, h - STANDARD_WORK_HOURS);
    }, 0);
    const avgHours = present > 0 ? totalHours / present : 0;

    // Business days so far this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let businessDays = 0;
    const d = new Date(monthStart);
    while (d <= now) {
      if (d.getDay() !== 0 && d.getDay() !== 6) businessDays++;
      d.setDate(d.getDate() + 1);
    }
    const absent = Math.max(0, businessDays - present);
    const attendanceRate = businessDays > 0 ? Math.round((present / businessDays) * 100) : 0;

    return { present, absent, late, totalHours, overtimeTotal, avgHours, businessDays, attendanceRate };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthlyRecords]);

  // ─── Weekly Stats ─────────────────────────────────────────────────────
  const weekStats = useMemo(() => {
    const totalHours = weeklyRecords.reduce((acc, r) =>
      acc + calculateHours(r.checkInTime, r.checkOutTime), 0);
    const avgHours = weeklyRecords.length ? totalHours / weeklyRecords.length : 0;
    const checkInTimes = weeklyRecords
      .filter((r): r is AttendanceRecord & { checkInTime: string } => !!r.checkInTime)
      .map(r => new Date(r.checkInTime).getHours() * 60 + new Date(r.checkInTime).getMinutes());
    let avgCheckInStr = '--:--';
    if (checkInTimes.length) {
      const avgMins = checkInTimes.reduce((a, b) => a + b, 0) / checkInTimes.length;
      const h = Math.floor(avgMins / 60);
      const m = Math.floor(avgMins % 60);
      avgCheckInStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
    return { avgHours: avgHours.toFixed(1), avgCheckIn: avgCheckInStr, presentDays: weeklyRecords.filter(r => r.checkInTime).length };
  }, [weeklyRecords]);

  // ─── Chart Data ───────────────────────────────────────────────────────
  const holidaySet = useMemo(() => new Set(holidays.map(h => h.holidayDate)), [holidays]);

  const chartData: ChartEntry[] = useMemo(() => {
    const days: ChartEntry[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = getLocalDateString(d);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
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

  // ─── Upcoming Holidays ────────────────────────────────────────────────
  const upcomingHolidays = useMemo(() => {
    return holidays
      .filter(h => new Date(h.holidayDate + 'T00:00:00') >= new Date(todayStr + 'T00:00:00'))
      .sort((a, b) => a.holidayDate.localeCompare(b.holidayDate))
      .slice(0, 3);
  }, [holidays, todayStr]);

  // ─── Greeting ─────────────────────────────────────────────────────────
  const greeting = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, [currentTime]);

  // ─── Loading ──────────────────────────────────────────────────────────
  const dataLoading = todayLoading || weeklyLoading;

  if (dataLoading) {
    return (
      <AppLayout activeMenuItem="attendance">
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
          {/* Skeleton header */}
          <div className="flex justify-between items-center">
            <div className="space-y-2"><Skeleton className="h-8 w-48 rounded-lg" /><Skeleton className="h-4 w-32 rounded" /></div>
            <Skeleton className="h-14 w-48 rounded-xl" />
          </div>
          {/* Skeleton main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2"><Skeleton className="h-56 rounded-2xl" /></div>
            <div className="space-y-4">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          </div>
          {/* Skeleton stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          {/* Skeleton bottom grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2"><Skeleton className="h-80 rounded-2xl" /></div>
            <div className="space-y-4">
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
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
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                <Clock className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-page-title text-[var(--text-primary)]">Attendance</h1>
            </div>
            <p className="text-sm ml-10">
              <span className="font-medium text-[var(--text-primary)]">{greeting}, {user?.firstName || 'there'}</span>
              <span className="text-[var(--text-muted)]"> · </span>
              <span className="text-[var(--text-secondary)]">{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Streak Badge */}
            {streak > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <Flame className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="text-lg font-bold text-orange-600 dark:text-orange-400 leading-none">{streak}</div>
                  <div className="text-xs text-orange-500 dark:text-orange-400">day streak</div>
                </div>
              </div>
            )}
            {/* Live Clock */}
            <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-surface)] rounded-lg shadow-sm border border-[var(--border-main)]">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                <Clock className="h-5 w-5 text-white animate-pulse" />
              </div>
              <div>
                <div className="text-xs font-semibold text-primary-500 dark:text-primary-400 uppercase tracking-wider">Live Time</div>
                <div className="text-xl font-mono font-bold text-[var(--text-primary)] tabular-nums">
                  {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 tint-danger border-l-4 border-red-500 rounded-lg flex items-start gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div><p className="font-semibold text-sm">Error</p><p className="text-xs">{error}</p></div>
          </div>
        )}

        {/* ── Main Section: Clock Card + Progress Ring ────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Attendance Card */}
          <div className="lg:col-span-2">
            <Card className="bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 text-white overflow-hidden relative border-0 shadow-lg">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

              <CardContent className="flex flex-col justify-between p-6 relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <div className="space-y-1">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 backdrop-blur-sm rounded-full text-xs font-bold uppercase tracking-wider ${
                      dayComplete ? 'bg-emerald-500/25 text-emerald-200' : isCheckedIn ? 'bg-green-400/25 text-green-200' : 'bg-white/15 text-white/80'
                    }`}>
                      <div className={`h-2 w-2 rounded-full ${isCheckedIn && !isCheckedOut ? 'bg-green-400 animate-pulse' : dayComplete ? 'bg-emerald-400' : 'bg-white/50'}`} />
                      {dayComplete ? 'Day Complete' : isCheckedIn ? 'Currently Working' : 'Not Started'}
                    </div>
                    <div className="text-2xl lg:text-3xl font-extrabold text-white drop-shadow-sm">
                      {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </div>
                    {isLateToday && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/30 rounded-full text-xs font-medium text-red-200">
                        <AlertTriangle className="h-3 w-3" />
                        Late by {lateByMinutes}m
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-4xl lg:text-5xl font-extrabold font-mono tracking-tight tabular-nums drop-shadow-lg">
                      {currentTime.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex items-center gap-2 text-indigo-200/80 justify-end mt-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">{todayRecord?.checkInLocation || 'Location unavailable'}</span>
                    </div>
                  </div>
                </div>

                {/* Time + Action */}
                <div className="flex items-end justify-between">
                  <div className="flex gap-6">
                    <div>
                      <div className="text-xs font-semibold text-indigo-200/70 uppercase tracking-wider mb-1">Check In</div>
                      <div className="text-xl font-bold tabular-nums text-white">
                        {todayRecord?.checkInTime ? formatTime(todayRecord.checkInTime) : '--:--'}
                      </div>
                    </div>
                    {isCheckedOut && todayRecord?.checkOutTime && (
                      <div>
                        <div className="text-xs font-semibold text-indigo-200/70 uppercase tracking-wider mb-1">Check Out</div>
                        <div className="text-xl font-bold tabular-nums text-white">{formatTime(todayRecord.checkOutTime)}</div>
                      </div>
                    )}
                    {isCheckedIn && (
                      <div>
                        <div className="text-xs font-semibold text-indigo-200/70 uppercase tracking-wider mb-1">Duration</div>
                        <div className="text-xl font-bold tabular-nums text-white">{formatDuration(currentWorkHours)}</div>
                      </div>
                    )}
                    {isOvertime && (
                      <div>
                        <div className="text-xs font-semibold text-amber-300/80 uppercase tracking-wider mb-1">Overtime</div>
                        <div className="text-xl font-bold tabular-nums text-amber-300">+{formatDuration(overtimeHours)}</div>
                      </div>
                    )}
                  </div>

                  <div>
                    {dayComplete ? (
                      <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-6 py-4 text-center border border-white/20">
                        <CheckCircle className="h-8 w-8 text-emerald-300 mx-auto mb-1" />
                        <div className="text-sm font-bold">Day Complete!</div>
                        <div className="text-xs text-indigo-100 mt-0.5">
                          {formatDuration(calculateHours(todayRecord?.checkInTime, todayRecord?.checkOutTime))} worked
                        </div>
                      </div>
                    ) : !isCheckedIn ? (
                      <Button
                        onClick={handleCheckIn}
                        isLoading={checkInMutation.isPending}
                        className="h-14 px-8 text-base font-semibold bg-white text-primary-600 hover:bg-gray-50 border-0 shadow-lg hover:shadow-xl hover:scale-105 transition-all rounded-xl"
                      >
                        <LogIn className="h-5 w-5 mr-2" />
                        Check In
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setShowCheckOutConfirm(true)}
                        isLoading={checkOutMutation.isPending}
                        className="h-14 px-8 text-base font-semibold bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:from-rose-600 hover:to-pink-700 border-0 shadow-lg hover:shadow-xl hover:scale-105 transition-all rounded-xl"
                      >
                        <LogOut className="h-5 w-5 mr-2" />
                        Check Out
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Ring + Today Stats */}
          <div className="space-y-4">
            {/* Work Progress */}
            <Card className="card-aura border border-[var(--border-main)] shadow-md overflow-hidden">
              <CardContent className="p-6 flex items-center gap-6 relative">
                {/* Subtle gradient background */}
                <div className={`absolute inset-0 opacity-[0.04] ${isOvertime ? 'bg-gradient-to-br from-amber-500 to-orange-500' : workProgress >= 100 ? 'bg-gradient-to-br from-emerald-500 to-green-500' : 'bg-gradient-to-br from-primary-500 to-violet-500'}`} />
                <ProgressRing
                  progress={workProgress}
                  size={110}
                  strokeWidth={10}
                  color={isOvertime ? '#f59e0b' : workProgress >= 100 ? '#22c55e' : '#6366f1'}
                >
                  <div className="text-center">
                    <div className="text-stat-medium text-[var(--text-primary)] tabular-nums leading-none">
                      {currentWorkHours.toFixed(1)}
                    </div>
                    <div className="text-xs font-medium text-[var(--text-muted)] mt-0.5">/ {STANDARD_WORK_HOURS}h</div>
                  </div>
                </ProgressRing>
                <div className="flex-1 space-y-2 relative z-10">
                  <h3 className="text-card-title text-[var(--text-primary)]">Work Progress</h3>
                  <div className={`text-sm font-medium ${
                    dayComplete ? 'text-emerald-600 dark:text-emerald-400' :
                    isOvertime ? 'text-amber-600 dark:text-amber-400' :
                    isCheckedIn ? 'text-[var(--text-secondary)]' :
                    'text-primary-600 dark:text-primary-400'
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
                      <div className={`h-2 w-2 rounded-full ${isOvertime ? 'bg-amber-500' : workProgress >= 100 ? 'bg-emerald-500' : 'bg-primary-500'} animate-pulse`} />
                      <span className={`text-xs font-bold ${isOvertime ? 'text-amber-600 dark:text-amber-400' : workProgress >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary-600 dark:text-primary-400'}`}>
                        {Math.round(workProgress)}% complete
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Weekly Averages */}
            <Card className="card-aura border border-[var(--border-main)] shadow-md">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-sm">
                        <Sunrise className="h-4 w-4 text-white" />
                      </div>
                      <p className="text-micro text-purple-600 dark:text-purple-400">Avg In</p>
                    </div>
                    <p className="text-stat-medium text-[var(--text-primary)] tabular-nums">{weekStats.avgCheckIn}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
                        <Target className="h-4 w-4 text-white" />
                      </div>
                      <p className="text-micro text-amber-600 dark:text-amber-400">Avg Hrs</p>
                    </div>
                    <p className="text-stat-medium text-[var(--text-primary)] tabular-nums">{weekStats.avgHours}h</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Monthly Stats Row ───────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Present', value: monthStats.present, total: monthStats.businessDays, icon: CheckCircle, color: 'from-emerald-500 to-green-600', textColor: 'text-emerald-600 dark:text-emerald-400', tintClass: 'tint-success' },
            { label: 'Absent', value: monthStats.absent, total: monthStats.businessDays, icon: AlertCircle, color: 'from-red-500 to-rose-600', textColor: 'text-red-600 dark:text-red-400', tintClass: 'tint-danger' },
            { label: 'Late Arrivals', value: monthStats.late, total: monthStats.present, icon: AlertTriangle, color: 'from-amber-500 to-orange-600', textColor: 'text-amber-600 dark:text-amber-400', tintClass: 'tint-warning' },
            { label: 'Overtime', value: `${monthStats.overtimeTotal.toFixed(1)}h`, total: null, icon: Zap, color: 'from-blue-500 to-cyan-600', textColor: 'text-blue-600 dark:text-blue-400', tintClass: 'tint-info' },
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut', delay: idx * 0.06 }}
            >
              <Card className="card-interactive border border-[var(--border-main)] hover:shadow-lg transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-md`}>
                      <stat.icon className="h-5 w-5 text-white" />
                    </div>
                    {stat.total !== null && (
                      <span className="text-xs font-medium text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full">/ {stat.total}</span>
                    )}
                  </div>
                  <div className={`text-stat-large tabular-nums ${stat.textColor}`}>{stat.value}</div>
                  <div className="text-xs font-semibold text-[var(--text-secondary)] mt-1">{stat.label}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* ── Chart + Quick Actions ───────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weekly Chart */}
          <Card className="lg:col-span-2 card-aura border border-[var(--border-main)] shadow-md">
            <CardHeader className="border-b border-[var(--border-main)] pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-card-title text-[var(--text-primary)]">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm">
                    <BarChart3 className="h-4 w-4 text-white" />
                  </div>
                  Weekly Overview
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> Last 7 days
                  </span>
                  {monthStats.attendanceRate > 0 && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      monthStats.attendanceRate >= 95 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      monthStats.attendanceRate >= 80 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {monthStats.attendanceRate}% this month
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false}
                    tick={{ fill: 'var(--chart-muted)', fontSize: 11, fontWeight: 500 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false}
                    tick={{ fill: 'var(--chart-muted)', fontSize: 11 }}
                    domain={[0, 'auto']} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'var(--chart-grid)', opacity: 0.3 }} />
                  <ReferenceLine y={STANDARD_WORK_HOURS} stroke="var(--chart-primary)" strokeDasharray="6 4" strokeWidth={1.5} strokeOpacity={0.5} />
                  <Bar dataKey="hours" radius={[8, 8, 0, 0]} maxBarSize={48}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.isHoliday ? 'var(--chart-purple, #a855f7)'
                          : entry.hours >= STANDARD_WORK_HOURS ? 'var(--chart-success)'
                          : entry.isToday ? 'var(--chart-primary)'
                          : entry.hours > 0 ? 'var(--chart-warning)'
                          : 'var(--chart-grid)'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-2 text-xs">
                {[
                  { color: 'bg-emerald-500', label: `Full Day (${STANDARD_WORK_HOURS}h+)` },
                  { color: 'bg-indigo-500', label: 'Today' },
                  { color: 'bg-amber-500', label: 'Partial' },
                  { color: 'bg-purple-500', label: 'Holiday' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className={`h-3 w-3 rounded-sm ${l.color} shadow-sm`} />
                    <span className="font-medium text-[var(--text-secondary)]">{l.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions + Holidays */}
          <div className="space-y-4">
            {/* Quick Actions */}
            {[
              { href: '/attendance/my-attendance', icon: History, title: 'Attendance History', desc: 'View complete records & calendar', gradient: 'from-indigo-500 to-blue-600', hoverColor: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400' },
              { href: '/attendance/regularization', icon: ClipboardCheck, title: 'Regularization', desc: 'Request corrections', gradient: 'from-orange-500 to-amber-600', hoverColor: 'group-hover:text-orange-600 dark:group-hover:text-orange-400' },
              { href: '/attendance/team', icon: Users, title: 'Team Attendance', desc: 'Monitor your team', gradient: 'from-emerald-500 to-teal-600', hoverColor: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400' },
            ].map((action, idx) => (
              <motion.div
                key={action.href}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut', delay: idx * 0.06 }}
              >
                <Link href={action.href} className="block group">
                  <Card className="card-interactive border border-[var(--border-main)] hover:shadow-lg transition-all cursor-pointer hover:-translate-y-0.5">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all`}>
                          <action.icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-sm font-bold text-[var(--text-primary)] ${action.hoverColor} transition-colors`}>{action.title}</h3>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">{action.desc}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-primary-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}

            {/* Upcoming Holidays */}
            {upcomingHolidays.length > 0 && (
              <Card className="card-aura border border-[var(--border-main)] shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-sm">
                      <CalendarDays className="h-3.5 w-3.5 text-white" />
                    </div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">Upcoming Holidays</h4>
                  </div>
                  <div className="space-y-2">
                    {upcomingHolidays.map(h => {
                      const hDate = new Date(h.holidayDate + 'T00:00:00');
                      const daysAway = Math.ceil((hDate.getTime() - new Date(todayStr + 'T00:00:00').getTime()) / 86400000);
                      return (
                        <div key={h.id} className="flex items-center justify-between py-1.5 border-b border-[var(--border-subtle)] last:border-0">
                          <div>
                            <div className="text-xs font-semibold text-[var(--text-primary)]">{h.holidayName}</div>
                            <div className="text-xs text-[var(--text-muted)]">
                              {hDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            daysAway === 0 ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                            'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                          }`}>
                            {daysAway === 0 ? 'Today' : daysAway === 1 ? 'Tomorrow' : `${daysAway}d away`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* This Week Progress */}
            <Card className="card-aura border border-[var(--border-main)] shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-sm">
                    <Coffee className="h-3.5 w-3.5 text-white" />
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">This Week</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-[var(--text-secondary)]">Present Days</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{weekStats.presentDays}/5</span>
                    </div>
                    <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (weekStats.presentDays / 5) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-[var(--text-secondary)]">Total Hours</span>
                      <span className="font-bold text-primary-600 dark:text-primary-400">
                        {weeklyRecords.reduce((acc, r) => acc + calculateHours(r.checkInTime, r.checkOutTime), 0).toFixed(1)}h / {STANDARD_WORK_HOURS * 5}h
                      </span>
                    </div>
                    <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (weeklyRecords.reduce((acc, r) => acc + calculateHours(r.checkInTime, r.checkOutTime), 0) / (STANDARD_WORK_HOURS * 5)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Checkout Confirmation */}
        <ConfirmDialog
          isOpen={showCheckOutConfirm}
          onClose={() => setShowCheckOutConfirm(false)}
          onConfirm={performCheckOut}
          title="Confirm Check Out"
          message={`You have worked ${formatDuration(currentWorkHours)} today. Are you sure you want to check out?`}
          confirmText="Check Out"
          cancelText="Cancel"
          type="warning"
          loading={checkOutMutation.isPending}
        />
      </motion.div>
    </AppLayout>
  );
}
