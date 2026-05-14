'use client';

import React, {memo} from 'react';
import {motion} from 'framer-motion';
import {AlertCircle, AlertTriangle, CheckCircle, Zap} from 'lucide-react';
import {Card, CardContent} from '@/components/ui/Card';
import {MonthStats} from './utils';

interface AttendanceMonthlyStatsProps {
  monthStats: MonthStats;
}

/**
 * Four stat cards showing monthly attendance KPIs.
 * Memoized — only re-renders when monthStats change.
 */
export const AttendanceMonthlyStats = memo(function AttendanceMonthlyStats({
                                                                             monthStats,
                                                                           }: AttendanceMonthlyStatsProps) {
  const stats: Array<{
    label: string;
    value: number | string;
    total: number | null;
    icon: React.ElementType;
    bg: string;
    text: string;
  }> = [
    {
      label: 'Present',
      value: monthStats.present,
      total: monthStats.businessDays,
      icon: CheckCircle,
      bg: 'bg-success-100 dark:bg-success-500/10',
      text: 'text-success-600 dark:text-success-400',
    },
    {
      label: 'Absent',
      value: monthStats.absent,
      total: monthStats.businessDays,
      icon: AlertCircle,
      bg: 'bg-danger-100 dark:bg-danger-500/10',
      text: 'text-danger-600 dark:text-danger-400',
    },
    {
      label: 'Late Arrivals',
      value: monthStats.late,
      total: monthStats.present,
      icon: AlertTriangle,
      bg: 'bg-warning-100 dark:bg-warning-500/10',
      text: 'text-warning-600 dark:text-warning-400',
    },
    {
      label: 'Overtime',
      value: `${monthStats.overtimeTotal.toFixed(1)}h`,
      total: null,
      icon: Zap,
      bg: 'bg-accent-100 dark:bg-accent-500/10',
      text: 'text-accent-600 dark:text-accent-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{opacity: 0, y: 8}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.25, ease: 'easeOut', delay: idx * 0.06}}
        >
          <Card
            className="skeuo-card card-interactive border border-[var(--border-main)]">
            <CardContent className="p-4">
              <div className="row-between mb-2">
                <div
                  className={`h-10 w-10 rounded-xl ${stat.bg} ${stat.text} flex items-center justify-center`}>
                  <stat.icon className="h-5 w-5"/>
                </div>
                {stat.total !== null && (
                  <span
                    className="text-xs font-medium text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full">/ {stat.total}</span>
                )}
              </div>
              <div className={`text-stat-large tabular-nums ${stat.text}`}>{stat.value}</div>
              <div className="text-xs font-semibold text-[var(--text-secondary)] mt-1">{stat.label}</div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
});
