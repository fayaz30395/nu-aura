'use client';

import React from 'react';
import {cn} from '@/lib/utils';
import {WorkloadSummary} from '@/lib/types/hrms/resource-management';

interface WorkloadSummaryStatsProps {
  summary: WorkloadSummary;
  className?: string;
}

/**
 * Summary statistics - clean horizontal layout
 */
export function WorkloadSummaryStats({summary, className}: WorkloadSummaryStatsProps) {
  return (
    <div className={cn('flex items-center gap-6 border-b border-subtle pb-4', className)}>
      <StatItem
        label="Total"
        value={summary.totalEmployees}
      />
      <div className='h-8 w-px bg-elevated'/>
      <StatItem
        label="Avg"
        value={`${Math.round(summary.averageAllocation)}%`}
      />
      <div className='h-8 w-px bg-elevated'/>
      <StatItem
        label="Over"
        value={summary.overAllocatedCount}
        color="text-danger-600 dark:text-danger-400"
        highlight={summary.overAllocatedCount > 0}
      />
      <StatItem
        label="Optimal"
        value={summary.optimalCount}
        color="text-success-600 dark:text-success-400"
      />
      <StatItem
        label="Under"
        value={summary.underUtilizedCount}
        color="text-warning-600 dark:text-warning-400"
      />
      <StatItem
        label="Unassigned"
        value={summary.unassignedCount}
        color="text-surface-500 dark:text-surface-400"
      />
      {summary.pendingApprovals > 0 && (
        <>
          <div className='h-8 w-px bg-elevated'/>
          <StatItem
            label="Pending"
            value={summary.pendingApprovals}
            color="text-accent-800 dark:text-accent-600"
            highlight
          />
        </>
      )}
    </div>
  );
}

interface StatItemProps {
  label: string;
  value: string | number;
  color?: string;
  highlight?: boolean;
}

function StatItem({label, value, color, highlight}: StatItemProps) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={cn(
        'text-xl font-semibold tabular-nums',
        color || 'text-primary',
        highlight && 'animate-pulse'
      )}>
        {value}
      </span>
      <span className='text-xs text-muted'>
        {label}
      </span>
    </div>
  );
}

export default WorkloadSummaryStats;
