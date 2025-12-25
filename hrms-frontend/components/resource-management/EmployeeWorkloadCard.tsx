'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  EmployeeWorkload,
  getAllocationStatusColor,
  getAllocationStatusLabel,
  formatAllocationPercentage,
  ALLOCATION_THRESHOLDS,
} from '@/lib/types/resource-management';
import { User, Briefcase, Clock, AlertTriangle, ChevronRight } from 'lucide-react';

interface EmployeeWorkloadCardProps {
  workload: EmployeeWorkload;
  onViewDetails?: () => void;
  showProjects?: boolean;
  className?: string;
}

/**
 * Card displaying an employee's workload summary
 */
export function EmployeeWorkloadCard({
  workload,
  onViewDetails,
  showProjects = true,
  className,
}: EmployeeWorkloadCardProps) {
  const statusColor = getAllocationStatusColor(workload.allocationStatus);
  const statusLabel = getAllocationStatusLabel(workload.allocationStatus);
  const isOverAllocated = workload.totalAllocation > ALLOCATION_THRESHOLDS.OVER_ALLOCATED;

  return (
    <div
      className={cn(
        'rounded-xl border bg-white p-4 transition-all dark:bg-surface-800',
        isOverAllocated
          ? 'border-red-200 dark:border-red-800'
          : 'border-surface-200 dark:border-surface-700',
        onViewDetails && 'cursor-pointer hover:shadow-md',
        className
      )}
      onClick={onViewDetails}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full',
              isOverAllocated
                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400'
            )}
          >
            <User className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium text-surface-900 dark:text-surface-50">
              {workload.employeeName}
            </h3>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              {workload.designation || workload.employeeCode}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2">
          {workload.hasPendingApprovals && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <Clock className="h-3 w-3" />
              Pending
            </span>
          )}
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{
              backgroundColor: `${statusColor}20`,
              color: statusColor,
            }}
          >
            {isOverAllocated && <AlertTriangle className="h-3 w-3" />}
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Allocation gauge */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-surface-600 dark:text-surface-400">Total Allocation</span>
          <span
            className="font-semibold"
            style={{ color: statusColor }}
          >
            {formatAllocationPercentage(workload.totalAllocation)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
          <div
            className={cn(
              'absolute left-0 top-0 h-full rounded-full transition-all',
              isOverAllocated ? 'bg-red-500' : 'bg-green-500'
            )}
            style={{
              width: `${Math.min((workload.totalAllocation / 150) * 100, 100)}%`,
            }}
          />
          {/* 100% marker */}
          <div
            className="absolute top-0 h-full w-0.5 bg-surface-500"
            style={{ left: '66.67%' }}
          />
        </div>
      </div>

      {/* Project allocations */}
      {showProjects && workload.allocations.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-surface-500 dark:text-surface-400">
            Projects ({workload.projectCount})
          </p>
          <div className="space-y-1.5">
            {workload.allocations.slice(0, 3).map((allocation) => (
              <div
                key={allocation.projectId}
                className="flex items-center justify-between rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-700/50"
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5 text-surface-400" />
                  <span className="text-sm text-surface-700 dark:text-surface-300">
                    {allocation.projectName}
                  </span>
                  {allocation.isPendingApproval && (
                    <Clock className="h-3 w-3 text-amber-500" />
                  )}
                </div>
                <span className="text-sm font-medium text-surface-900 dark:text-surface-50">
                  {formatAllocationPercentage(allocation.allocationPercentage)}
                </span>
              </div>
            ))}
            {workload.allocations.length > 3 && (
              <p className="text-center text-xs text-surface-500 dark:text-surface-400">
                +{workload.allocations.length - 3} more projects
              </p>
            )}
          </div>
        </div>
      )}

      {/* View details link */}
      {onViewDetails && (
        <div className="mt-4 flex items-center justify-end">
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400">
            View Details
            <ChevronRight className="h-4 w-4" />
          </span>
        </div>
      )}
    </div>
  );
}

export default EmployeeWorkloadCard;
