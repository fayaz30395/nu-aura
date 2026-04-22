'use client';

import React from 'react';
import {cn} from '@/lib/utils';
import {
  ALLOCATION_THRESHOLDS,
  AllocationBreakdown,
  EmployeeCapacity,
  formatAllocationPercentage,
  getAllocationStatus,
  getAllocationStatusColor,
  getAllocationStatusLabel,
} from '@/lib/types/hrms/resource-management';
import {AlertTriangle, Briefcase, CheckCircle, Clock, User} from 'lucide-react';

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
      <div className="row-between">
        <div className="flex items-center gap-2">
          <div
            className='flex h-10 w-10 items-center justify-center rounded-full bg-accent-subtle text-accent'>
            <User className="h-5 w-5"/>
          </div>
          <div>
            <p className='font-medium text-primary'>
              {capacity.employeeName}
            </p>
            <p className='text-sm text-muted'>
              {capacity.employeeCode} {capacity.designation && `• ${capacity.designation}`}
            </p>
          </div>
        </div>
        {capacity.hasPendingApprovals && (
          <span
            className='inline-flex items-center gap-1 rounded-full bg-status-warning-bg px-2.5 py-1 text-xs font-medium text-status-warning-text'>
            <Clock className="h-3 w-3"/>
            Pending Approval
          </span>
        )}
      </div>
      {/* Allocation Gauge */}
      <div className="space-y-2">
        <div className="row-between text-sm">
          <span className='font-medium text-secondary'>
            Total Allocation
          </span>
          <div className="flex items-center gap-2">
            <span
              className="font-semibold"
              style={{color: statusColor}}
            >
              {formatAllocationPercentage(capacity.totalAllocation)}
            </span>
            <StatusBadge status={status} label={statusLabel}/>
          </div>
        </div>

        {/* Progress bar */}
        <div className='relative h-3 w-full overflow-hidden rounded-full bg-elevated'>
          {/* Background markers at 50%, 75%, 100% */}
          <div className='absolute left-1/2 top-0 h-full w-px bg-card'/>
          <div className='absolute left-3/4 top-0 h-full w-px bg-card'/>
          <div className='absolute right-0 top-0 h-full w-px bg-card'
               style={{left: '66.67%'}}/>

          {/* Filled portion */}
          <div
            className={cn(
              'absolute left-0 top-0 h-full rounded-full transition-all duration-500',
              isOverAllocated
                ? 'bg-gradient-to-r from-danger-400 to-danger-500'
                : isWarning
                  ? 'bg-gradient-to-r from-warning-400 to-warning-500'
                  : 'bg-gradient-to-r from-success-400 to-success-500'
            )}
            style={{width: `${(gaugePercentage / 150) * 100}%`}}
          />

          {/* 100% marker line */}
          <div
            className='absolute top-0 h-full w-0.5 bg-inverse'
            style={{left: '66.67%'}}
          />
        </div>

        {/* Scale labels */}
        <div className='flex justify-between text-xs text-muted'>
          <span>0%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
          <span>150%</span>
        </div>
      </div>
      {/* Capacity summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className='rounded-lg bg-base p-4'>
          <p className='text-xs text-muted'>Approved</p>
          <p className='text-lg font-semibold text-primary'>
            {formatAllocationPercentage(capacity.approvedAllocation)}
          </p>
        </div>
        <div className='rounded-lg bg-base p-4'>
          <p className='text-xs text-muted'>Pending</p>
          <p className='text-lg font-semibold text-status-warning-text'>
            {formatAllocationPercentage(capacity.pendingAllocation)}
          </p>
        </div>
        <div className='rounded-lg bg-base p-4'>
          <p className='text-xs text-muted'>Available</p>
          <p
            className={cn(
              'text-lg font-semibold',
              capacity.availableCapacity < 0
                ? 'text-status-danger-text'
                : 'text-status-success-text'
            )}
          >
            {formatAllocationPercentage(Math.max(0, capacity.availableCapacity))}
          </p>
        </div>
      </div>
      {/* Allocation breakdown */}
      {showBreakdown && capacity.allocations.length > 0 && (
        <div className="space-y-2">
          <p className='text-sm font-medium text-secondary'>
            Project Allocations ({capacity.allocations.length})
          </p>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {capacity.allocations.map((allocation) => (
              <AllocationRow key={allocation.projectId} allocation={allocation}/>
            ))}
          </div>
        </div>
      )}
      {/* View details link */}
      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className='text-sm font-medium text-accent hover:text-accent cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded'
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
interface CompactCapacityDisplayProps {
  capacity: EmployeeCapacity;
  status: string;
  statusColor: string;
  className?: string;
}

