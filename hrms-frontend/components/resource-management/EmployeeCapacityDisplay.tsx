'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  EmployeeCapacity,
  AllocationBreakdown,
  getAllocationStatus,
  getAllocationStatusColor,
  getAllocationStatusLabel,
  formatAllocationPercentage,
  ALLOCATION_THRESHOLDS,
} from '@/lib/types/resource-management';
import { AlertTriangle, Clock, CheckCircle, User, Briefcase } from 'lucide-react';

interface EmployeeCapacityDisplayProps {
  capacity: EmployeeCapacity;
  showBreakdown?: boolean;
  compact?: boolean;
  onViewDetails?: () => void;
  className?: string;
}

/**
 * Displays an employee's current allocation capacity with visual indicators
 */
export function EmployeeCapacityDisplay({
  capacity,
  showBreakdown = true,
  compact = false,
  onViewDetails,
  className,
}: EmployeeCapacityDisplayProps) {
  const status = getAllocationStatus(capacity.totalAllocation);
  const statusColor = getAllocationStatusColor(status);
  const statusLabel = getAllocationStatusLabel(status);

  // Calculate the gauge percentage (capped at 150% for display)
  const gaugePercentage = Math.min(capacity.totalAllocation, 150);
  const isOverAllocated = capacity.totalAllocation > ALLOCATION_THRESHOLDS.OVER_ALLOCATED;
  const isWarning = capacity.totalAllocation >= ALLOCATION_THRESHOLDS.WARNING && !isOverAllocated;

  if (compact) {
    return (
      <CompactCapacityDisplay
        capacity={capacity}
        status={status}
        statusColor={statusColor}
        className={className}
      />
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with employee info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400">
            <User className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium text-surface-900 dark:text-surface-50">
              {capacity.employeeName}
            </p>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              {capacity.employeeCode} {capacity.designation && `• ${capacity.designation}`}
            </p>
          </div>
        </div>
        {capacity.hasPendingApprovals && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Clock className="h-3 w-3" />
            Pending Approval
          </span>
        )}
      </div>

      {/* Allocation Gauge */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-surface-700 dark:text-surface-300">
            Total Allocation
          </span>
          <div className="flex items-center gap-2">
            <span
              className="font-semibold"
              style={{ color: statusColor }}
            >
              {formatAllocationPercentage(capacity.totalAllocation)}
            </span>
            <StatusBadge status={status} label={statusLabel} />
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
          {/* Background markers at 50%, 75%, 100% */}
          <div className="absolute left-1/2 top-0 h-full w-px bg-surface-300 dark:bg-surface-600" />
          <div className="absolute left-3/4 top-0 h-full w-px bg-surface-300 dark:bg-surface-600" />
          <div className="absolute right-0 top-0 h-full w-px bg-surface-400 dark:bg-surface-500" style={{ left: '66.67%' }} />

          {/* Filled portion */}
          <div
            className={cn(
              'absolute left-0 top-0 h-full rounded-full transition-all duration-500',
              isOverAllocated
                ? 'bg-gradient-to-r from-red-400 to-red-500'
                : isWarning
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                  : 'bg-gradient-to-r from-green-400 to-green-500'
            )}
            style={{ width: `${(gaugePercentage / 150) * 100}%` }}
          />

          {/* 100% marker line */}
          <div
            className="absolute top-0 h-full w-0.5 bg-surface-800 dark:bg-surface-200"
            style={{ left: '66.67%' }}
          />
        </div>

        {/* Scale labels */}
        <div className="flex justify-between text-xs text-surface-500 dark:text-surface-400">
          <span>0%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
          <span>150%</span>
        </div>
      </div>

      {/* Capacity summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-surface-50 p-3 dark:bg-surface-800">
          <p className="text-xs text-surface-500 dark:text-surface-400">Approved</p>
          <p className="text-lg font-semibold text-surface-900 dark:text-surface-50">
            {formatAllocationPercentage(capacity.approvedAllocation)}
          </p>
        </div>
        <div className="rounded-lg bg-surface-50 p-3 dark:bg-surface-800">
          <p className="text-xs text-surface-500 dark:text-surface-400">Pending</p>
          <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
            {formatAllocationPercentage(capacity.pendingAllocation)}
          </p>
        </div>
        <div className="rounded-lg bg-surface-50 p-3 dark:bg-surface-800">
          <p className="text-xs text-surface-500 dark:text-surface-400">Available</p>
          <p
            className={cn(
              'text-lg font-semibold',
              capacity.availableCapacity < 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-green-600 dark:text-green-400'
            )}
          >
            {formatAllocationPercentage(Math.max(0, capacity.availableCapacity))}
          </p>
        </div>
      </div>

      {/* Allocation breakdown */}
      {showBreakdown && capacity.allocations.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
            Project Allocations ({capacity.allocations.length})
          </p>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {capacity.allocations.map((allocation) => (
              <AllocationRow key={allocation.projectId} allocation={allocation} />
            ))}
          </div>
        </div>
      )}

      {/* View details link */}
      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          View full availability →
        </button>
      )}
    </div>
  );
}

