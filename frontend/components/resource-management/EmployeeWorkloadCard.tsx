'use client';

import React, {useMemo} from 'react';
import {cn} from '@/lib/utils';
import {
  ALLOCATION_THRESHOLDS,
  AllocationStatus,
  EmployeeWorkload,
  getAllocationStatusColor,
} from '@/lib/types/hrms/resource-management';

interface EmployeeWorkloadCardProps {
  workload: EmployeeWorkload;
  onViewDetails?: () => void;
  showProjects?: boolean;
  className?: string;
}

/**
 * Clean, minimal employee workload row/card
 */
export function EmployeeWorkloadCard({
                                       workload,
                                       onViewDetails,
                                       showProjects = true,
                                       className,
                                     }: EmployeeWorkloadCardProps) {
  const {activeAllocation, activeAllocations, dynamicStatus} = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const active = workload.allocations.filter((allocation) => {
      const startDate = new Date(allocation.startDate);
      const endDate = allocation.endDate ? new Date(allocation.endDate) : null;
      return startDate <= today && (!endDate || endDate >= today);
    });

    const activeTotal = active.reduce((total, a) => total + a.allocationPercentage, 0);

    let status: AllocationStatus;
    if (activeTotal > ALLOCATION_THRESHOLDS.OVER_ALLOCATED) {
      status = 'OVER_ALLOCATED';
    } else if (activeTotal >= ALLOCATION_THRESHOLDS.OPTIMAL_MIN) {
      status = 'OPTIMAL';
    } else if (activeTotal > 0) {
      status = 'UNDER_UTILIZED';
    } else {
      status = 'UNASSIGNED';
    }

    return {activeAllocation: activeTotal, activeAllocations: active, dynamicStatus: status};
  }, [workload.allocations]);

  const statusColor = getAllocationStatusColor(dynamicStatus);
  const isOverAllocated = activeAllocation > ALLOCATION_THRESHOLDS.OVER_ALLOCATED;

  return (
    <div
      className={cn(
        'group flex items-center gap-4 rounded-lg px-4 py-2.5 transition-colors',
        'hover:bg-surface-50 dark:hover:bg-surface-800/50',
        onViewDetails && 'cursor-pointer',
        className
      )}
      onClick={onViewDetails}
    >
      {/* Avatar with initials */}
      <div
        className={cn(
          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium',
          isOverAllocated
            ? 'bg-danger-100 text-danger-700 dark:bg-danger-900/40 dark:text-danger-300'
            : 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-300'
        )}
      >
        {getInitials(workload.employeeName)}
      </div>

      {/* Name and role */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-surface-900 dark:text-surface-100">
            {workload.employeeName}
          </span>
          {workload.hasPendingApprovals && (
            <span className="flex h-2 w-2 rounded-full bg-warning-400" title="Pending approval"/>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
          <span className="truncate">{workload.designation || workload.employeeCode}</span>
          {showProjects && activeAllocations.length > 0 && (
            <>
              <span>·</span>
              <span>{activeAllocations.length} project{activeAllocations.length !== 1 ? 's' : ''}</span>
            </>
          )}
        </div>
      </div>

      {/* Allocation bar */}
      <div className="flex items-center gap-2">
        <div className="w-24">
          <div className="row-between mb-1">
            <span className="text-xs text-surface-400">
              {activeAllocations.length > 0 ? activeAllocations[0].projectName.substring(0, 12) : ''}
            </span>
          </div>
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
            <div
              className={cn(
                'absolute left-0 top-0 h-full rounded-full transition-all',
                isOverAllocated ? 'bg-danger-500' : activeAllocation >= 70 ? 'bg-success-500' : 'bg-warning-400'
              )}
              style={{width: `${Math.min(activeAllocation, 100)}%`}}
            />
          </div>
        </div>

        {/* Percentage */}
        <span
          className="w-12 text-right text-sm font-semibold tabular-nums"
          style={{color: statusColor}}
        >
          {Math.round(activeAllocation)}%
        </span>
      </div>
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

export default EmployeeWorkloadCard;
