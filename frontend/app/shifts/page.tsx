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
import { ScheduleEntry } from '@/lib/types/shift';
import {
  Calendar,
  List,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  Moon,
  Sun,
  Sunrise,
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shift Management</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Team schedule overview and shift management
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('week')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'week'
                    ? 'bg-sky-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                <Calendar className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-sky-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
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
                className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-sky-300 dark:hover:border-sky-600 transition-colors text-left"
              >
                <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-900/30">
                  <link.icon className="w-5 h-5 text-sky-700 dark:text-sky-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{link.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{link.desc}</p>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Active Shifts Legend */}
          {activeShifts.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Shifts:</span>
              {activeShifts.map((shift) => (
                <div key={shift.id} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: shift.colorCode || '#6B7280' }}
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    {shift.shiftCode} ({formatTime(shift.startTime)}-{formatTime(shift.endTime)})
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Week Navigation */}
          <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <button
              onClick={() => setCurrentWeekOffset((p) => p - 1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="text-center">
              <p className="font-semibold text-gray-900 dark:text-white">
                {dates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
                {dates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              <button
                onClick={() => setCurrentWeekOffset(0)}
                className="text-xs text-sky-700 dark:text-sky-400 hover:underline"
              >
                Today
              </button>
            </div>
            <button
              onClick={() => setCurrentWeekOffset((p) => p + 1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          {/* Schedule Grid */}
          {isLoading ? (
            <NuAuraLoader />
          ) : scheduleByEmployee.length === 0 ? (
            <EmptyState
              icon={<Users className="w-12 h-12 text-gray-400" />}
              title="No Schedule Data"
              description="No shift assignments found for this week. Generate a schedule or assign shifts to team members."
            />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 text-sm font-medium text-gray-500 dark:text-gray-400 w-48">
                      Employee
                    </th>
                    {dates.map((d) => {
                      const isToday = d.toDateString() === new Date().toDateString();
                      return (
                        <th
                          key={d.toISOString()}
                          className={`text-center p-3 text-sm font-medium ${
                            isToday
                              ? 'text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20'
                              : 'text-gray-500 dark:text-gray-400'
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
                      className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    >
                      <td className="p-3">
                        <p className="font-medium text-sm text-gray-900 dark:text-white">{name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{code}</p>
                      </td>
                      {dates.map((d) => {
                        const dateStr = d.toISOString().split('T')[0];
                        const entry = entries.get(dateStr);
                        const isToday = d.toDateString() === new Date().toDateString();

                        return (
                          <td
                            key={dateStr}
                            className={`p-2 text-center ${isToday ? 'bg-sky-50/50 dark:bg-sky-900/10' : ''}`}
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
                              <span className="text-xs text-gray-300 dark:text-gray-600">OFF</span>
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
