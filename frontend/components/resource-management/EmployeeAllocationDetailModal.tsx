'use client';

import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import {
  User,
  Briefcase,
  Calendar,
  Clock,
  AlertTriangle,
  TrendingUp,
  History,
  ChevronRight,
  Percent,
  Pencil,
  X,
  Check,
} from 'lucide-react';
import {
  EmployeeWorkload,
  ProjectAllocationDetail,
  AllocationApprovalRequest,
  getAllocationStatusColor,
  getAllocationStatusLabel,
  formatAllocationPercentage,
  ALLOCATION_THRESHOLDS,
} from '@/lib/types/hrms/resource-management';
import { format } from 'date-fns';

export interface AllocationEditData {
  projectId: string;
  startDate: string;
  endDate: string;
  allocationPercentage: number;
}

interface EmployeeAllocationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeWorkload | null;
  allocationHistory?: AllocationApprovalRequest[];
  loadingHistory?: boolean;
  onViewProject?: (projectId: string) => void;
  onEditAllocation?: (employeeId: string, data: AllocationEditData) => void;
}

type TabType = 'current' | 'history';

export function EmployeeAllocationDetailModal({
  isOpen,
  onClose,
  employee,
  allocationHistory = [],
  loadingHistory = false,
  onViewProject,
  onEditAllocation,
}: EmployeeAllocationDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('current');
  const [editingAllocationId, setEditingAllocationId] = useState<string | null>(null);

  // Reset tab and editing state when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('current');
      setEditingAllocationId(null);
    }
  }, [isOpen]);

  const handleSaveEdit = (data: AllocationEditData) => {
    if (employee && onEditAllocation) {
      onEditAllocation(employee.employeeId, data);
    }
    setEditingAllocationId(null);
  };

  const handleCancelEdit = () => {
    setEditingAllocationId(null);
  };

  if (!employee) return null;

  // Calculate active allocation based on current date (only count allocations where today is within the date range)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeAllocation = employee.allocations.reduce((total, allocation) => {
    const startDate = new Date(allocation.startDate);
    const endDate = allocation.endDate ? new Date(allocation.endDate) : null;

    // Only count if allocation is currently active (today is between start and end)
    const isActive = startDate <= today && (!endDate || endDate >= today);
    return isActive ? total + allocation.allocationPercentage : total;
  }, 0);

  const plannedAllocation = employee.allocations.reduce((total, allocation) => {
    const startDate = new Date(allocation.startDate);
    return startDate > today ? total + allocation.allocationPercentage : total;
  }, 0);

  const activeProjectCount = employee.allocations.filter(allocation => {
    const startDate = new Date(allocation.startDate);
    const endDate = allocation.endDate ? new Date(allocation.endDate) : null;
    return startDate <= today && (!endDate || endDate >= today);
  }).length;

  // Calculate dynamic status based on active allocation
  const dynamicStatus: import('@/lib/types/hrms/resource-management').AllocationStatus =
    activeAllocation > ALLOCATION_THRESHOLDS.OVER_ALLOCATED ? 'OVER_ALLOCATED' :
    activeAllocation >= ALLOCATION_THRESHOLDS.OPTIMAL_MIN ? 'OPTIMAL' :
    activeAllocation > 0 ? 'UNDER_UTILIZED' : 'UNASSIGNED';

  const statusColor = getAllocationStatusColor(dynamicStatus);
  const _statusLabel = getAllocationStatusLabel(dynamicStatus);
  const isOverAllocated = activeAllocation > ALLOCATION_THRESHOLDS.OVER_ALLOCATED;
  const availableCapacity = 100 - activeAllocation; // Can be negative when over-allocated

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <div className="flex items-center gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full ${
              isOverAllocated
                ? 'bg-danger-100 text-danger-600 dark:bg-danger-900/30 dark:text-danger-400'
                : 'bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-400'
            }`}
          >
            <User className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-50">
              {employee.employeeName}
            </h2>
            <div className="flex items-center gap-2 text-sm text-surface-500">
              <span>{employee.employeeCode}</span>
              {employee.designation && (
                <>
                  <span>•</span>
                  <span>{employee.designation}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </ModalHeader>

      <ModalBody className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-surface-400" />
              <span className="text-xs text-surface-500">Active Allocation</span>
            </div>
            <p
              className="mt-1 text-xl font-bold"
              style={{ color: statusColor }}
            >
              {formatAllocationPercentage(activeAllocation)}
            </p>
          </div>

          <div className="rounded-lg border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-surface-400" />
              <span className="text-xs text-surface-500">Available</span>
            </div>
            <p className={`mt-1 text-xl font-bold ${availableCapacity > 0 ? 'text-success-600' : 'text-danger-600'}`}>
              {formatAllocationPercentage(availableCapacity)}
            </p>
          </div>

          <div className="rounded-lg border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-surface-400" />
              <span className="text-xs text-surface-500">Active Projects</span>
            </div>
            <p className="mt-1 text-xl font-bold text-surface-900 dark:text-surface-50">
              {activeProjectCount}
            </p>
          </div>

          <div className="rounded-lg border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent-500" />
              <span className="text-xs text-surface-500">Planned</span>
            </div>
            <p className="mt-1 text-xl font-bold text-accent-600 dark:text-accent-400">
              {formatAllocationPercentage(plannedAllocation)}
            </p>
          </div>
        </div>

        {/* Allocation Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-surface-600 dark:text-surface-400">Current Capacity Utilization</span>
            <span className="font-medium" style={{ color: statusColor }}>
              {formatAllocationPercentage(activeAllocation)} / 100%
            </span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
            {/* Active allocation */}
            <div
              className={`absolute left-0 top-0 h-full transition-all ${
                isOverAllocated ? 'bg-danger-500' : 'bg-success-500'
              }`}
              style={{ width: `${Math.min((activeAllocation / 150) * 100, 100)}%` }}
            />
            {/* Planned allocation (shown in blue after active) */}
            {plannedAllocation > 0 && (
              <div
                className="absolute top-0 h-full bg-accent-400"
                style={{
                  left: `${(activeAllocation / 150) * 100}%`,
                  width: `${(plannedAllocation / 150) * 100}%`,
                }}
              />
            )}
            {/* 100% marker */}
            <div
              className="absolute top-0 h-full w-0.5 bg-surface-600"
              style={{ left: '66.67%' }}
            />
          </div>
          <div className="row-between text-xs text-surface-500">
            <span>0%</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-success-500"></span> Active
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-accent-400"></span> Planned
              </span>
            </div>
            <span>150%</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-surface-200 dark:border-surface-700">
          <nav className="-mb-px flex gap-6">
            <button
              onClick={() => setActiveTab('current')}
              className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                activeTab === 'current'
                  ? 'border-accent-700 text-accent-700 dark:border-accent-400 dark:text-accent-400'
                  : 'border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Current Allocations ({employee.projectCount})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'border-accent-700 text-accent-700 dark:border-accent-400 dark:text-accent-400'
                  : 'border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Allocation History
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[200px]">
          {activeTab === 'current' && (
            <div className="space-y-4">
              {employee.allocations.length > 0 ? (
                employee.allocations.map((allocation) => (
                  <AllocationCard
                    key={allocation.projectId}
                    allocation={allocation}
                    allAllocations={employee.allocations}
                    onClick={() => onViewProject?.(allocation.projectId)}
                    isEditing={editingAllocationId === allocation.projectId}
                    onEdit={() => setEditingAllocationId(allocation.projectId)}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    canEdit={!!onEditAllocation}
                  />
                ))
              ) : (
                <EmptyState
                  title="No Current Allocations"
                  description="This employee is not currently assigned to any projects."
                  icon={<Briefcase className="h-12 w-12" />}
                />
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {loadingHistory ? (
                <>
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                </>
              ) : allocationHistory.length > 0 ? (
                allocationHistory.map((request) => (
                  <HistoryCard key={request.id} request={request} />
                ))
              ) : (
                <EmptyState
                  title="No Allocation History"
                  description="No past allocation changes found for this employee."
                  icon={<History className="h-12 w-12" />}
                />
              )}
            </div>
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function AllocationCard({
  allocation,
  allAllocations,
  onClick,
  isEditing,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  canEdit,
}: {
  allocation: ProjectAllocationDetail;
  allAllocations: ProjectAllocationDetail[];
  onClick?: () => void;
  isEditing?: boolean;
  onEdit?: () => void;
  onSaveEdit?: (data: AllocationEditData) => void;
  onCancelEdit?: () => void;
  canEdit?: boolean;
}) {
  const [editStartDate, setEditStartDate] = useState(allocation.startDate);
  const [editEndDate, setEditEndDate] = useState(allocation.endDate || '');
  const [editPercentage, setEditPercentage] = useState(allocation.allocationPercentage);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset edit values when allocation changes or editing starts
  useEffect(() => {
    if (isEditing) {
      setEditStartDate(allocation.startDate);
      setEditEndDate(allocation.endDate || '');
      setEditPercentage(allocation.allocationPercentage);
      setValidationError(null);
    }
  }, [isEditing, allocation]);

  // Calculate allocation status based on dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(allocation.startDate);
  const endDate = allocation.endDate ? new Date(allocation.endDate) : null;

  let allocationStatus: 'ACTIVE' | 'PLANNED' | 'INACTIVE';
  if (startDate > today) {
    allocationStatus = 'PLANNED';
  } else if (endDate && endDate < today) {
    allocationStatus = 'INACTIVE';
  } else {
    allocationStatus = 'ACTIVE';
  }

  // Check if this allocation is editable (not INACTIVE)
  const isEditable = allocationStatus !== 'INACTIVE';

  const getStatusStyle = () => {
    switch (allocationStatus) {
      case 'ACTIVE':
        return {
          badge: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
          icon: 'bg-accent-100 text-accent-600 dark:bg-accent-900/30 dark:text-accent-400',
        };
      case 'PLANNED':
        return {
          badge: 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400',
          icon: 'bg-accent-100 text-accent-600 dark:bg-accent-900/30 dark:text-accent-400',
        };
      case 'INACTIVE':
        return {
          badge: 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400',
          icon: 'bg-surface-100 text-surface-500 dark:bg-surface-700',
        };
    }
  };

  const statusStyle = getStatusStyle();

  // Calculate max allowed percentage (100 - other active/planned allocations)
  const calculateMaxAllowedPercentage = () => {
    const otherAllocationsTotal = allAllocations
      .filter((a) => a.projectId !== allocation.projectId)
      .reduce((total, a) => {
        const aStartDate = new Date(a.startDate);
        const aEndDate = a.endDate ? new Date(a.endDate) : null;
        // Only count active and planned allocations
        const isActiveOrPlanned = aStartDate > today || (aStartDate <= today && (!aEndDate || aEndDate >= today));
        return isActiveOrPlanned ? total + a.allocationPercentage : total;
      }, 0);
    return Math.max(0, 100 - otherAllocationsTotal);
  };

  const maxAllowedPercentage = calculateMaxAllowedPercentage();

  const handleSave = () => {
    // Validate that allocation doesn't exceed 100%
    if (editPercentage > maxAllowedPercentage) {
      setValidationError(`Total allocation cannot exceed 100%. Maximum allowed: ${maxAllowedPercentage}%`);
      return;
    }

    if (editPercentage < 0) {
      setValidationError('Allocation percentage cannot be negative');
      return;
    }

    if (onSaveEdit) {
      onSaveEdit({
        projectId: allocation.projectId,
        startDate: editStartDate,
        endDate: editEndDate,
        allocationPercentage: editPercentage,
      });
    }
  };

  const handlePercentageChange = (value: number) => {
    setEditPercentage(value);
    if (value > maxAllowedPercentage) {
      setValidationError(`Total allocation cannot exceed 100%. Maximum allowed: ${maxAllowedPercentage}%`);
    } else if (value < 0) {
      setValidationError('Allocation percentage cannot be negative');
    } else {
      setValidationError(null);
    }
  };

  if (isEditing) {
    return (
      <div className="rounded-lg border border-accent-300 bg-accent-50 p-4 dark:border-accent-700 dark:bg-accent-900/20">
        <div className="flex items-start gap-2">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${statusStyle.icon}`}
          >
            <Briefcase className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-surface-900 dark:text-surface-50">
                {allocation.projectName}
              </h4>
              <span className="text-xs text-surface-500">Editing</span>
            </div>
            <p className="text-sm text-surface-500">
              {allocation.projectCode} • {allocation.role}
            </p>

            {/* Edit Form */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">
                  End Date
                </label>
                <Input
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">
                  Allocation % (max: {maxAllowedPercentage}%)
                </label>
                <Input
                  type="number"
                  min={0}
                  max={maxAllowedPercentage}
                  value={editPercentage}
                  onChange={(e) => handlePercentageChange(Number(e.target.value))}
                  className={`text-sm ${validationError ? 'border-danger-500' : ''}`}
                />
              </div>
            </div>

            {/* Validation Error */}
            {validationError && (
              <div className="mt-2 flex items-center gap-1 text-xs text-danger-600 dark:text-danger-400">
                <AlertTriangle className="h-3 w-3" />
                {validationError}
              </div>
            )}

            {/* Edit Actions */}
            <div className="mt-4 flex items-center gap-2">
              <Button size="sm" onClick={handleSave} disabled={!!validationError}>
                <Check className="mr-1 h-4 w-4" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={onCancelEdit}>
                <X className="mr-1 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border p-4 transition-all ${
        onClick ? 'cursor-pointer hover:border-accent-300 hover:shadow-[var(--shadow-card)] dark:hover:border-accent-700' : ''
      } ${
        allocation.isPendingApproval
          ? 'border-warning-200 bg-warning-50 dark:border-warning-800 dark:bg-warning-900/20'
          : 'border-surface-200 bg-[var(--bg-card)] dark:border-surface-700'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${statusStyle.icon}`}
          >
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-surface-900 dark:text-surface-50">
                {allocation.projectName}
              </h4>
              {allocation.isPendingApproval && (
                <span className="inline-flex items-center gap-1 rounded-full bg-warning-100 px-2 py-0.5 text-xs font-medium text-warning-700 dark:bg-warning-900/30 dark:text-warning-400">
                  <Clock className="h-3 w-3" />
                  Pending
                </span>
              )}
            </div>
            <p className="text-sm text-surface-500">
              {allocation.projectCode} • {allocation.role}
            </p>
            <div className="mt-2 flex items-center gap-4 text-xs text-surface-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(allocation.startDate), 'MMM d, yyyy')}
                {allocation.endDate && ` - ${format(new Date(allocation.endDate), 'MMM d, yyyy')}`}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle.badge}`}
              >
                {allocationStatus}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="text-right">
            <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
              {formatAllocationPercentage(allocation.allocationPercentage)}
            </p>
            {onClick && <ChevronRight className="ml-auto mt-1 h-4 w-4 text-surface-400" />}
          </div>
          {canEdit && isEditable && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
              className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-700 dark:hover:text-surface-300"
              title="Edit allocation"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryCard({ request }: { request: AllocationApprovalRequest }) {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400';
      case 'REJECTED':
        return 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400';
      case 'PENDING':
        return 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400';
      default:
        return 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400';
    }
  };

  return (
    <div className="rounded-lg border border-surface-200 bg-[var(--bg-card)] p-4 dark:border-surface-700">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-surface-900 dark:text-surface-50">
              {request.projectName}
            </h4>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusStyle(request.status)}`}>
              {request.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-surface-500">
            Requested: {formatAllocationPercentage(request.requestedAllocation)} allocation
          </p>
          <div className="mt-2 flex items-center gap-4 text-xs text-surface-500">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              By {request.requestedByName}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(request.createdAt), 'MMM d, yyyy')}
            </span>
          </div>
          {request.approvalComment && (
            <p className="mt-2 text-sm italic text-surface-600 dark:text-surface-400">
              &quot;{request.approvalComment}&quot;
            </p>
          )}
          {request.rejectionReason && (
            <p className="mt-2 text-sm italic text-danger-600 dark:text-danger-400">
              Reason: {request.rejectionReason}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm text-surface-500">Result</p>
          <p className="text-lg font-semibold text-surface-900 dark:text-surface-50">
            {formatAllocationPercentage(request.resultingAllocation)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default EmployeeAllocationDetailModal;
