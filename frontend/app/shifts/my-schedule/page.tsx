'use client';

import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/hooks/useAuth';
import { useEmployeeSchedule } from '@/lib/hooks/queries/useShifts';
import { NuAuraLoader } from '@/components/ui/Loading';
import { ScheduleEntry } from '@/lib/types/hrms/shift';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Moon,
  Sun,
  ArrowLeftRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

function getMonthDates(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7; // Monday start
  const dates: (Date | null)[] = [];

  for (let i = 0; i < startPad; i++) dates.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) dates.push(new Date(year, month, d));
  while (dates.length % 7 !== 0) dates.push(null);

  return {
    dates,
    start: `${year}-${String(month + 1).padStart(2, '0')}-01`,
    end: `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`,
  };
}

function formatTime(time: string | undefined): string {
  if (!time) return '';
  const parts = time.split(':');
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export default function MySchedulePage() {
  const router = useRouter();
  const { user } = useAuth();
  const employeeId = user?.employeeId ?? '';

  const [monthOffset, setMonthOffset] = useState(0);

  const { year, month } = useMemo(() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  }, [monthOffset]);

  const { dates, start, end } = useMemo(() => getMonthDates(year, month), [year, month]);

  const { data: schedule = [], isLoading } = useEmployeeSchedule(employeeId, start, end, !!employeeId);

  const scheduleMap = useMemo(() => {
    const m = new Map<string, ScheduleEntry>();
    schedule.forEach((e) => m.set(e.date, e));
    return m;
  }, [schedule]);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Upcoming shifts (next 7 days)
  const upcomingShifts = useMemo(() => {
    return schedule
      .filter((e) => e.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 7);
  }, [schedule, todayStr]);

  const monthName = new Date(year, month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/shifts')}
              className="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5 text-surface-600 dark:text-surface-300" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-surface-900 dark:text-white">My Schedule</h1>
              <p className="text-sm text-surface-500 dark:text-surface-400">
                Your personal shift calendar
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/shifts/swaps')}
            className="flex items-center gap-2 px-4 py-2 bg-accent-700 hover:bg-accent-800 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Swap Request
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-4">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setMonthOffset((p) => p - 1)}
                className="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5 text-surface-600 dark:text-surface-300" />
              </button>
              <div className="text-center">
                <h2 className="font-semibold text-surface-900 dark:text-white">{monthName}</h2>
                <button
                  onClick={() => setMonthOffset(0)}
                  className="text-xs text-accent-700 dark:text-accent-400 hover:underline"
                >
                  Today
                </button>
              </div>
              <button
                onClick={() => setMonthOffset((p) => p + 1)}
                className="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg"
              >
                <ChevronRight className="w-5 h-5 text-surface-600 dark:text-surface-300" />
              </button>
            </div>

            {isLoading ? (
              <NuAuraLoader />
            ) : (
              <>
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                    <div
                      key={d}
                      className="text-center text-xs font-medium text-surface-500 dark:text-surface-400 py-2"
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {dates.map((date, idx) => {
                    if (!date) {
                      return <div key={`empty-${idx}`} className="h-20" />;
                    }

                    const dateStr = date.toISOString().split('T')[0];
                    const entry = scheduleMap.get(dateStr);
                    const isToday = dateStr === todayStr;
                    const isPast = date < today && !isToday;

                    return (
                      <div
                        key={dateStr}
                        className={`h-20 rounded-lg border p-1.5 ${
                          isToday
                            ? 'border-accent-700 bg-accent-50 dark:bg-accent-900/20'
                            : isPast
                              ? 'border-surface-100 dark:border-surface-700/50 opacity-60'
                              : 'border-surface-100 dark:border-surface-700/50'
                        }`}
                      >
                        <p
                          className={`text-xs font-medium mb-1 ${
                            isToday ? 'text-accent-700 dark:text-accent-400' : 'text-surface-500 dark:text-surface-400'
                          }`}
                        >
                          {date.getDate()}
                        </p>
                        {entry ? (
                          <div
                            className="rounded px-1 py-0.5 text-white text-xs font-medium"
                            style={{ backgroundColor: entry.colorCode || '#6B7280' }}
                          >
                            <div>{entry.shiftCode}</div>
                            <div className="opacity-80 text-2xs">
                              {formatTime(entry.startTime)}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-surface-300 dark:text-surface-600">OFF</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Upcoming Shifts Sidebar */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-4">
              <h3 className="font-semibold text-surface-900 dark:text-white mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent-700 dark:text-accent-400" />
                Upcoming Shifts
              </h3>
              {upcomingShifts.length === 0 ? (
                <p className="text-sm text-surface-400">No upcoming shifts</p>
              ) : (
                <div className="space-y-2">
                  {upcomingShifts.map((entry) => {
                    const d = new Date(entry.date + 'T00:00:00');
                    const isToday = entry.date === todayStr;

                    return (
                      <motion.div
                        key={entry.assignmentId}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex items-center gap-4 p-4 rounded-lg ${
                          isToday
                            ? 'bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800'
                            : 'bg-surface-50 dark:bg-surface-700/30'
                        }`}
                      >
                        <div
                          className="w-1.5 h-10 rounded-full flex-shrink-0"
                          style={{ backgroundColor: entry.colorCode || '#6B7280' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-surface-900 dark:text-white">
                            {entry.shiftName}
                            {isToday && (
                              <span className="ml-2 text-xs text-accent-700 dark:text-accent-400 font-normal">
                                Today
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-surface-500 dark:text-surface-400">
                            {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            {' '}
                            {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                          </p>
                        </div>
                        {entry.isNightShift ? (
                          <Moon className="w-4 h-4 text-accent-500 flex-shrink-0" />
                        ) : (
                          <Sun className="w-4 h-4 text-warning-500 flex-shrink-0" />
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-4">
              <h3 className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-2">Legend</h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <Moon className="w-3.5 h-3.5 text-accent-500" />
                  <span className="text-surface-600 dark:text-surface-300">Night shift</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sun className="w-3.5 h-3.5 text-warning-500" />
                  <span className="text-surface-600 dark:text-surface-300">Day shift</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-surface-200 dark:bg-surface-600" />
                  <span className="text-surface-600 dark:text-surface-300">Day off</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
