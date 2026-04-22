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
    color: string;
    textColor: string;
    tintClass: string
  }> = [
    {
      label: 'Present',
      value: monthStats.present,
      total: monthStats.businessDays,
      icon: CheckCircle,
      color: 'from-success-500 to-success-600',
      textColor: "text-status-success-text",
      tintClass: 'tint-success'
    },
    {
      label: 'Absent',
      value: monthStats.absent,
      total: monthStats.businessDays,
      icon: AlertCircle,
      color: 'from-danger-500 to-danger-600',
      textColor: "text-status-danger-text",
      tintClass: 'tint-danger'
    },
    {
      label: 'Late Arrivals',
      value: monthStats.late,
      total: monthStats.present,
      icon: AlertTriangle,
      color: 'from-warning-500 to-warning-600',
      textColor: "text-status-warning-text",
      tintClass: 'tint-warning'
    },
    {
      label: 'Overtime',
      value: `${monthStats.overtimeTotal.toFixed(1)}h`,
      total: null,
      icon: Zap,
      color: 'from-accent-500 to-accent-600',
      textColor: "text-accent",
      tintClass: 'tint-info'
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
            className="skeuo-card card-interactive border border-[var(--border-main)] hover:shadow-[var(--shadow-dropdown)] transition-all">
            <CardContent className="p-4">
              <div className="row-between mb-2">
                <div
                  className={`h-10 w-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-[var(--shadow-elevated)]`}>
                  <stat.icon className='h-5 w-5 text-inverse'/>
                </div>
                {stat.total !== null && (
                  <span
                    className="text-xs font-medium text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full">/ {stat.total}</span>
                )}
              </div>
              <div className={`text-stat-large tabular-nums ${stat.textColor} skeuo-emboss`}>{stat.value}</div>
              <div className="text-xs font-semibold text-[var(--text-secondary)] mt-1 skeuo-deboss">{stat.label}</div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
});
