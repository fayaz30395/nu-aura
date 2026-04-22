'use client';

import {useMemo} from 'react';
import {useAttendanceByDateRange, useHolidaysByYear} from '@/lib/hooks/queries/useAttendance';
import type {AttendanceRecord, Holiday} from '@/lib/types/hrms/attendance';
import {getDateOffsetString, getLocalDateString, getMonthStartString} from '@/lib/utils/dateUtils';
import {
  calculateHours,
  computeMonthStats,
  computeStreak,
  computeWeekStats,
  formatTime,
  STANDARD_WORK_HOURS,
} from '../utils';
import type {ChartEntry} from '../AttendanceWeeklyChart';

export interface AttendanceState {
  todayStr: string;
  todayRecord: AttendanceRecord | null;
  weeklyRecords: AttendanceRecord[];
  monthlyRecords: AttendanceRecord[];
  holidays: Holiday[];
  streak: number;
  monthStats: ReturnType<typeof computeMonthStats>;
  weekStats: ReturnType<typeof computeWeekStats>;
  chartData: ChartEntry[];
  upcomingHolidays: Holiday[];
  dataLoading: boolean;
}

export function useAttendanceState(enabled: boolean): AttendanceState {
  const todayStr = getLocalDateString();
  const lastWeekStr = getDateOffsetString(-6);

  const now = new Date();
  const monthStartStr = getMonthStartString(now.getFullYear(), now.getMonth());
  const currentYear = now.getFullYear();

  const {data: todayData, isLoading: todayLoading} = useAttendanceByDateRange(todayStr, todayStr, enabled);
  const {data: weeklyData, isLoading: weeklyLoading} = useAttendanceByDateRange(lastWeekStr, todayStr, enabled);
  const {data: monthlyData} = useAttendanceByDateRange(monthStartStr, todayStr, enabled);
  const {data: holidaysData} = useHolidaysByYear(currentYear);

  const todayRecord: AttendanceRecord | null = todayData?.[0] ?? null;
  const weeklyRecords = useMemo<AttendanceRecord[]>(() => weeklyData ?? [], [weeklyData]);
  const monthlyRecords = useMemo<AttendanceRecord[]>(() => monthlyData ?? [], [monthlyData]);
  const holidays = useMemo<Holiday[]>(() => holidaysData ?? [], [holidaysData]);

  const streak = useMemo(() => computeStreak(monthlyRecords), [monthlyRecords]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const monthStats = useMemo(() => computeMonthStats(monthlyRecords, now), [monthlyRecords]);
  const weekStats = useMemo(() => computeWeekStats(weeklyRecords), [weeklyRecords]);

  const holidaySet = useMemo(() => new Set(holidays.map((h) => h.holidayDate)), [holidays]);

  const chartData: ChartEntry[] = useMemo(() => {
    const days: ChartEntry[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = getLocalDateString(d);
      const dayName = d.toLocaleDateString('en-US', {weekday: 'short'});
      const record = weeklyRecords.find((r) => r.attendanceDate === dateStr);
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
      .filter((h) => new Date(h.holidayDate + 'T00:00:00') >= new Date(todayStr + 'T00:00:00'))
      .sort((a, b) => a.holidayDate.localeCompare(b.holidayDate))
      .slice(0, 3);
  }, [holidays, todayStr]);

  return {
    todayStr,
    todayRecord,
    weeklyRecords,
    monthlyRecords,
    holidays,
    streak,
    monthStats,
    weekStats,
    chartData,
    upcomingHolidays,
    dataLoading: todayLoading || weeklyLoading,
  };
}
