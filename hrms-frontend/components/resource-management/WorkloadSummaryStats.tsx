'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { WorkloadSummary, formatAllocationPercentage } from '@/lib/types/resource-management';
import { Users, Briefcase, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';

interface WorkloadSummaryStatsProps {
  summary: WorkloadSummary;
  className?: string;
}

/**
 * Summary statistics cards for the workload dashboard
 */
export function WorkloadSummaryStats({ summary, className }: WorkloadSummaryStatsProps) {
  const stats = [
    {
      label: 'Total Employees',
      value: summary.totalEmployees,
      icon: Users,
      color: 'text-primary-600 dark:text-primary-400',
      bgColor: 'bg-primary-100 dark:bg-primary-900/30',
    },
    {
      label: 'Avg Allocation',
      value: formatAllocationPercentage(summary.averageAllocation),
      icon: TrendingUp,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Over Allocated',
      value: summary.overAllocatedCount,
      icon: AlertTriangle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      highlight: summary.overAllocatedCount > 0,
    },
    {
      label: 'Optimally Allocated',
      value: summary.optimalCount,
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Under Utilized',
      value: summary.underUtilizedCount,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      label: 'Pending Approvals',
      value: summary.pendingApprovals,
      icon: Clock,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      highlight: summary.pendingApprovals > 0,
    },
  ];

  return (
    <div className={cn('grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6', className)}>
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={cn(
              'rounded-xl border bg-white p-4 dark:bg-surface-800',
              stat.highlight
                ? 'border-red-200 dark:border-red-800'
                : 'border-surface-200 dark:border-surface-700'
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn('rounded-lg p-2', stat.bgColor)}>
                <Icon className={cn('h-5 w-5', stat.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                  {stat.value}
                </p>
                <p className="text-xs text-surface-500 dark:text-surface-400">{stat.label}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default WorkloadSummaryStats;
