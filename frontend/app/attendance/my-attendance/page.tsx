'use client';

import { useState, useMemo } from 'react';
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
  RefreshCw,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AttendanceRecord } from '@/lib/types/attendance';
import { getMonthStartString, getMonthEndString } from '@/lib/utils/dateUtils';
import { useAttendanceByDateRange } from '@/lib/hooks/queries/useAttendance';

type ViewMode = 'calendar' | 'list';

export default function MyAttendancePage() {
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Use utility functions for consistent timezone handling
  const startDate = getMonthStartString(year, month);
  const endDate = getMonthEndString(year, month);

  const { data: records = [], isLoading: loading, error } = useAttendanceByDateRange(
    startDate,
    endDate
  );

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
        return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-400';
    }
  };

  const getCalendarDotColor = (status?: string) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-green-500';
      case 'ABSENT':
        return 'bg-red-500';
      case 'HALF_DAY':
        return 'bg-yellow-500';
      case 'LATE':
        return 'bg-orange-500';
      case 'LEAVE':
      case 'ON_LEAVE':
        return 'bg-blue-500';
      case 'WEEKLY_OFF':
        return 'bg-purple-400';
      case 'HOLIDAY':
        return 'bg-pink-500';
      default:
        return 'bg-surface-300';
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateStats = () => {
    const present = records.filter((r) => r.status === 'PRESENT').length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const late = records.filter((r) => r.isLate === true).length;
    const leave = records.filter((r) => r.status === 'LEAVE' || r.status === 'ON_LEAVE').length;
    const totalHours = records.reduce((sum, r) => sum + (r.totalWorkHours || 0), 0);
    const avgHours = records.length > 0 ? totalHours / records.filter((r) => r.status === 'PRESENT').length : 0;

    return { present, absent, late, leave, totalHours, avgHours };
  };

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

    const days: { date: number; record?: AttendanceRecord; isToday: boolean; isCurrentMonth: boolean; isPastWorkday: boolean }[] = [];

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

  const getSelectedRecord = () => {
    if (!selectedDate) return null;
    return records.find((r) => r.attendanceDate === selectedDate);
  };

  const selectedRecord = getSelectedRecord();

  return (
    <AppLayout activeMenuItem="attendance">
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
              My Attendance
            </h1>
            <p className="text-surface-500 dark:text-surface-400 mt-1">
              View your attendance history and statistics
            </p>
          </div>
          <div className="flex items-center gap-2">
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
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-800 dark:text-red-300">{error.message || 'Failed to load attendance records.'}</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-white dark:bg-surface-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-surface-500 dark:text-surface-400">Present</p>
                  <p className="text-xl font-bold text-surface-900 dark:text-surface-50">
                    {stats.present}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-surface-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-surface-500 dark:text-surface-400">Absent</p>
                  <p className="text-xl font-bold text-surface-900 dark:text-surface-50">
                    {stats.absent}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-surface-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-surface-500 dark:text-surface-400">Late</p>
                  <p className="text-xl font-bold text-surface-900 dark:text-surface-50">
                    {stats.late}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-surface-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                  <Coffee className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-surface-500 dark:text-surface-400">On Leave</p>
                  <p className="text-xl font-bold text-surface-900 dark:text-surface-50">
                    {stats.leave}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-surface-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/30 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-xs text-surface-500 dark:text-surface-400">Total Hours</p>
                  <p className="text-xl font-bold text-surface-900 dark:text-surface-50">
                    {stats.totalHours.toFixed(0)}h
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {viewMode === 'calendar' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar View */}
            <Card className="bg-white dark:bg-surface-900 lg:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => navigateMonth('prev')}
                    className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5 text-surface-600 dark:text-surface-400" />
                  </button>
                  <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
                    {months[month]} {year}
                  </h2>
                  <button
                    onClick={() => navigateMonth('next')}
                    className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors"
                  >
                    <ChevronRight className="h-5 w-5 text-surface-600 dark:text-surface-400" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-12 text-surface-500 dark:text-surface-400">
                    Loading...
                  </div>
                ) : (
                  <>
                    {/* Day headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div
                          key={day}
                          className="text-center text-xs font-medium text-surface-500 dark:text-surface-400 py-2"
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {calendarData.map((day, idx) => {
                        const dateStr = day.isCurrentMonth
                          ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day.date).padStart(2, '0')}`
                          : null;
                        const isSelected = selectedDate === dateStr;

                        return (
                          <button
                            key={idx}
                            onClick={() => dateStr && setSelectedDate(isSelected ? null : dateStr)}
                            disabled={!day.isCurrentMonth}
                            className={`
                              aspect-square p-1 rounded-lg text-sm transition-all relative
                              ${day.isCurrentMonth ? 'hover:bg-surface-100 dark:hover:bg-surface-800' : 'opacity-30 cursor-default'}
                              ${day.isToday ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-surface-900' : ''}
                              ${isSelected ? 'bg-primary-100 dark:bg-primary-950/50' : ''}
                            `}
                          >
                            <span
                              className={`
                              ${day.isCurrentMonth ? 'text-surface-900 dark:text-surface-50' : 'text-surface-400 dark:text-surface-600'}
                              ${day.isToday ? 'font-bold text-primary-600 dark:text-primary-400' : ''}
                            `}
                            >
                              {day.date}
                            </span>
                            {day.record ? (
                              <div
                                className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full ${getCalendarDotColor(day.record.status)}`}
                              />
                            ) : day.isPastWorkday ? (
                              <div
                                className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500"
                              />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-surface-200 dark:border-surface-700">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-xs text-surface-600 dark:text-surface-400">
                          Present
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-xs text-surface-600 dark:text-surface-400">
                          Absent
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                        <span className="text-xs text-surface-600 dark:text-surface-400">Late</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="text-xs text-surface-600 dark:text-surface-400">
                          Leave
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-400" />
                        <span className="text-xs text-surface-600 dark:text-surface-400">
                          Weekly Off
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-pink-500" />
                        <span className="text-xs text-surface-600 dark:text-surface-400">
                          Holiday
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Selected Date Details */}
            <Card className="bg-white dark:bg-surface-900">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-surface-900 dark:text-surface-50">
                  {selectedDate
                    ? new Date(selectedDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'Select a Date'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedRecord ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-surface-500 dark:text-surface-400">Status</span>
                      <span
                        className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedRecord.status)}`}
                      >
                        {selectedRecord.status || 'PRESENT'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-surface-500 dark:text-surface-400">
                        Check In
                      </span>
                      <span className="text-sm font-medium text-surface-900 dark:text-surface-50">
                        {formatTime(selectedRecord.checkInTime)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-surface-500 dark:text-surface-400">
                        Check Out
                      </span>
                      <span className="text-sm font-medium text-surface-900 dark:text-surface-50">
                        {formatTime(selectedRecord.checkOutTime)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-surface-500 dark:text-surface-400">
                        Work Hours
                      </span>
                      <span className="text-sm font-medium text-surface-900 dark:text-surface-50">
                        {selectedRecord.totalWorkHours?.toFixed(2) || '--'} hrs
                      </span>
                    </div>

                    {selectedRecord.isLate && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-surface-500 dark:text-surface-400">
                          Late By
                        </span>
                        <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                          {selectedRecord.lateByMinutes} mins
                        </span>
                      </div>
                    )}

                    {selectedRecord.isRegularization && (
                      <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                          <AlertCircle className="h-4 w-4" />
                          <span>Regularized Entry</span>
                        </div>
                      </div>
                    )}

                    {selectedRecord.notes && (
                      <div className="mt-4 p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
                        <p className="text-xs text-surface-500 dark:text-surface-400 mb-1">Notes</p>
                        <p className="text-sm text-surface-700 dark:text-surface-300">
                          {selectedRecord.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ) : selectedDate ? (
                  <div className="text-center py-8">
                    <XCircle className="h-12 w-12 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
                    <p className="text-surface-500 dark:text-surface-400">
                      No attendance record for this date
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
                    <p className="text-surface-500 dark:text-surface-400">
                      Click on a date to view details
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          /* List View */
          <>
            {/* Month Selector */}
            <Card className="bg-white dark:bg-surface-900">
              <CardContent className="p-6">
                <div className="flex flex-wrap gap-4 items-center">
                  <Calendar className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                  <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
                    Select Period:
                  </label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="px-4 py-2 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
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
                    className="px-4 py-2 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
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

            {/* Attendance Records Table */}
            <Card className="bg-white dark:bg-surface-900">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-surface-900 dark:text-surface-50">
                  Attendance Records
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="text-center py-12 text-surface-500 dark:text-surface-400">
                    Loading...
                  </div>
                ) : records.length === 0 ? (
                  <div className="text-center py-12 text-surface-500 dark:text-surface-400">
                    No attendance records for this month
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-surface-50 dark:bg-surface-800/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                            Check In
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                            Check Out
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                            Work Hours
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                            Remarks
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                        {records.map((record) => (
                          <tr
                            key={record.id}
                            className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
                          >
                            <td className="px-6 py-4 text-sm font-medium text-surface-900 dark:text-surface-50">
                              {new Date(record.attendanceDate).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </td>
                            <td className="px-6 py-4 text-sm text-surface-600 dark:text-surface-400">
                              {formatTime(record.checkInTime)}
                            </td>
                            <td className="px-6 py-4 text-sm text-surface-600 dark:text-surface-400">
                              {formatTime(record.checkOutTime)}
                            </td>
                            <td className="px-6 py-4 text-sm text-surface-600 dark:text-surface-400">
                              {record.totalWorkHours?.toFixed(2) || '--'} hrs
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}
                              >
                                {record.status || 'PRESENT'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-surface-600 dark:text-surface-400">
                              {record.isRegularization && (
                                <span className="text-orange-600 dark:text-orange-400">
                                  Regularized
                                </span>
                              )}
                              {record.isLate && (
                                <span className="text-orange-600 dark:text-orange-400">
                                  Late ({record.lateByMinutes}m)
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </motion.div>
    </AppLayout>
  );
}
