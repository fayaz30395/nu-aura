'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { History, ClipboardCheck, Users, CalendarDays, Coffee, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { AttendanceRecord, Holiday } from '@/lib/types/hrms/attendance';
import { STANDARD_WORK_HOURS, calculateHours, WeekStats } from './utils';

// ─── Quick Action Links ───────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { href: '/attendance/my-attendance', icon: History, title: 'Attendance History', desc: 'View complete records & calendar', gradient: 'from-accent-500 to-accent-600', hoverColor: 'group-hover:text-accent-600 dark:group-hover:text-accent-400' },
  { href: '/attendance/regularization', icon: ClipboardCheck, title: 'Regularization', desc: 'Request corrections', gradient: 'from-accent-500 to-accent-600', hoverColor: 'group-hover:text-accent-600 dark:group-hover:text-accent-400' },
  { href: '/attendance/team', icon: Users, title: 'Team Attendance', desc: 'Monitor your team', gradient: 'from-accent-500 to-accent-600', hoverColor: 'group-hover:text-accent-600 dark:group-hover:text-accent-400' },
] as const;

export const AttendanceQuickActions = memo(function AttendanceQuickActions() {
  return (
    <>
      {QUICK_ACTIONS.map((action, idx) => (
        <motion.div
          key={action.href}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut', delay: idx * 0.06 }}
        >
          <Link href={action.href} className="block group">
            <Card className="skeuo-card card-interactive border border-[var(--border-main)] hover:shadow-lg transition-all cursor-pointer hover:-translate-y-0.5">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all`}>
                    <action.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-bold text-[var(--text-primary)] ${action.hoverColor} transition-colors`}>{action.title}</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{action.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-accent-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      ))}
    </>
  );
});

// ─── Upcoming Holidays ────────────────────────────────────────────────────────

interface UpcomingHolidaysProps {
  holidays: Holiday[];
  todayStr: string;
}

export const AttendanceUpcomingHolidays = memo(function AttendanceUpcomingHolidays({
  holidays,
  todayStr,
}: UpcomingHolidaysProps) {
  if (!holidays.length) return null;

  return (
    <Card className="skeuo-card card-aura border border-[var(--border-main)] shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-sm">
            <CalendarDays className="h-3.5 w-3.5 text-white" />
          </div>
          <h4 className="text-sm font-bold text-[var(--text-primary)] skeuo-emboss">Upcoming Holidays</h4>
        </div>
        <div className="space-y-2">
          {holidays.map(h => {
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
                  daysAway === 0 ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400' :
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
  );
});

// ─── This Week Progress ───────────────────────────────────────────────────────

interface WeekProgressProps {
  weekStats: WeekStats;
  weeklyRecords: AttendanceRecord[];
}

export const AttendanceWeekProgress = memo(function AttendanceWeekProgress({
  weekStats,
  weeklyRecords,
}: WeekProgressProps) {
  const totalWeekHours = weeklyRecords.reduce(
    (acc, r) => acc + calculateHours(r.checkInTime, r.checkOutTime), 0
  );

  return (
    <Card className="skeuo-card card-aura border border-[var(--border-main)] shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-sm">
            <Coffee className="h-3.5 w-3.5 text-white" />
          </div>
          <h4 className="text-sm font-bold text-[var(--text-primary)] skeuo-emboss">This Week</h4>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-[var(--text-secondary)]">Present Days</span>
              <span className="font-bold text-success-600 dark:text-success-400">{weekStats.presentDays}/5</span>
            </div>
            <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-success-500 to-success-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (weekStats.presentDays / 5) * 100)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-[var(--text-secondary)]">Total Hours</span>
              <span className="font-bold text-accent-700 dark:text-accent-400">
                {totalWeekHours.toFixed(1)}h / {STANDARD_WORK_HOURS * 5}h
              </span>
            </div>
            <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent-500 to-accent-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (totalWeekHours / (STANDARD_WORK_HOURS * 5)) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
