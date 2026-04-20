'use client';

import {useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {AnimatePresence, motion} from 'framer-motion';
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  LogIn,
  MapPin,
  MoreHorizontal,
  Timer,
  Users,
} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Skeleton} from '@/components/ui/Skeleton';
import {AttendanceRecord} from '@/lib/types/hrms/attendance';
import {getDateOffsetString, getLocalDateString, getMonthEndString, getMonthStartString} from '@/lib/utils/dateUtils';
import {useAttendanceByDateRange, useHolidaysByYear, useMyTimeEntries} from '@/lib/hooks/queries/useAttendance';

type TabView = 'log' | 'calendar' | 'requests';
type PeriodFilter = '30days' | string; // string for month names

interface DayOfWeek {
  label: string;
  date: Date;
  isToday: boolean;
  dayNum: number;
}

// ─── Helper: format minutes to "Xh Ym" ────────────────────────────
function formatDuration(minutes: number | undefined): string {
  if (!minutes || minutes <= 0) return '--';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatHoursFromMinutes(minutes: number | undefined): string {
  if (!minutes || minutes <= 0) return '--';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

// ─── Helper: format time from ISO string ───────────────────────────
function formatTime(isoString: string | undefined, use24h: boolean): string {
  if (!isoString) return '--:--';
  try {
    const date = new Date(isoString);
    if (use24h) {
      return date.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', hour12: false});
    }
    return date.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', hour12: true});
  } catch {
    return '--:--';
  }
}

// ─── Helper: date display ──────────────────────────────────────────
function formatDateLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {weekday: 'short', day: 'numeric', month: 'short'});
  } catch {
    return dateStr;
  }
}

// ─── Timeline bar component for attendance visual ──────────────────
function AttendanceTimelineBar({record}: { record: AttendanceRecord }) {
  const getBarSegments = () => {
    if (!record.checkInTime) return [];

    const parseHour = (iso: string): number => {
      const d = new Date(iso);
      return d.getHours() + d.getMinutes() / 60;
    };

    const checkIn = parseHour(record.checkInTime);
    const checkOut = record.checkOutTime ? parseHour(record.checkOutTime) : checkIn + 1;

    // Normalize to a 6am-midnight (18h) window
    const windowStart = 6;
    const windowEnd = 24;
    const windowSize = windowEnd - windowStart;

    const startPct = Math.max(0, ((checkIn - windowStart) / windowSize) * 100);
    const widthPct = Math.max(2, ((checkOut - checkIn) / windowSize) * 100);

    return [{left: startPct, width: Math.min(widthPct, 100 - startPct)}];
  };

  const segments = getBarSegments();

  if (segments.length === 0) return null;

  return (
    <div className="relative h-2.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden w-full min-w-[200px]">
      {segments.map((seg, i) => (
        <div
          key={i}
          className="absolute top-0 h-full rounded-full bg-accent-400"
          style={{left: `${seg.left}%`, width: `${seg.width}%`}}
        />
      ))}
      {/* Break gaps would go here if we had break data */}
    </div>
  );
}

// ─── Status dot component ──────────────────────────────────────────
function getStatusDotColor(hours: number): string {
  if (hours >= 8) {
    return 'bg-success-500';
  }
  if (hours >= 4) {
    return 'bg-warning-500';
  }
  return 'bg-danger-500';
}

function StatusDot({hours}: { hours: number }) {
  const color = getStatusDotColor(hours);
  return <div className={`w-2.5 h-2.5 rounded-full ${color} shrink-0`}/>;
}

// ─── Skeleton loaders ──────────────────────────────────────────────
function SkeletonStatRow() {
  return (
    <div className="flex items-center gap-4 py-4">
      <Skeleton className="w-8 h-8 rounded-full"/>
      <Skeleton className="h-4 w-16"/>
      <div className="ml-auto flex gap-8">
        <Skeleton className="h-6 w-16"/>
        <Skeleton className="h-6 w-12"/>
      </div>
    </div>
  );
}

