'use client';

import React, {useState} from 'react';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {Button} from '@/components/ui/Button';
import {
  AllocationValidationResult,
  EmployeeCapacity,
  formatAllocationPercentage,
} from '@/lib/types/hrms/resource-management';
import {AlertTriangle, ArrowRight, Briefcase, CheckCircle, Clock} from 'lucide-react';

interface AllocationApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeCapacity: EmployeeCapacity;
  projectName: string;
  projectCode: string;
  proposedAllocation: number;
  role: string;
  validationResult: AllocationValidationResult;
  onSubmitForApproval: (reason?: string) => Promise<void>;
  onProceedAnyway?: () => Promise<void>; // Only for admins
  isAdmin?: boolean;
  isSubmitting?: boolean;
}

/**
 * Modal that displays when an allocation would cause over-allocation (>100%)
 * Allows user to submit for manager approval
 */
export function AllocationApprovalModal({
                                          isOpen,
                                          onClose,
                                          employeeCapacity,
                                          projectName,
                                          projectCode,
                                          proposedAllocation,
                                          role,
                                          validationResult,
                                          onSubmitForApproval,
                                          onProceedAnyway,
                                          isAdmin = false,
                                          isSubmitting = false,
                                        }: AllocationApprovalModalProps) {
  const [reason, setReason] = useState('');
  const [showReasonInput, setShowReasonInput] = useState(false);

  const resultingAllocation = validationResult.resultingAllocation;
  const handleSubmit = async () => {
    await onSubmitForApproval(reason || undefined);
  };

  const handleProceedAnyway = async () => {
    if (onProceedAnyway) {
      await onProceedAnyway();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <div className='flex items-center gap-2 text-status-warning-text'>
          <AlertTriangle className="h-5 w-5"/>
          <span>Over-Allocation Warning</span>
        </div>
      </ModalHeader>
      <ModalBody className="space-y-6">
        {/* Warning message */}
        <div
          className='rounded-lg border border-status-warning-border bg-status-warning-bg p-4'>
          <div className="flex gap-2">
            <AlertTriangle className='h-5 w-5 flex-shrink-0 text-status-warning-text'/>
            <div className="space-y-1">
              <p className='font-medium text-status-warning-text'>
                This assignment will result in over-allocation
              </p>
              <p className='text-sm text-status-warning-text'>
                {employeeCapacity.employeeName} will be allocated at{' '}
                <strong>{formatAllocationPercentage(resultingAllocation)}</strong>, which exceeds 100%.
                This requires approval from their manager.
              </p>
            </div>
          </div>
        </div>

        {/* Allocation visualization */}
        <div className="space-y-4">
          <h3 className='font-medium text-primary'>
            Allocation Summary
          </h3>

          <div className="row-between gap-4">
            {/* Current allocation */}
            <div
              className='flex-1 rounded-lg border border-subtle bg-base p-4'>
              <p className='text-xs uppercase tracking-wide text-muted'>
                Current Allocation
              </p>
              <p className='mt-1 text-2xl font-bold text-primary'>
                {formatAllocationPercentage(validationResult.currentTotalAllocation)}
              </p>
            </div>

            {/* Arrow */}
            <ArrowRight className='h-6 w-6 flex-shrink-0 text-muted'/>

            {/* New allocation */}
            <div
              className='flex-1 rounded-lg border border-subtle bg-base p-4'>
              <p className='text-xs uppercase tracking-wide text-muted'>
                Proposed Addition
              </p>
              <p className='mt-1 text-2xl font-bold text-accent'>
                +{formatAllocationPercentage(proposedAllocation)}
              </p>
            </div>

            {/* Arrow */}
            <ArrowRight className='h-6 w-6 flex-shrink-0 text-muted'/>

            {/* Resulting allocation */}
            <div
              className='flex-1 rounded-lg border border-status-danger-border bg-status-danger-bg p-4'>
              <p className='text-xs uppercase tracking-wide text-status-danger-text'>
                Resulting Total
              </p>
              <p className='mt-1 text-2xl font-bold text-status-danger-text'>
                {formatAllocationPercentage(resultingAllocation)}
              </p>
            </div>
          </div>
        </div>

        {/* Project details */}
        <div className='rounded-lg border border-subtle p-4'>
          <div className="flex items-center gap-2">
            <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-accent-subtle'>
              <Briefcase className='h-5 w-5 text-accent'/>
            </div>
            <div>
              <p className='font-medium text-primary'>
                {projectName}
              </p>
              <p className='text-sm text-muted'>
                {projectCode} • {role}
              </p>
            </div>
          </div>
        </div>

        {/* Employee's current allocations */}
        <div className="space-y-4">
          <h3 className='font-medium text-primary'>
            Current Project Allocations
          </h3>
          {validationResult.existingAllocations.length > 0 ? (
            <div className="max-h-40 space-y-2 overflow-y-auto">
              {validationResult.existingAllocations.map((allocation) => (
                <div
                  key={allocation.projectId}
                  className='row-between rounded-lg border border-subtle p-4'
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className='h-4 w-4 text-muted'/>
                    <div>
                      <p className='text-sm font-medium text-primary'>
                        {allocation.projectName}
                      </p>
                      <p className='text-xs text-muted'>
                        {allocation.role}
                      </p>
                    </div>
                  </div>
                  <span className='text-sm font-semibold text-primary'>
                    {formatAllocationPercentage(allocation.allocationPercentage)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className='text-sm text-muted'>
              No existing project allocations
            </p>
          )}
        </div>

        {/* Reason input */}
        {showReasonInput ? (
          <div className="space-y-2">
            <label className='block text-sm font-medium text-secondary'>
              Reason for over-allocation (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this over-allocation is necessary..."
              className='w-full rounded-lg border border-subtle bg-[var(--bg-input)] p-4 text-sm placeholder:text-muted focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-accent-500'
              rows={3}
            />
          </div>
        ) : (
          <button
            onClick={() => setShowReasonInput(true)}
            className='text-sm text-accent hover:text-accent'
          >
            + Add reason for this allocation
          </button>
        )}

        {/* Approval flow info */}
        <div className='flex items-start gap-2 rounded-lg bg-base p-4'>
          <Clock className='h-5 w-5 flex-shrink-0 text-muted'/>
          <div className='text-sm text-secondary'>
            <p className='font-medium text-primary'>
              What happens next?
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>The allocation request will be sent to {employeeCapacity.employeeName}&apos;s manager</li>
              <li>The assignment will be marked as &quot;Pending Approval&quot;</li>
              <li>You&apos;ll be notified when the request is approved or rejected</li>
            </ul>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>

        {isAdmin && onProceedAnyway && (
          <Button
            variant="outline"
            onClick={handleProceedAnyway}
            disabled={isSubmitting}
            className='border-status-warning-border text-status-warning-text hover:bg-status-warning-bg'
          >
            Skip Approval (Admin)
          </Button>
        )}

        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="gap-2"
        >
          {isSubmitting ? (
            <>
              <div className='h-4 w-4 animate-spin rounded-full border-2 border-[var(--bg-card)] border-t-transparent'/>
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4"/>
              Submit for Approval
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default AllocationApprovalModal;
