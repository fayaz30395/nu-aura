'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, AlertTriangle, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { MonthStats } from './utils';

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
  const stats: Array<{ label: string; value: number | string; total: number | null; icon: React.ElementType; color: string; textColor: string; tintClass: string }> = [
    { label: 'Present', value: monthStats.present, total: monthStats.businessDays, icon: CheckCircle, color: 'from-emerald-500 to-green-600', textColor: 'text-emerald-600 dark:text-emerald-400', tintClass: 'tint-success' },
    { label: 'Absent', value: monthStats.absent, total: monthStats.businessDays, icon: AlertCircle, color: 'from-red-500 to-rose-600', textColor: 'text-red-600 dark:text-red-400', tintClass: 'tint-danger' },
    { label: 'Late Arrivals', value: monthStats.late, total: monthStats.present, icon: AlertTriangle, color: 'from-amber-500 to-orange-600', textColor: 'text-amber-600 dark:text-amber-400', tintClass: 'tint-warning' },
    { label: 'Overtime', value: `${monthStats.overtimeTotal.toFixed(1)}h`, total: null, icon: Zap, color: 'from-blue-500 to-cyan-600', textColor: 'text-blue-600 dark:text-blue-400', tintClass: 'tint-info' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut', delay: idx * 0.06 }}
        >
          <Card className="skeuo-card card-interactive border border-[var(--border-main)] hover:shadow-lg transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-md`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
                {stat.total !== null && (
                  <span className="text-xs font-medium text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full">/ {stat.total}</span>
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
