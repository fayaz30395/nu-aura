'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { WorkloadSummary } from '@/lib/types/resource-management';

interface WorkloadSummaryStatsProps {
  summary: WorkloadSummary;
  className?: string;
}

/**
 * Summary statistics - clean horizontal layout
 */
export function WorkloadSummaryStats({ summary, className }: WorkloadSummaryStatsProps) {
  return (
    <div className={cn('flex items-center gap-6 border-b border-surface-200 pb-4 dark:border-surface-700', className)}>
      <StatItem
        label="Total"
        value={summary.totalEmployees}
      />
      <div className="h-8 w-px bg-surface-200 dark:bg-surface-700" />
      <StatItem
        label="Avg"
        value={`${Math.round(summary.averageAllocation)}%`}
      />
      <div className="h-8 w-px bg-surface-200 dark:bg-surface-700" />
      <StatItem
        label="Over"
        value={summary.overAllocatedCount}
        color="text-red-600 dark:text-red-400"
        highlight={summary.overAllocatedCount > 0}
      />
      <StatItem
        label="Optimal"
        value={summary.optimalCount}
        color="text-green-600 dark:text-green-400"
      />
      <StatItem
        label="Under"
        value={summary.underUtilizedCount}
        color="text-amber-600 dark:text-amber-400"
      />
      <StatItem
        label="Unassigned"
        value={summary.unassignedCount}
        color="text-surface-500 dark:text-surface-400"
      />
      {summary.pendingApprovals > 0 && (
        <>
          <div className="h-8 w-px bg-surface-200 dark:bg-surface-700" />
          <StatItem
            label="Pending"
            value={summary.pendingApprovals}
            color="text-purple-600 dark:text-purple-400"
            highlight
          />
        </>
      )}
    </div>
  );
}

function StatItem({
  label,
  value,
  color,
  highlight
}: {
  label: string;
  value: string | number;
  color?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={cn(
        'text-xl font-semibold tabular-nums',
        color || 'text-surface-900 dark:text-surface-50',
        highlight && 'animate-pulse'
      )}>
        {value}
      </span>
      <span className="text-xs text-surface-500 dark:text-surface-400">
        {label}
      </span>
    </div>
  );
}

export default WorkloadSummaryStats;
