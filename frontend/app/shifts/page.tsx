'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTeamSchedule, useActiveShiftDefinitions } from '@/lib/hooks/queries/useShifts';
import { NuAuraLoader } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScheduleEntry } from '@/lib/types/hrms/shift';
import {
  Calendar,
  List,
  ChevronLeft,
  ChevronRight,
  Users,
  Settings,
  ArrowLeftRight,
  CalendarDays,
} from 'lucide-react';
import { motion } from 'framer-motion';

function getWeekDates(baseDate: Date): { start: string; end: string; dates: Date[] } {
  const d = new Date(baseDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const monday = new Date(d.setDate(diff));
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    dates.push(dt);
  }
  return {
    start: dates[0].toISOString().split('T')[0],
    end: dates[6].toISOString().split('T')[0],
    dates,
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

export default function ShiftDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'week' | 'list'>('week');
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  const baseDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + currentWeekOffset * 7);
    return d;
  }, [currentWeekOffset]);

  const { start, end, dates } = useMemo(() => getWeekDates(baseDate), [baseDate]);

  const managerId = user?.employeeId ?? '';
  const { data: scheduleData = [], isLoading } = useTeamSchedule(managerId, start, end, !!managerId);
  const { data: activeShifts = [] } = useActiveShiftDefinitions();

  // Group schedule by employee
  const scheduleByEmployee = useMemo(() => {
    const map = new Map<string, { name: string; code: string; entries: Map<string, ScheduleEntry> }>();
    scheduleData.forEach((entry) => {
      if (!map.has(entry.employeeId)) {
        map.set(entry.employeeId, {
          name: entry.employeeName,
          code: entry.employeeCode,
          entries: new Map(),
        });
      }
      map.get(entry.employeeId)!.entries.set(entry.date, entry);
    });
    return Array.from(map.entries());
  }, [scheduleData]);

  const quickLinks = [
    { label: 'Definitions', href: '/shifts/definitions', icon: Settings, desc: 'Manage shift types' },
    { label: 'Patterns', href: '/shifts/patterns', icon: CalendarDays, desc: 'Rotation patterns' },
    { label: 'My Schedule', href: '/shifts/my-schedule', icon: Calendar, desc: 'Personal schedule' },
    { label: 'Swap Requests', href: '/shifts/swaps', icon: ArrowLeftRight, desc: 'Shift swaps' },
  ];

  return (
    <AppLayout>
      <PermissionGate anyOf={[Permissions.SHIFT_VIEW, Permissions.ATTENDANCE_VIEW_TEAM]}>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Shift Management</h1>
              <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                Team schedule overview and shift management
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('week')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'week'
                    ? 'bg-accent-700 text-white'
                    : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300'
                }`}
              >
                <Calendar className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-accent-700 text-white'
                    : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickLinks.map((link) => (
              <motion.button
                key={link.href}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(link.href)}
                className="flex items-center gap-4 p-4 bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-accent-300 dark:hover:border-accent-600 transition-colors text-left"
              >
                <div className="p-2 rounded-lg bg-accent-50 dark:bg-accent-900/30">
                  <link.icon className="w-5 h-5 text-accent-700 dark:text-accent-400" />
                </div>
                <div>
                  <p className="font-medium text-surface-900 dark:text-white text-sm">{link.label}</p>
                  <p className="text-xs text-surface-500 dark:text-surface-400">{link.desc}</p>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Active Shifts Legend */}
          {activeShifts.length > 0 && (
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-xs font-medium text-surface-500 dark:text-surface-400">Shifts:</span>
              {activeShifts.map((shift) => (
                <div key={shift.id} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: shift.colorCode || '#6B7280' }}
                  />
                  <span className="text-xs text-surface-600 dark:text-surface-300">
                    {shift.shiftCode} ({formatTime(shift.startTime)}-{formatTime(shift.endTime)})
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Week Navigation */}
          <div className="flex items-center justify-between bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-4">
            <button
              onClick={() => setCurrentWeekOffset((p) => p - 1)}
              className="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-surface-600 dark:text-surface-300" />
            </button>
            <div className="text-center">
              <p className="font-semibold text-surface-900 dark:text-white">
                {dates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
                {dates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              <button
                onClick={() => setCurrentWeekOffset(0)}
                className="text-xs text-accent-700 dark:text-accent-400 hover:underline"
              >
                Today
              </button>
            </div>
            <button
              onClick={() => setCurrentWeekOffset((p) => p + 1)}
              className="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-surface-600 dark:text-surface-300" />
            </button>
          </div>

          {/* Schedule Grid */}
          {isLoading ? (
            <NuAuraLoader />
          ) : scheduleByEmployee.length === 0 ? (
            <EmptyState
              icon={<Users className="w-12 h-12 text-surface-400" />}
              title="No Schedule Data"
              description="No shift assignments found for this week. Generate a schedule or assign shifts to team members."
            />
          ) : (
            <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700">
                    <th className="text-left p-4 text-sm font-medium text-surface-500 dark:text-surface-400 w-48">
                      Employee
                    </th>
                    {dates.map((d) => {
                      const isToday = d.toDateString() === new Date().toDateString();
                      return (
                        <th
                          key={d.toISOString()}
                          className={`text-center p-4 text-sm font-medium ${
                            isToday
                              ? 'text-accent-700 dark:text-accent-400 bg-accent-50 dark:bg-accent-900/20'
                              : 'text-surface-500 dark:text-surface-400'
                          }`}
                        >
                          <div>{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                          <div className="text-xs">{d.getDate()}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {scheduleByEmployee.map(([empId, { name, code, entries }]) => (
                    <tr
                      key={empId}
                      className="h-11 border-b border-surface-100 dark:border-surface-700/50 hover:bg-surface-50 dark:hover:bg-surface-700/30"
                    >
                      <td className="p-4">
                        <p className="font-medium text-sm text-surface-900 dark:text-white">{name}</p>
                        <p className="text-xs text-surface-500 dark:text-surface-400">{code}</p>
                      </td>
                      {dates.map((d) => {
                        const dateStr = d.toISOString().split('T')[0];
                        const entry = entries.get(dateStr);
                        const isToday = d.toDateString() === new Date().toDateString();

                        return (
                          <td
                            key={dateStr}
                            className={`p-2 text-center ${isToday ? 'bg-accent-50/50 dark:bg-accent-900/10' : ''}`}
                          >
                            {entry ? (
                              <div
                                className="inline-flex flex-col items-center px-2 py-1 rounded-lg text-white text-xs font-medium"
                                style={{
                                  backgroundColor: entry.colorCode || '#6B7280',
                                }}
                              >
                                <span>{entry.shiftCode}</span>
                                <span className="opacity-80">
                                  {formatTime(entry.startTime)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-surface-300 dark:text-surface-600">OFF</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PermissionGate>
    </AppLayout>
  );
}