/**
 * Compact version of capacity display for inline use
 */
function CompactCapacityDisplay({
  capacity,
  status,
  statusColor,
  className,
}: {
  capacity: EmployeeCapacity;
  status: string;
  statusColor: string;
  className?: string;
}) {
  const isOverAllocated = capacity.totalAllocation > ALLOCATION_THRESHOLDS.OVER_ALLOCATED;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Mini gauge */}
      <div className="relative h-2 w-24 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
        <div
          className={cn(
            'absolute left-0 top-0 h-full rounded-full',
            isOverAllocated ? 'bg-red-500' : 'bg-green-500'
          )}
          style={{ width: `${Math.min((capacity.totalAllocation / 100) * 100, 100)}%` }}
        />
      </div>

      {/* Percentage */}
      <span
        className="text-sm font-medium"
        style={{ color: statusColor }}
      >
        {formatAllocationPercentage(capacity.totalAllocation)}
      </span>

      {/* Status icon */}
      {isOverAllocated ? (
        <AlertTriangle className="h-4 w-4 text-red-500" />
      ) : capacity.hasPendingApprovals ? (
        <Clock className="h-4 w-4 text-amber-500" />
      ) : null}
    </div>
  );
}

/**
 * Status badge component
 */
function StatusBadge({ status, label }: { status: string; label: string }) {
  const bgColors: Record<string, string> = {
    OVER_ALLOCATED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    OPTIMAL: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    UNDER_UTILIZED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    UNASSIGNED: 'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-400',
  };

  const icons: Record<string, React.ReactNode> = {
    OVER_ALLOCATED: <AlertTriangle className="h-3 w-3" />,
    OPTIMAL: <CheckCircle className="h-3 w-3" />,
    UNDER_UTILIZED: <Clock className="h-3 w-3" />,
    UNASSIGNED: <User className="h-3 w-3" />,
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        bgColors[status]
      )}
    >
      {icons[status]}
      {label}
    </span>
  );
}

/**
 * Single allocation row in breakdown
 */
function AllocationRow({ allocation }: { allocation: AllocationBreakdown }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border p-3',
        allocation.isPendingApproval
          ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
          : 'border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-surface-100 dark:bg-surface-700">
          <Briefcase className="h-4 w-4 text-surface-600 dark:text-surface-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-surface-900 dark:text-surface-50">
            {allocation.projectName}
          </p>
          <p className="text-xs text-surface-500 dark:text-surface-400">
            {allocation.role} • {allocation.projectCode}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-surface-900 dark:text-surface-50">
          {formatAllocationPercentage(allocation.allocationPercentage)}
        </p>
        {allocation.isPendingApproval && (
          <span className="text-xs text-amber-600 dark:text-amber-400">Pending</span>
        )}
      </div>
    </div>
  );
}

export default EmployeeCapacityDisplay;
