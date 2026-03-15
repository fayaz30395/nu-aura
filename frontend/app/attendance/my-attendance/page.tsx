'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Coffee,
  Download,
  Clock,
  LogIn,
  LogOut,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Loading';
import { AttendanceRecord, TimeEntry } from '@/lib/types/attendance';
import { getMonthStartString, getMonthEndString, getLocalDateString } from '@/lib/utils/dateUtils';
import { useAttendanceByDateRange, useMyTimeEntries, useHolidaysByYear } from '@/lib/hooks/queries/useAttendance';

type ViewMode = 'calendar' | 'list';
type FilterStatus = 'all' | 'present' | 'absent' | 'late' | 'leave';

interface CalendarDay {
  date: number;
  record?: AttendanceRecord;
  isToday: boolean;
  isCurrentMonth: boolean;
  isPastWorkday: boolean;
}

interface ChartData {
  date: string;
  day: string;
  hours: number;
  status: string;
}

export default function MyAttendancePage() {
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // Use utility functions for consistent timezone handling
  const startDate = getMonthStartString(year, month);
  const endDate = getMonthEndString(year, month);

  const { data: records = [], isLoading: loading, error } = useAttendanceByDateRange(
    startDate,
    endDate
  );

  const { data: holidays = [] } = useHolidaysByYear(year);

  const { data: timeEntries = [], isLoading: loadingTimeEntries } = useMyTimeEntries(
    selectedDate || '',
    !!selectedDate
  );

  // Get heatmap color intensity based on work hours
  const getHeatmapColor = (record?: AttendanceRecord): { bg: string; border: string; hasLate: boolean } => {
    if (!record) return { bg: 'bg-[var(--bg-secondary)]', border: 'border-[var(--border-main)]', hasLate: false };

    const hours = record.totalWorkHours || (record.workDurationMinutes ? record.workDurationMinutes / 60 : 0);
    const isLate = record.isLate || false;

    switch (record.status) {
      case 'PRESENT':
        if (hours >= 8) {
          return { bg: 'bg-green-600 dark:bg-green-700', border: isLate ? 'ring-2 ring-orange-500' : '', hasLate: isLate };
        } else if (hours >= 6) {
          return { bg: 'bg-green-400 dark:bg-green-600', border: isLate ? 'ring-2 ring-orange-500' : '', hasLate: isLate };
        } else {
          return { bg: 'bg-green-200 dark:bg-green-800', border: isLate ? 'ring-2 ring-orange-500' : '', hasLate: isLate };
        }
      case 'ABSENT':
        return { bg: 'bg-red-500 dark:bg-red-700', border: '', hasLate: false };
      case 'HALF_DAY':
        return { bg: 'bg-yellow-400 dark:bg-yellow-600', border: '', hasLate: false };
      case 'LATE':
        return { bg: 'bg-orange-400 dark:bg-orange-600', border: '', hasLate: false };
      case 'LEAVE':
      case 'ON_LEAVE':
        return { bg: 'bg-blue-500 dark:bg-blue-700', border: '', hasLate: false };
      case 'WEEKLY_OFF':
        return { bg: 'bg-purple-400 dark:bg-purple-600', border: '', hasLate: false };
      case 'HOLIDAY':
        return { bg: 'bg-pink-500 dark:bg-pink-700', border: '', hasLate: false };
      default:
        return { bg: 'bg-[var(--bg-secondary)]', border: 'border-[var(--border-main)]', hasLate: false };
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400';
      case 'ABSENT':
        return 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-400';
      case 'HALF_DAY':
        return 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-400';
      case 'LATE':
        return 'bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-400';
      case 'LEAVE':
      case 'ON_LEAVE':
        return 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400';
      case 'WEEKLY_OFF':
        return 'bg-purple-100 dark:bg-purple-950/30 text-purple-800 dark:text-purple-400';
      case 'HOLIDAY':
        return 'bg-pink-100 dark:bg-pink-950/30 text-pink-800 dark:text-pink-400';
      default:
        return 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] dark:text-[var(--text-muted)]';
    }
  };


  const calculateStats = useCallback(() => {
    const workingDays = records.filter((r) => {
      const status = r.status;
      return !['WEEKLY_OFF', 'HOLIDAY'].includes(status);
    });

    const present = records.filter((r) => r.status === 'PRESENT').length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const late = records.filter((r) => r.isLate === true).length;
    const leave = records.filter((r) => r.status === 'LEAVE' || r.status === 'ON_LEAVE').length;
    const earlyDepartures = records.filter((r) => r.isEarlyDeparture === true).length;

    const totalHours = records.reduce((sum, r) => {
      if (r.status === 'PRESENT' || r.status === 'HALF_DAY') {
        return sum + (r.totalWorkHours || (r.workDurationMinutes ? r.workDurationMinutes / 60 : 0));
      }
      return sum;
    }, 0);

    const totalOvertime = records.reduce((sum, r) => sum + (r.overtimeMinutes ? r.overtimeMinutes / 60 : 0), 0);
    const attendanceRate = workingDays.length > 0 ? (present / workingDays.length) * 100 : 0;
    const avgHours = present > 0 ? totalHours / present : 0;

    return {
      present,
      absent,
      late,
      leave,
      totalHours,
      avgHours,
      totalOvertime,
      earlyDepartures,
      attendanceRate,
      workingDays: workingDays.length,
    };
  }, [records]);

  const stats = calculateStats();
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  // Calendar data
  const calendarData = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: CalendarDay[] = [];

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: prevMonthLastDay - i,
        isToday: false,
        isCurrentMonth: false,
        isPastWorkday: false,
      });
    }

    // Current month days
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const record = records.find((r) => r.attendanceDate === dateStr);
      const isToday =
        today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

      // Check if this is a past workday (not weekend, not today, and before today)
      const currentDate = new Date(year, month, day);
      currentDate.setHours(0, 0, 0, 0); // Normalize to start of day for accurate comparison
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isPast = currentDate.getTime() < today.getTime();
      const isPastWorkday = isPast && !isWeekend;

      days.push({
        date: day,
        record,
        isToday,
        isCurrentMonth: true,
        isPastWorkday,
      });
    }

    // Next month days to complete the grid
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: day,
        isToday: false,
        isCurrentMonth: false,
        isPastWorkday: false,
      });
    }

    return days;
  }, [records, month, year]);

  // Filter records based on status filter
  const filteredRecords = useMemo(() => {
    if (filterStatus === 'all') return records;
    return records.filter((r) => {
      switch (filterStatus) {
        case 'present':
          return r.status === 'PRESENT';
        case 'absent':
          return r.status === 'ABSENT';
        case 'late':
          return r.isLate === true;
        case 'leave':
          return r.status === 'LEAVE' || r.status === 'ON_LEAVE';
        default:
          return true;
      }
    });
  }, [records, filterStatus]);

  // Chart data for work hours trend
  const chartData = useMemo((): ChartData[] => {
    return records
      .filter((r) => {
        if (filterStatus === 'all') return true;
        switch (filterStatus) {
          case 'present':
            return r.status === 'PRESENT';
          case 'absent':
            return r.status === 'ABSENT';
          case 'late':
            return r.isLate === true;
          case 'leave':
            return r.status === 'LEAVE' || r.status === 'ON_LEAVE';
          default:
            return true;
        }
      })
      .map((r) => {
        const date = new Date(r.attendanceDate);
        const hours = r.totalWorkHours || (r.workDurationMinutes ? r.workDurationMinutes / 60 : 0);
        return {
          date: r.attendanceDate,
          day: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          hours: Math.round(hours * 10) / 10,
          status: r.status,
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [records, filterStatus]);

  // Export CSV functionality
  const handleExportCSV = useCallback(() => {
    const headers = ['Date', 'Day', 'Check-In', 'Check-Out', 'Work Hours', 'Status', 'Late', 'Overtime (mins)'];
    const rows = records.map((r) => [
      r.attendanceDate,
      new Date(r.attendanceDate).toLocaleDateString('en-US', { weekday: 'short' }),
      r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--',
      r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--',
      r.totalWorkHours || (r.workDurationMinutes ? (r.workDurationMinutes / 60).toFixed(2) : '0'),
      r.status,
      r.isLate ? `${r.lateByMinutes}m` : '--',
      r.overtimeMinutes || '0',
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${months[month]}_${year}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [records, month, year, months]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (month === 0) {
        setMonth(11);
        setYear(year - 1);
      } else {
        setMonth(month - 1);
      }
    } else {
      if (month === 11) {
        setMonth(0);
        setYear(year + 1);
      } else {
        setMonth(month + 1);
      }
    }
  };

  const getSelectedRecord = useCallback(
    () => (selectedDate ? records.find((r) => r.attendanceDate === selectedDate) : null),
    [selectedDate, records]
  );

  const selectedRecord = getSelectedRecord();

  const formatTime = useCallback((dateString?: string) => {
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const getEntryTypeColor = (entryType: string): string => {
    switch (entryType) {
      case 'REGULAR':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'BREAK':
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800';
      case 'LUNCH':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      case 'MEETING':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'CLIENT_VISIT':
        return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      default:
        return 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-main)]';
    }
  };

  const getSourceBadge = (source?: string): string => {
    switch (source) {
      case 'WEB':
        return 'Desktop';
      case 'MOBILE':
        return 'Mobile';
      case 'BIOMETRIC':
        return 'Biometric';
      default:
        return source || 'System';
    }
  };

  return (
    <AppLayout activeMenuItem="attendance">
      <motion.div
        className="space-y-8"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-page-title text-[var(--text-primary)]">
              My Attendance
            </h1>
            <p className="text-[var(--text-secondary)] text-body mt-2">
              View your attendance history and statistics
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={viewMode === 'calendar' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              leftIcon={<LayoutGrid className="h-4 w-4" />}
            >
              Calendar
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              leftIcon={<List className="h-4 w-4" />}
            >
              List
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              leftIcon={<Download className="h-4 w-4" />}
            >
              Export
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 tint-danger border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-800 dark:text-red-300">{error.message || 'Failed to load attendance records.'}</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-[var(--bg-card)]">
                <CardContent className="p-4">
                  <Skeleton className="h-10 w-full mb-2" />
                  <Skeleton className="h-6 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Attendance Rate */}
            <Card className="card-aura">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="relative w-16 h-16 mx-auto mb-2">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="var(--bg-secondary)" strokeWidth="8" />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray={`${(stats.attendanceRate / 100) * 282.6} 282.6`}
                        className="text-green-500 dark:text-green-400 transition-all"
                        strokeLinecap="round"
                        transform="rotate(-90 50 50)"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-[var(--text-primary)]">
                        {stats.attendanceRate.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-2">Attendance Rate</p>
                </div>
              </CardContent>
            </Card>

            {/* Present Days */}
            <Card className="card-aura">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg tint-success flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Present</p>
                    <p className="text-lg font-bold text-[var(--text-primary)]">{stats.present}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Absent Days */}
            <Card className="card-aura">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg tint-danger flex items-center justify-center flex-shrink-0">
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Absent</p>
                    <p className="text-lg font-bold text-[var(--text-primary)]">{stats.absent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Late Arrivals */}
            <Card className="card-aura">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg tint-warning flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Late</p>
                    <p className="text-lg font-bold text-[var(--text-primary)]">{stats.late}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Average Hours */}
            <Card className="card-aura">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg tint-info flex items-center justify-center flex-shrink-0">
                    <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Avg Hours</p>
                    <p className="text-lg font-bold text-[var(--text-primary)]">{stats.avgHours.toFixed(1)}h</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Overtime */}
            <Card className="card-aura">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg tint-success flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Overtime</p>
                    <p className="text-lg font-bold text-[var(--text-primary)]">{stats.totalOvertime.toFixed(1)}h</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {viewMode === 'calendar' ? (
          <>
            {/* Filter Chips */}
            <motion.div
              className="flex gap-2 flex-wrap"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut', delay: 0.1 }}
            >
              {(['all', 'present', 'absent', 'late', 'leave'] as const).map((status) => (
                <motion.button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filterStatus === status
                      ? 'bg-primary-500 text-white shadow-lg'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]/80'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </motion.button>
              ))}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Calendar and Chart View */}
              <div className="lg:col-span-2 space-y-6">
                {/* Calendar */}
                <Card className="card-aura">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigateMonth('prev')}
                        className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                      >
                        <ChevronLeft className="h-5 w-5 text-[var(--text-secondary)]" />
                      </motion.button>
                      <h2 className="text-card-title text-[var(--text-primary)]">
                        {months[month]} {year}
                      </h2>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigateMonth('next')}
                        className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                      >
                        <ChevronRight className="h-5 w-5 text-[var(--text-secondary)]" />
                      </motion.button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-7 gap-1">
                          {[...Array(7)].map((_, i) => (
                            <Skeleton key={i} className="h-10 rounded-md" />
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {[...Array(35)].map((_, i) => (
                            <Skeleton key={i} className="h-10 rounded-md" />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Day headers */}
                        <div className="grid grid-cols-7 gap-1 mb-1">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                            <div
                              key={day}
                              className="text-center text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider py-1.5"
                            >
                              {day}
                            </div>
                          ))}
                        </div>

                        {/* Calendar grid with heatmap — compact */}
                        <div className="grid grid-cols-7 gap-1">
                          {calendarData.map((day, idx) => {
                            const dateStr = day.isCurrentMonth
                              ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day.date).padStart(2, '0')}`
                              : null;
                            const isSelected = selectedDate === dateStr;
                            const heatmap = getHeatmapColor(day.record);

                            return (
                              <motion.button
                                key={idx}
                                onClick={() => dateStr && setSelectedDate(isSelected ? null : dateStr)}
                                disabled={!day.isCurrentMonth}
                                whileHover={day.isCurrentMonth ? { scale: 1.04 } : {}}
                                whileTap={day.isCurrentMonth ? { scale: 0.96 } : {}}
                                className={`
                                  h-11 rounded-md text-xs font-medium transition-all relative
                                  flex flex-col items-center justify-center gap-0
                                  ${day.isCurrentMonth ? `${heatmap.bg} text-white cursor-pointer` : 'opacity-20 cursor-default bg-[var(--bg-secondary)]'}
                                  ${day.isToday ? 'ring-2 ring-offset-1 ring-primary-500 dark:ring-offset-surface-900' : ''}
                                  ${isSelected ? 'ring-2 ring-offset-1 ring-primary-400' : ''}
                                  ${heatmap.border}
                                `}
                              >
                                <span className={`text-xs leading-none ${day.isCurrentMonth ? 'text-white' : 'text-[var(--text-muted)]'}`}>
                                  {day.date}
                                </span>
                                {day.record && day.isCurrentMonth && (
                                  <span className="text-[9px] leading-none font-semibold text-white/80 mt-0.5">
                                    {(
                                      day.record.totalWorkHours ||
                                      (day.record.workDurationMinutes ? day.record.workDurationMinutes / 60 : 0)
                                    ).toFixed(1)}h
                                  </span>
                                )}
                                {day.isPastWorkday && !day.record && day.isCurrentMonth && (
                                  <div className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-red-400" />
                                )}
                              </motion.button>
                            );
                          })}
                        </div>

                        {/* Legend — inline compact */}
                        <div className="mt-3 pt-3 border-t border-[var(--border-main)]">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mr-1">Legend</span>
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-800" />
                              <span className="text-[10px] text-[var(--text-secondary)]">&lt;6h</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-600" />
                              <span className="text-[10px] text-[var(--text-secondary)]">6-8h</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-700" />
                              <span className="text-[10px] text-[var(--text-secondary)]">&gt;8h</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded-sm bg-red-500" />
                              <span className="text-[10px] text-[var(--text-secondary)]">Absent</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded-sm bg-blue-500" />
                              <span className="text-[10px] text-[var(--text-secondary)]">Leave</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded-sm ring-1.5 ring-orange-500" />
                              <span className="text-[10px] text-[var(--text-secondary)]">Late</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Work Hours Trend Chart */}
                {!loading && chartData.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut', delay: 0.15 }}
                  >
                    <Card className="card-aura">
                      <CardHeader>
                        <CardTitle className="text-card-title text-[var(--text-primary)]">Work Hours Trend</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--primary-500)" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="var(--primary-500)" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" />
                            <XAxis
                              dataKey="day"
                              tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                              interval={Math.floor(chartData.length / 5) || 0}
                            />
                            <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'var(--bg-card)',
                                border: '1px solid var(--border-main)',
                                borderRadius: '8px',
                              }}
                              labelStyle={{ color: 'var(--text-primary)' }}
                            />
                            <ReferenceLine y={8} stroke="var(--text-muted)" strokeDasharray="3 3" label="Standard (8h)" />
                            <Area type="monotone" dataKey="hours" stroke="var(--primary-500)" fill="url(#colorHours)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>

              {/* Selected Date Details Sidebar */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut', delay: 0.1 }}
              >
                <Card className="card-aura sticky top-24">
                  <CardHeader>
                    <CardTitle className="text-card-title text-[var(--text-primary)]">
                      {selectedDate
                        ? new Date(selectedDate).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'Select a Date'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedRecord ? (
                      <motion.div
                        className="space-y-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.25 }}
                      >
                        {/* Status */}
                        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-main)]">
                          <span className="text-sm text-[var(--text-muted)]">Status</span>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedRecord.status)}`}>
                            {selectedRecord.status || 'PRESENT'}
                          </span>
                        </div>

                        {/* Check In/Out */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <LogIn className="h-4 w-4 text-blue-500" />
                              <span className="text-sm text-[var(--text-muted)]">Check In</span>
                            </div>
                            <span className="text-sm font-medium text-[var(--text-primary)]">{formatTime(selectedRecord.checkInTime)}</span>
                          </div>
                          {selectedRecord.checkInSource && (
                            <p className="text-xs text-[var(--text-muted)] ml-6">{getSourceBadge(selectedRecord.checkInSource)}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <LogOut className="h-4 w-4 text-orange-500" />
                              <span className="text-sm text-[var(--text-muted)]">Check Out</span>
                            </div>
                            <span className="text-sm font-medium text-[var(--text-primary)]">{formatTime(selectedRecord.checkOutTime)}</span>
                          </div>
                          {selectedRecord.checkOutSource && (
                            <p className="text-xs text-[var(--text-muted)] ml-6">{getSourceBadge(selectedRecord.checkOutSource)}</p>
                          )}
                        </div>

                        {/* Work Hours */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[var(--text-muted)]">Work Hours</span>
                          <span className="text-sm font-bold text-[var(--text-primary)]">
                            {(selectedRecord.totalWorkHours || (selectedRecord.workDurationMinutes ? selectedRecord.workDurationMinutes / 60 : 0)).toFixed(2)} hrs
                          </span>
                        </div>

                        {/* Late */}
                        {selectedRecord.isLate && (
                          <div className="tint-warning border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-sm">
                              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                              <span className="text-orange-700 dark:text-orange-300">
                                Late by {selectedRecord.lateByMinutes} minutes
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Early Departure */}
                        {selectedRecord.isEarlyDeparture && (
                          <div className="tint-warning border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-sm">
                              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                              <span className="text-yellow-700 dark:text-yellow-300">
                                Early departure {selectedRecord.earlyDepartureMinutes}m
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Overtime */}
                        {selectedRecord.overtimeMinutes && selectedRecord.overtimeMinutes > 0 && (
                          <div className="tint-success border border-green-200 dark:border-green-800 rounded-lg p-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-green-700 dark:text-green-300">Overtime</span>
                              <span className="font-bold text-green-700 dark:text-green-300">
                                {(selectedRecord.overtimeMinutes / 60).toFixed(2)}h
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Regularization */}
                        {selectedRecord.isRegularization && (
                          <div className="tint-warning border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-sm">
                              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                              <span className="text-orange-700 dark:text-orange-300">Regularized Entry</span>
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {selectedRecord.notes && (
                          <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
                            <p className="text-xs text-[var(--text-muted)] mb-1">Notes</p>
                            <p className="text-sm text-[var(--text-secondary)]">{selectedRecord.notes}</p>
                          </div>
                        )}

                        {/* Time Entries */}
                        {loadingTimeEntries ? (
                          <div className="space-y-2 pt-4 border-t border-[var(--border-main)]">
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-full" />
                          </div>
                        ) : timeEntries.length > 0 ? (
                          <div className="pt-4 border-t border-[var(--border-main)]">
                            <p className="text-xs font-semibold text-[var(--text-muted)] mb-3">Time Sessions</p>
                            <div className="space-y-2">
                              {timeEntries.map((entry, idx) => (
                                <motion.div
                                  key={entry.id}
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                  className={`p-2 rounded-lg border ${getEntryTypeColor(entry.entryType)}`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium">{entry.entryType}</span>
                                    <span className="text-xs text-[var(--text-muted)]">{entry.durationMinutes}m</span>
                                  </div>
                                  <div className="text-xs text-[var(--text-secondary)]">
                                    {formatTime(entry.checkInTime)} - {entry.checkOutTime ? formatTime(entry.checkOutTime) : 'Ongoing'}
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </motion.div>
                    ) : selectedDate ? (
                      <motion.div className="text-center py-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <XCircle className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3" />
                        <p className="text-sm text-[var(--text-muted)]">No attendance record for this date</p>
                      </motion.div>
                    ) : (
                      <motion.div className="text-center py-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <Calendar className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3" />
                        <p className="text-sm text-[var(--text-muted)]">Click on a date to view details</p>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </>
        ) : (
          /* List View */
          <>
            {/* Filter Section */}
            <motion.div
              className="flex gap-2 flex-wrap"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut', delay: 0.1 }}
            >
              {(['all', 'present', 'absent', 'late', 'leave'] as const).map((status) => (
                <motion.button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filterStatus === status
                      ? 'bg-primary-500 text-white shadow-lg'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]/80'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </motion.button>
              ))}
            </motion.div>

            {/* Month Selector */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut', delay: 0.05 }}
            >
              <Card className="card-aura">
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-4 items-center">
                    <Calendar className="h-5 w-5 text-[var(--text-muted)]" />
                    <label className="text-sm font-medium text-[var(--text-primary)]">Select Period:</label>
                    <select
                      value={month}
                      onChange={(e) => setMonth(Number(e.target.value))}
                      className="px-4 py-2 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    >
                      {months.map((m, i) => (
                        <option key={i} value={i}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <select
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      className="px-4 py-2 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    >
                      {[2024, 2025, 2026].map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Attendance Records Table */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut', delay: 0.1 }}
            >
              <Card className="card-aura">
                <CardHeader>
                  <CardTitle className="text-card-title text-[var(--text-primary)]">
                    Attendance Records {filteredRecords.length > 0 && `(${filteredRecords.length})`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="space-y-2 p-6">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : filteredRecords.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3" />
                      <p className="text-[var(--text-muted)]">No attendance records for this period</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-[var(--bg-secondary)]/50 border-b border-[var(--border-main)]">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Check In</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Check Out</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Work Hours</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-main)]">
                          {filteredRecords.map((record, idx) => (
                            <motion.tr
                              key={record.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: idx * 0.02 }}
                              className="hover:bg-[var(--bg-secondary)]/50 transition-colors"
                            >
                              <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">
                                {new Date(record.attendanceDate).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </td>
                              <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{formatTime(record.checkInTime)}</td>
                              <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{formatTime(record.checkOutTime)}</td>
                              <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">
                                {(record.totalWorkHours || (record.workDurationMinutes ? record.workDurationMinutes / 60 : 0)).toFixed(2)} hrs
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>
                                  {record.status || 'PRESENT'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                                <div className="space-y-1">
                                  {record.isRegularization && (
                                    <div className="text-orange-600 dark:text-orange-400 text-xs font-medium">Regularized</div>
                                  )}
                                  {record.isLate && (
                                    <div className="text-orange-600 dark:text-orange-400 text-xs font-medium">
                                      Late ({record.lateByMinutes}m)
                                    </div>
                                  )}
                                  {record.isEarlyDeparture && (
                                    <div className="text-yellow-600 dark:text-yellow-400 text-xs font-medium">
                                      Early ({record.earlyDepartureMinutes}m)
                                    </div>
                                  )}
                                  {record.overtimeMinutes && record.overtimeMinutes > 0 && (
                                    <div className="text-green-600 dark:text-green-400 text-xs font-medium">
                                      OT {(record.overtimeMinutes / 60).toFixed(1)}h
                                    </div>
                                  )}
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </motion.div>
    </AppLayout>
  );
}