function CompactCapacityDisplay({
                                  capacity,
                                  status: _status,
                                  statusColor,
                                  className,
                                }: CompactCapacityDisplayProps) {
  const isOverAllocated = capacity.totalAllocation > ALLOCATION_THRESHOLDS.OVER_ALLOCATED;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Mini gauge */}
      <div className='relative h-2 w-24 overflow-hidden rounded-full bg-elevated'>
        <div
          className={cn(
            'absolute left-0 top-0 h-full rounded-full',
            isOverAllocated ? 'bg-status-danger-bg' : 'bg-status-success-bg'
          )}
          style={{width: `${Math.min((capacity.totalAllocation / 100) * 100, 100)}%`}}
        />
      </div>
      {/* Percentage */}
      <span
        className="text-sm font-medium"
        style={{color: statusColor}}
      >
        {formatAllocationPercentage(capacity.totalAllocation)}
      </span>
      {/* Status icon */}
      {isOverAllocated ? (
        <AlertTriangle className='h-4 w-4 text-status-danger-text'/>
      ) : capacity.hasPendingApprovals ? (
        <Clock className='h-4 w-4 text-status-warning-text'/>
      ) : null}
    </div>
  );
}

/**
 * Status badge component
 */
interface StatusBadgeProps {
  status: string;
  label: string;
}

function StatusBadge({status, label}: StatusBadgeProps) {
  const bgColors: Record<string, string> = {
    OVER_ALLOCATED: "bg-status-danger-bg text-status-danger-text",
    OPTIMAL: "bg-status-success-bg text-status-success-text",
    UNDER_UTILIZED: "bg-status-warning-bg text-status-warning-text",
    UNASSIGNED: "bg-surface text-secondary",
  };

  const icons: Record<string, React.ReactNode> = {
    OVER_ALLOCATED: <AlertTriangle className="h-3 w-3"/>,
    OPTIMAL: <CheckCircle className="h-3 w-3"/>,
    UNDER_UTILIZED: <Clock className="h-3 w-3"/>,
    UNASSIGNED: <User className="h-3 w-3"/>,
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
interface AllocationRowProps {
  allocation: AllocationBreakdown;
}

function AllocationRow({allocation}: AllocationRowProps) {
  return (
    <div
      className={cn(
        'row-between rounded-lg border p-4',
        allocation.isPendingApproval
          ? 'border-status-warning-border bg-status-warning-bg'
          : 'border-subtle bg-[var(--bg-card)]'
      )}
    >
      <div className="flex items-center gap-2">
        <div className='flex h-8 w-8 items-center justify-center rounded bg-surface'>
          <Briefcase className='h-4 w-4 text-secondary'/>
        </div>
        <div>
          <p className='text-sm font-medium text-primary'>
            {allocation.projectName}
          </p>
          <p className='text-xs text-muted'>
            {allocation.role} • {allocation.projectCode}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className='text-sm font-semibold text-primary'>
          {formatAllocationPercentage(allocation.allocationPercentage)}
        </p>
        {allocation.isPendingApproval && (
          <span className='text-xs text-status-warning-text'>Pending</span>
        )}
      </div>
    </div>
  );
}

export default EmployeeCapacityDisplay;