function SkeletonLogRow() {
  return (
    <div className="flex items-center gap-4 py-4 divider-b">
      <Skeleton className="h-4 w-24"/>
      <Skeleton className="h-2.5 flex-1 rounded-full"/>
      <Skeleton className="h-4 w-16"/>
      <Skeleton className="h-4 w-16"/>
      <Skeleton className="h-6 w-6 rounded-full"/>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ════════════════════════════════════════════════════════════════════
export default function MyAttendancePage() {
  const router = useRouter();
  const {hasPermission, isReady: permReady} = usePermissions();
  const [activeTab, setActiveTab] = useState<TabView>('log');
  const [use24h, setUse24h] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('30days');
  const [liveTime, setLiveTime] = useState(new Date());
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // A3: Permission gate — redirect if user lacks ATTENDANCE:VIEW_SELF
  useEffect(() => {
    if (!permReady) return;
    if (!hasPermission(Permissions.ATTENDANCE_VIEW_SELF)) {
      router.replace('/dashboard');
    }
  }, [permReady, hasPermission, router]);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Date range based on period filter ────────────────────────────
  const {startDate, endDate} = useMemo(() => {
    if (periodFilter === '30days') {
      return {
        startDate: getDateOffsetString(-30),
        endDate: getLocalDateString(),
      };
    }
    // Month-based filter
    return {
      startDate: getMonthStartString(selectedYear, selectedMonth),
      endDate: getMonthEndString(selectedYear, selectedMonth),
    };
  }, [periodFilter, selectedMonth, selectedYear]);

  // ── Data hooks ───────────────────────────────────────────────────
  const {data: records = [], isLoading: loading} = useAttendanceByDateRange(startDate, endDate);
  useHolidaysByYear(selectedYear); // Pre-fetch for cache warming (data displayed on parent page)

  // Fetch time entries for expanded row
  useMyTimeEntries(expandedRow || '', !!expandedRow); // Pre-fetch for expanded row (rendering in progress)

  // ── Current week days ────────────────────────────────────────────
  const weekDays = useMemo((): DayOfWeek[] => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

    return Array.from({length: 7}, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return {
        label: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i],
        date: d,
        isToday: d.toDateString() === today.toDateString(),
        dayNum: d.getDate(),
      };
    });
  }, []);

  // ── Today's record ──────────────────────────────────────────────
  const todayStr = getLocalDateString();
  const todayRecord = useMemo(
    () => records.find((r) => r.attendanceDate === todayStr),
    [records, todayStr]
  );

  // ── Stats computation ───────────────────────────────────────────
  const stats = useMemo(() => {
    const workRecords = records.filter(
      (r) => r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'HALF_DAY'
    );
    const totalMinutes = workRecords.reduce((sum, r) => sum + (r.workDurationMinutes || 0), 0);
    const avgMinutes = workRecords.length > 0 ? totalMinutes / workRecords.length : 0;
    const onTimeCount = workRecords.filter((r) => !r.isLate).length;
    const onTimePct = workRecords.length > 0 ? Math.round((onTimeCount / workRecords.length) * 100) : 0;

    return {avgMinutes, onTimePct, totalDays: workRecords.length};
  }, [records]);

  // ── Sorted records for log view (newest first) ──────────────────
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate));
  }, [records]);

  // ── Month filter options ────────────────────────────────────────
  const monthFilters = useMemo(() => {
    const now = new Date();
    const months: { label: string; month: number; year: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleDateString('en-US', {month: 'short'}).toUpperCase(),
        month: d.getMonth(),
        year: d.getFullYear(),
      });
    }
    return months;
  }, []);

  // ── Calendar data for calendar tab ──────────────────────────────
  const calendarData = useMemo(() => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const today = new Date();

    const days: Array<{
      date: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      record?: AttendanceRecord;
      isWeekend: boolean;
    }> = [];

    // Previous month padding
    const prevMonthLastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({date: prevMonthLastDay - i, isCurrentMonth: false, isToday: false, isWeekend: false});
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(selectedYear, selectedMonth, d).getDay();
      days.push({
        date: d,
        isCurrentMonth: true,
        isToday: d === today.getDate() && selectedMonth === today.getMonth() && selectedYear === today.getFullYear(),
        record: records.find((r) => r.attendanceDate === dateStr),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({date: i, isCurrentMonth: false, isToday: false, isWeekend: false});
    }

    return days;
  }, [selectedMonth, selectedYear, records]);

  // ── Status helpers ──────────────────────────────────────────────
  const getStatusBadge = (record: AttendanceRecord) => {
    switch (record.status) {
      case 'WEEKLY_OFF':
        return <span className="badge-status status-neutral text-xs">W-OFF</span>;
      case 'HOLIDAY':
        return <span className="badge-status status-info text-xs">HOLIDAY</span>;
      case 'ON_LEAVE':
      case 'LEAVE':
        return <span className="badge-status status-purple text-xs">LEAVE</span>;
      case 'ABSENT':
        return <span className="badge-status status-danger text-xs">ABSENT</span>;
      case 'HALF_DAY':
        return <span className="badge-status status-warning text-xs">HALF DAY</span>;
      case 'LATE':
        return <span className="badge-status status-orange text-xs">LATE</span>;
      default:
        return null;
    }
  };

  const isNonWorkingDay = (record: AttendanceRecord) => {
    return record.status === 'WEEKLY_OFF' || record.status === 'HOLIDAY' || record.status === 'ON_LEAVE' || record.status === 'LEAVE';
  };

  const getNonWorkLabel = (record: AttendanceRecord) => {
    switch (record.status) {
      case 'WEEKLY_OFF':
        return 'Full day Weekly-off';
      case 'HOLIDAY':
        return 'Holiday';
      case 'ON_LEAVE':
      case 'LEAVE':
        return 'On Leave';
      case 'ABSENT':
        return 'No Time Entries Logged';
      default:
        return '';
    }
  };

  // ── Calendar cell color ─────────────────────────────────────────
  const getCalCellColor = (record?: AttendanceRecord, isWeekend?: boolean) => {
    if (!record) {
      if (isWeekend) return 'bg-surface-100 dark:bg-surface-800/50';
      return 'bg-[var(--bg-card)]';
    }
    if (record.status === 'WEEKLY_OFF' || record.status === 'HOLIDAY') return 'bg-surface-100 dark:bg-surface-800/50';
    if (record.status === 'ABSENT') return 'bg-danger-50 dark:bg-danger-950/30';
    if (record.status === 'ON_LEAVE' || record.status === 'LEAVE') return 'bg-info-50 dark:bg-info-950/30';
    const hours = record.totalWorkHours || (record.workDurationMinutes ? record.workDurationMinutes / 60 : 0);
    if (hours >= 8) return 'bg-success-50 dark:bg-success-950/30';
    if (hours >= 6) return 'bg-warning-50 dark:bg-warning-950/30';
    return 'bg-warning-50 dark:bg-warning-950/30';
  };

  // ── Export CSV ──────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Date', 'Status', 'Check In', 'Check Out', 'Effective Hours', 'Gross Hours'];
    const rows = sortedRecords.map((r) => [
      r.attendanceDate,
      r.status,
      r.checkInTime ? formatTime(r.checkInTime, true) : '',
      r.checkOutTime ? formatTime(r.checkOutTime, true) : '',
      formatDuration(r.workDurationMinutes),
      formatHoursFromMinutes(r.workDurationMinutes),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        {/* ── PAGE HEADER ─────────────────────────────────────── */}
        <div className="row-between">
          <div>
            <h1 className="text-page-title text-[var(--text-primary)] skeuo-emboss">Attendance</h1>
          </div>
          <Button variant="outline" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4"/>
            Export
          </Button>
        </div>

        {/* ── TOP SECTION: Stats | Timings | Actions ──────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Attendance Stats */}
          <Card className="card-aura">
            <CardHeader className="pb-2">
              <CardTitle className="text-card-title text-[var(--text-primary)]">Attendance Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {loading ? (
                <>
                  <SkeletonStatRow/>
                  <SkeletonStatRow/>
                </>
              ) : (
                <>
                  {/* Me row */}
                  <div className="flex items-center py-4 divider-b">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-8 h-8 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                        <Users className="h-4 w-4 text-accent-500"/>
                      </div>
                      <span className="text-sm font-medium text-[var(--text-primary)]">Me</span>
                    </div>
                    <div className="ml-auto flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-caption uppercase tracking-wider">Avg Hrs / Day</p>
                        <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
                          {formatDuration(stats.avgMinutes)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-caption uppercase tracking-wider">On Time Arrival</p>
                        <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
                          {stats.onTimePct}%
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Team row */}
                  <div className="flex items-center py-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-8 h-8 rounded-full bg-info-100 dark:bg-info-900/30 flex items-center justify-center">
                        <Users className="h-4 w-4 text-info-500"/>
                      </div>
                      <span className="text-sm font-medium text-[var(--text-secondary)]">My Team</span>
                    </div>
                    <div className="ml-auto flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-caption uppercase tracking-wider">Avg Hrs / Day</p>
                        <p className="text-lg font-bold text-[var(--text-secondary)] tabular-nums">--</p>
                      </div>
                      <div className="text-right">
                        <p className="text-caption uppercase tracking-wider">On Time Arrival</p>
                        <p className="text-lg font-bold text-[var(--text-secondary)] tabular-nums">--</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Timings */}
          <Card className="card-aura">
            <CardHeader className="pb-2">
              <CardTitle className="text-card-title text-[var(--text-primary)]">Timings</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Week day circles */}
              <div className="flex items-center gap-2 mb-4">
                {weekDays.map((day, i) => (
                  <div
                    key={i}
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all
                      ${day.isToday
                      ? 'bg-accent-500 text-white ring-2 ring-accent-200 dark:ring-accent-800'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                    }
                    `}
                  >
                    {day.label}
                  </div>
                ))}
              </div>

              {/* Today's timing */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--text-muted)]">
                  Today (Flexible Timings)
                </p>
                {todayRecord?.checkInTime ? (
                  <>
                    <div className="relative h-4 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                      <AttendanceTimelineBar record={todayRecord}/>
                    </div>
                    <div className="row-between text-caption">
                      <span>Duration: {formatDuration(todayRecord.workDurationMinutes)}</span>
                      <div className="flex items-center gap-1">
                        <Timer className="h-3 w-3"/>
                        <span>60 min</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-4 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center">
                    <span className="text-caption">Not clocked in yet</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="card-aura">
            <CardHeader className="pb-2">
              <CardTitle className="text-card-title text-[var(--text-primary)]">Actions</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Live Clock */}
              <div className="text-center mb-4">
                <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums tracking-wide">
                  {liveTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: !use24h,
                  })}
                </p>
                <p className="text-caption mt-1">
                  {liveTime.toLocaleDateString('en-US', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
              </div>
              {/* Action links */}
              <div className="space-y-2">
                <button
                  className="cursor-pointer flex items-center gap-2 text-sm text-accent-500 hover:text-accent-700 transition-colors w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded-md">
                  <LogIn className="h-4 w-4"/>
                  <span>Remote Clock-In</span>
                </button>
                <button
                  className="cursor-pointer flex items-center gap-2 text-sm text-accent-500 hover:text-accent-700 transition-colors w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded-md">
                  <FileText className="h-4 w-4"/>
                  <span>Attendance Policy</span>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── LOGS & REQUESTS SECTION ─────────────────────────── */}
        <Card className="card-aura">
          <CardHeader className="pb-0">
            <div className="row-between flex-wrap gap-4">
              <CardTitle className="text-section-title text-[var(--text-primary)]">
                Logs &amp; Requests
              </CardTitle>
              {/* 24h toggle */}
              <div className="flex items-center gap-2">
                <span className="text-caption">24 hour format</span>
                <button
                  onClick={() => setUse24h(!use24h)}
                  className={`
                    cursor-pointer relative w-10 h-5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2
                    ${use24h ? 'bg-accent-700' : 'bg-[var(--border-main)]'}
                  `}
                  aria-label={`Toggle 24 hour format (currently ${use24h ? 'on' : 'off'})`}
                >
                  <div
                    className={`
                      absolute top-0.5 w-4 h-4 rounded-full bg-[var(--bg-card)] shadow transition-transform
                      ${use24h ? 'translate-x-5' : 'translate-x-0.5'}
                    `}
                  />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-0 mt-4 border-b border-[var(--border-main)]">
              {[
                {key: 'log' as TabView, label: 'Attendance Log'},
                {key: 'calendar' as TabView, label: 'Calendar'},
                {key: 'requests' as TabView, label: 'Attendance Requests'},
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    cursor-pointer px-4 py-2 text-sm font-medium transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2
                    ${activeTab === tab.key
                    ? 'text-accent-700 dark:text-accent-400'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }
                  `}
                >
                  {tab.label}
                  {activeTab === tab.key && (
                    <motion.div
                      layoutId="tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-500"
                    />
                  )}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <AnimatePresence mode="wait">
              {/* ════ ATTENDANCE LOG TAB ════ */}
              {activeTab === 'log' && (
                <motion.div
                  key="log"
                  initial={{opacity: 0, y: 8}}
                  animate={{opacity: 1, y: 0}}
                  exit={{opacity: 0, y: -8}}
                  transition={{duration: 0.2}}
                >
                  {/* Period filters */}
                  <div className="row-between mb-6 flex-wrap gap-4">
                    <h3 className="text-sm font-medium text-[var(--text-primary)]">
                      {periodFilter === '30days' ? 'Last 30 Days' : `${monthFilters.find(m => `${m.month}-${m.year}` === periodFilter)?.label || ''} ${selectedYear}`}
                    </h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPeriodFilter('30days')}
                        className={`
                          cursor-pointer px-4 py-1.5 rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2
                          ${periodFilter === '30days'
                          ? 'bg-accent-500 text-white shadow-[var(--shadow-elevated)]'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]/80'
                        }
                        `}
                      >
                        30 DAYS
                      </button>
                      {monthFilters.slice(0, 6).map((m) => {
                        const key = `${m.month}-${m.year}`;
                        return (
                          <button
                            key={key}
                            onClick={() => {
                              setPeriodFilter(key);
                              setSelectedMonth(m.month);
                              setSelectedYear(m.year);
                            }}
                            className={`
                              cursor-pointer px-4 py-1.5 rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2
                              ${periodFilter === key
                              ? 'bg-accent-500 text-white shadow-[var(--shadow-elevated)]'
                              : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]/80'
                            }
                            `}
                          >
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Log table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                      <tr className="border-b border-[var(--border-main)]">
                        <th
                          className="text-left py-2 px-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider w-[140px]">
                          Date
                        </th>
                        <th
                          className="text-left py-2 px-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                          Attendance Visual
                        </th>
                        <th
                          className="text-left py-2 px-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider w-[120px]">
                          Effective Hours
                        </th>
                        <th
                          className="text-left py-2 px-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider w-[120px]">
                          Gross Hours
                        </th>
                        <th
                          className="text-center py-2 px-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider w-[60px]">
                          Log
                        </th>
                      </tr>
                      </thead>
                      <tbody>
                      {loading ? (
                        Array.from({length: 10}).map((_, i) => (
                          <tr key={i}>
                            <td colSpan={5}><SkeletonLogRow/></td>
                          </tr>
                        ))
                      ) : sortedRecords.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-16">
                            <div className="flex flex-col items-center gap-2">
                              <Calendar className="h-8 w-8 text-[var(--text-muted)]"/>
                              <p className="text-sm font-medium text-[var(--text-muted)]">No attendance records
                                found</p>
                              <p className="text-caption">Records will appear here once you start clocking in</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        sortedRecords.map((record) => {
                          const isNonWork = isNonWorkingDay(record);
                          const effectiveMin = record.workDurationMinutes || 0;
                          const effectiveHours = effectiveMin / 60;
                          const isExpanded = expandedRow === record.attendanceDate;

                          return (
                            <motion.tr
                              key={record.id}
                              initial={{opacity: 0}}
                              animate={{opacity: 1}}
                              className={`
                                  divider-b transition-colors
                                  ${isNonWork ? 'bg-surface-50 dark:bg-surface-900/30' : 'hover:bg-[var(--bg-card-hover)]'}
                                `}
                            >
                              {/* Date */}
                              <td className="py-4 px-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-[var(--text-primary)]">
                                      {formatDateLabel(record.attendanceDate)}
                                    </span>
                                  {getStatusBadge(record)}
                                </div>
                              </td>

                              {/* Attendance Visual */}
                              <td className="py-4 px-2">
                                {isNonWork || record.status === 'ABSENT' ? (
                                  <span className="text-body-muted italic">
                                      {getNonWorkLabel(record)}
                                    </span>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <AttendanceTimelineBar record={record}/>
                                    {record.checkInLocation && (
                                      <MapPin className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0"/>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Effective Hours */}
                              <td className="py-4 px-2">
                                {!isNonWork && effectiveMin > 0 ? (
                                  <div className="flex items-center gap-2">
                                    <StatusDot hours={effectiveHours}/>
                                    <span className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
                                        {formatDuration(effectiveMin)}
                                      </span>
                                  </div>
                                ) : (
                                  <span className="text-body-muted">--</span>
                                )}
                              </td>

                              {/* Gross Hours */}
                              <td className="py-4 px-2">
                                  <span className="text-body-secondary tabular-nums">
                                    {!isNonWork && effectiveMin > 0
                                      ? formatHoursFromMinutes(effectiveMin + (record.breakDurationMinutes || 0))
                                      : '--'
                                    }
                                  </span>
                              </td>

                              {/* Log action */}
                              <td className="py-4 px-2 text-center">
                                {!isNonWork && record.checkInTime ? (
                                  <button
                                    onClick={() => setExpandedRow(isExpanded ? null : record.attendanceDate)}
                                    className="cursor-pointer inline-flex items-center justify-center w-7 h-7 rounded-full hover:bg-[var(--bg-secondary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                                    aria-label={isExpanded ? 'Hide time entries' : 'View time entries'}
                                  >
                                    <Eye className="h-4 w-4 text-accent-500"/>
                                  </button>
                                ) : (
                                  <MoreHorizontal className="h-4 w-4 text-[var(--text-muted)] mx-auto"/>
                                )}
                              </td>
                            </motion.tr>
                          );
                        })
                      )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* ════ CALENDAR TAB ════ */}
              {activeTab === 'calendar' && (
                <motion.div
                  key="calendar"
                  initial={{opacity: 0, y: 8}}
                  animate={{opacity: 1, y: 0}}
                  exit={{opacity: 0, y: -8}}
                  transition={{duration: 0.2}}
                >
                  {/* Month navigation */}
                  <div className="row-between mb-4">
                    <button
                      onClick={() => {
                        if (selectedMonth === 0) {
                          setSelectedMonth(11);
                          setSelectedYear(selectedYear - 1);
                        } else {
                          setSelectedMonth(selectedMonth - 1);
                        }
                      }}
                      className="cursor-pointer p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="h-4 w-4 text-[var(--text-secondary)]"/>
                    </button>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      {new Date(selectedYear, selectedMonth).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric'
                      })}
                    </h3>
                    <button
                      onClick={() => {
                        if (selectedMonth === 11) {
                          setSelectedMonth(0);
                          setSelectedYear(selectedYear + 1);
                        } else {
                          setSelectedMonth(selectedMonth + 1);
                        }
                      }}
                      className="cursor-pointer p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                      aria-label="Next month"
                    >
                      <ChevronRight className="h-4 w-4 text-[var(--text-secondary)]"/>
                    </button>
                  </div>

                  {/* Calendar grid — compact */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day}
                           className="text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {calendarData.map((day, idx) => (
                      <div
                        key={idx}
                        className={`
                          h-12 rounded-lg text-xs font-medium flex flex-col items-center justify-center relative transition-all
                          ${!day.isCurrentMonth ? 'opacity-20' : ''}
                          ${day.isToday ? 'ring-2 ring-accent-500 ring-offset-1' : ''}
                          ${day.isCurrentMonth ? getCalCellColor(day.record, day.isWeekend) : 'bg-[var(--bg-secondary)]'}
                        `}
                      >
                        <span
                          className={`text-xs ${day.isToday ? 'font-bold text-accent-700 dark:text-accent-400' : 'text-[var(--text-primary)]'}`}>
                          {day.date}
                        </span>
                        {day.record && day.isCurrentMonth && day.record.totalWorkHours ? (
                          <span className="text-caption">
                            {day.record.totalWorkHours.toFixed(1)}h
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded-md bg-success-50 dark:bg-success-950/30 border border-success-200 dark:border-success-800"/>
                      <span className="text-caption">Full day</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded-md bg-warning-50 dark:bg-warning-950/30 border border-warning-200 dark:border-warning-800"/>
                      <span className="text-caption">Partial</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded-md bg-danger-50 dark:bg-danger-950/30 border border-danger-200 dark:border-danger-800"/>
                      <span className="text-caption">Absent</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded-md bg-info-50 dark:bg-info-950/30 border border-info-200 dark:border-info-800"/>
                      <span className="text-caption">Leave</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded-md bg-surface-100 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700"/>
                      <span className="text-caption">Off / Holiday</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ════ REQUESTS TAB ════ */}
              {activeTab === 'requests' && (
                <motion.div
                  key="requests"
                  initial={{opacity: 0, y: 8}}
                  animate={{opacity: 1, y: 0}}
                  exit={{opacity: 0, y: -8}}
                  transition={{duration: 0.2}}
                  className="py-8"
                >
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center">
                      <AlertCircle className="h-8 w-8 text-[var(--text-muted)]"/>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">No pending requests</p>
                      <p className="text-caption mt-1">
                        Regularization and correction requests will appear here
                      </p>
                    </div>
                    <Button variant="outline" className="gap-2"
                            onClick={() => window.location.href = '/attendance/regularization'}>
                      <FileText className="h-4 w-4"/>
                      Request Regularization
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
