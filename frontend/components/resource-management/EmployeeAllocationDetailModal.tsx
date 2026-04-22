'use client';

import React, {useEffect, useState} from 'react';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {Button} from '@/components/ui/Button';
import {Skeleton} from '@/components/ui/Skeleton';
import {EmptyState} from '@/components/ui/EmptyState';
import {Input} from '@/components/ui/Input';
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  History,
  Pencil,
  Percent,
  TrendingUp,
  User,
  X,
} from 'lucide-react';
import {
  ALLOCATION_THRESHOLDS,
  AllocationApprovalRequest,
  EmployeeWorkload,
  formatAllocationPercentage,
  getAllocationStatusColor,
  getAllocationStatusLabel,
  ProjectAllocationDetail,
} from '@/lib/types/hrms/resource-management';
import {format} from 'date-fns';

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
                ? "bg-status-danger-bg text-status-danger-text"
                : "bg-accent-subtle text-accent"
            }`}
          >
            <User className="h-6 w-6"/>
          </div>
          <div>
            <h2 className='text-xl font-semibold text-primary'>
              {employee.employeeName}
            </h2>
            <div className='flex items-center gap-2 text-sm text-muted'>
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
          <div
            className='rounded-lg border border-subtle bg-base p-4'>
            <div className="flex items-center gap-2">
              <Percent className='h-4 w-4 text-muted'/>
              <span className='text-xs text-muted'>Active Allocation</span>
            </div>
            <p
              className="mt-1 text-xl font-bold"
              style={{color: statusColor}}
            >
              {formatAllocationPercentage(activeAllocation)}
            </p>
          </div>

          <div
            className='rounded-lg border border-subtle bg-base p-4'>
            <div className="flex items-center gap-2">
              <TrendingUp className='h-4 w-4 text-muted'/>
              <span className='text-xs text-muted'>Available</span>
            </div>
            <p
              className={`mt-1 text-xl font-bold ${availableCapacity > 0 ? "text-status-success-text" : "text-status-danger-text"}`}>
              {formatAllocationPercentage(availableCapacity)}
            </p>
          </div>

          <div
            className='rounded-lg border border-subtle bg-base p-4'>
            <div className="flex items-center gap-2">
              <Briefcase className='h-4 w-4 text-muted'/>
              <span className='text-xs text-muted'>Active Projects</span>
            </div>
            <p className='mt-1 text-xl font-bold text-primary'>
              {activeProjectCount}
            </p>
          </div>

          <div
            className='rounded-lg border border-subtle bg-base p-4'>
            <div className="flex items-center gap-2">
              <Clock className='h-4 w-4 text-accent'/>
              <span className='text-xs text-muted'>Planned</span>
            </div>
            <p className='mt-1 text-xl font-bold text-accent'>
              {formatAllocationPercentage(plannedAllocation)}
            </p>
          </div>
        </div>

        {/* Allocation Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className='text-secondary'>Current Capacity Utilization</span>
            <span className="font-medium" style={{color: statusColor}}>
              {formatAllocationPercentage(activeAllocation)} / 100%
            </span>
          </div>
          <div className='relative h-3 w-full overflow-hidden rounded-full bg-elevated'>
            {/* Active allocation */}
            <div
              className={`absolute left-0 top-0 h-full transition-all ${
                isOverAllocated ? "bg-status-danger-bg" : "bg-status-success-bg"
              }`}
              style={{width: `${Math.min((activeAllocation / 150) * 100, 100)}%`}}
            />
            {/* Planned allocation (shown in blue after active) */}
            {plannedAllocation > 0 && (
              <div
                className='absolute top-0 h-full bg-accent-subtle'
                style={{
                  left: `${(activeAllocation / 150) * 100}%`,
                  width: `${(plannedAllocation / 150) * 100}%`,
                }}
              />
            )}
            {/* 100% marker */}
            <div
              className='absolute top-0 h-full w-0.5 bg-inverse'
              style={{left: '66.67%'}}
            />
          </div>
          <div className='row-between text-xs text-muted'>
            <span>0%</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className='h-2 w-2 rounded-full bg-status-success-bg'></span> Active
              </span>
              <span className="flex items-center gap-1">
                <span className='h-2 w-2 rounded-full bg-accent-subtle'></span> Planned
              </span>
            </div>
            <span>150%</span>
          </div>
        </div>

        {/* Tabs */}
        <div className='border-b border-subtle'>
          <nav className="-mb-px flex gap-6">
            <button
              onClick={() => setActiveTab('current')}
              className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                activeTab === 'current'
                  ? "border-[var(--accent-primary)] text-accent"
                  : "border-transparent text-muted hover:text-secondary"
              }`}
            >
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4"/>
                Current Allocations ({employee.projectCount})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? "border-[var(--accent-primary)] text-accent"
                  : "border-transparent text-muted hover:text-secondary"
              }`}
            >
              <div className="flex items-center gap-2">
                <History className="h-4 w-4"/>
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
                  icon={<Briefcase className="h-12 w-12"/>}
                />
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {loadingHistory ? (
                <>
                  <Skeleton className="h-20"/>
                  <Skeleton className="h-20"/>
                  <Skeleton className="h-20"/>
                </>
              ) : allocationHistory.length > 0 ? (
                allocationHistory.map((request) => (
                  <HistoryCard key={request.id} request={request}/>
                ))
              ) : (
                <EmptyState
                  title="No Allocation History"
                  description="No past allocation changes found for this employee."
                  icon={<History className="h-12 w-12"/>}
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

interface AllocationCardProps {
  allocation: ProjectAllocationDetail;
  allAllocations: ProjectAllocationDetail[];
  onClick?: () => void;
  isEditing?: boolean;
  onEdit?: () => void;
  onSaveEdit?: (data: AllocationEditData) => void;
  onCancelEdit?: () => void;
  canEdit?: boolean;
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
                        }: AllocationCardProps) {
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
          badge: "bg-status-success-bg text-status-success-text",
          icon: "bg-accent-subtle text-accent",
        };
      case 'PLANNED':
        return {
          badge: "bg-accent-subtle text-accent",
          icon: "bg-accent-subtle text-accent",
        };
      case 'INACTIVE':
        return {
          badge: "bg-surface text-secondary",
          icon: "bg-surface text-muted",
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
      <div
        className='rounded-lg border border-[var(--accent-primary)] bg-accent-subtle p-4'>
        <div className="flex items-start gap-2">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${statusStyle.icon}`}
          >
            <Briefcase className="h-5 w-5"/>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className='font-medium text-primary'>
                {allocation.projectName}
              </h4>
              <span className='text-xs text-muted'>Editing</span>
            </div>
            <p className='text-sm text-muted'>
              {allocation.projectCode} • {allocation.role}
            </p>

            {/* Edit Form */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className='mb-1 block text-xs font-medium text-secondary'>
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
                <label className='mb-1 block text-xs font-medium text-secondary'>
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
                <label className='mb-1 block text-xs font-medium text-secondary'>
                  Allocation % (max: {maxAllowedPercentage}%)
                </label>
                <Input
                  type="number"
                  min={0}
                  max={maxAllowedPercentage}
                  value={editPercentage}
                  onChange={(e) => handlePercentageChange(Number(e.target.value))}
                  className={`text-sm ${validationError ? "border-status-danger-border" : ''}`}
                />
              </div>
            </div>

            {/* Validation Error */}
            {validationError && (
              <div className='mt-2 flex items-center gap-1 text-xs text-status-danger-text'>
                <AlertTriangle className="h-3 w-3"/>
                {validationError}
              </div>
            )}

            {/* Edit Actions */}
            <div className="mt-4 flex items-center gap-2">
              <Button size="sm" onClick={handleSave} disabled={!!validationError}>
                <Check className="mr-1 h-4 w-4"/>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={onCancelEdit}>
                <X className="mr-1 h-4 w-4"/>
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
        onClick ? "cursor-pointer hover:border-[var(--accent-primary)] hover:shadow-[var(--shadow-card)]" : ''
      } ${
        allocation.isPendingApproval
          ? "border-status-warning-border bg-status-warning-bg"
          : "border-subtle bg-[var(--bg-card)]"
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${statusStyle.icon}`}
          >
            <Briefcase className="h-5 w-5"/>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className='font-medium text-primary'>
                {allocation.projectName}
              </h4>
              {allocation.isPendingApproval && (
                <span
                  className='inline-flex items-center gap-1 rounded-full bg-status-warning-bg px-2 py-0.5 text-xs font-medium text-status-warning-text'>
                  <Clock className="h-3 w-3"/>
                  Pending
                </span>
              )}
            </div>
            <p className='text-sm text-muted'>
              {allocation.projectCode} • {allocation.role}
            </p>
            <div className='mt-2 flex items-center gap-4 text-xs text-muted'>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3"/>
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
            <p className='text-2xl font-bold text-primary'>
              {formatAllocationPercentage(allocation.allocationPercentage)}
            </p>
            {onClick && <ChevronRight className='ml-auto mt-1 h-4 w-4 text-muted'/>}
          </div>
          {canEdit && isEditable && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
              className='rounded-lg p-2 text-muted transition-colors hover:bg-surface hover:text-secondary'
              title="Edit allocation"
            >
              <Pencil className="h-4 w-4"/>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface HistoryCardProps {
  request: AllocationApprovalRequest;
}

function HistoryCard({request}: HistoryCardProps) {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return "bg-status-success-bg text-status-success-text";
      case 'REJECTED':
        return "bg-status-danger-bg text-status-danger-text";
      case 'PENDING':
        return "bg-status-warning-bg text-status-warning-text";
      default:
        return "bg-surface text-secondary";
    }
  };

  return (
    <div className='rounded-lg border border-subtle bg-[var(--bg-card)] p-4'>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h4 className='font-medium text-primary'>
              {request.projectName}
            </h4>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusStyle(request.status)}`}>
              {request.status}
            </span>
          </div>
          <p className='mt-1 text-sm text-muted'>
            Requested: {formatAllocationPercentage(request.requestedAllocation)} allocation
          </p>
          <div className='mt-2 flex items-center gap-4 text-xs text-muted'>
            <span className="flex items-center gap-1">
              <User className="h-3 w-3"/>
              By {request.requestedByName}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3"/>
              {format(new Date(request.createdAt), 'MMM d, yyyy')}
            </span>
          </div>
          {request.approvalComment && (
            <p className='mt-2 text-sm italic text-secondary'>
              &quot;{request.approvalComment}&quot;
            </p>
          )}
          {request.rejectionReason && (
            <p className='mt-2 text-sm italic text-status-danger-text'>
              Reason: {request.rejectionReason}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className='text-sm text-muted'>Result</p>
          <p className='text-lg font-semibold text-primary'>
            {formatAllocationPercentage(request.resultingAllocation)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default EmployeeAllocationDetailModal;
