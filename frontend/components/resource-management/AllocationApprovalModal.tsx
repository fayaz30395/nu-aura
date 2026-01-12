'use client';

import React, { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  EmployeeCapacity,
  AllocationValidationResult,
  formatAllocationPercentage,
  ALLOCATION_THRESHOLDS,
} from '@/lib/types/resource-management';
import { AlertTriangle, ArrowRight, Briefcase, User, Clock, CheckCircle } from 'lucide-react';
import { EmployeeCapacityDisplay } from './EmployeeCapacityDisplay';

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
  const overAllocationAmount = resultingAllocation - ALLOCATION_THRESHOLDS.OVER_ALLOCATED;

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
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5" />
          <span>Over-Allocation Warning</span>
        </div>
      </ModalHeader>

      <ModalBody className="space-y-6">
        {/* Warning message */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1">
              <p className="font-medium text-amber-800 dark:text-amber-200">
                This assignment will result in over-allocation
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {employeeCapacity.employeeName} will be allocated at{' '}
                <strong>{formatAllocationPercentage(resultingAllocation)}</strong>, which exceeds 100%.
                This requires approval from their manager.
              </p>
            </div>
          </div>
        </div>

        {/* Allocation visualization */}
        <div className="space-y-4">
          <h3 className="font-medium text-surface-900 dark:text-surface-50">
            Allocation Summary
          </h3>

          <div className="flex items-center justify-between gap-4">
            {/* Current allocation */}
            <div className="flex-1 rounded-lg border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800">
              <p className="text-xs uppercase tracking-wide text-surface-500 dark:text-surface-400">
                Current Allocation
              </p>
              <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-surface-50">
                {formatAllocationPercentage(validationResult.currentTotalAllocation)}
              </p>
            </div>

            {/* Arrow */}
            <ArrowRight className="h-6 w-6 flex-shrink-0 text-surface-400" />

            {/* New allocation */}
            <div className="flex-1 rounded-lg border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800">
              <p className="text-xs uppercase tracking-wide text-surface-500 dark:text-surface-400">
                Proposed Addition
              </p>
              <p className="mt-1 text-2xl font-bold text-primary-600 dark:text-primary-400">
                +{formatAllocationPercentage(proposedAllocation)}
              </p>
            </div>

            {/* Arrow */}
            <ArrowRight className="h-6 w-6 flex-shrink-0 text-surface-400" />

            {/* Resulting allocation */}
            <div className="flex-1 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-xs uppercase tracking-wide text-red-600 dark:text-red-400">
                Resulting Total
              </p>
              <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
                {formatAllocationPercentage(resultingAllocation)}
              </p>
            </div>
          </div>
        </div>

        {/* Project details */}
        <div className="rounded-lg border border-surface-200 p-4 dark:border-surface-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900">
              <Briefcase className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="font-medium text-surface-900 dark:text-surface-50">
                {projectName}
              </p>
              <p className="text-sm text-surface-500 dark:text-surface-400">
                {projectCode} • {role}
              </p>
            </div>
          </div>
        </div>

        {/* Employee's current allocations */}
        <div className="space-y-3">
          <h3 className="font-medium text-surface-900 dark:text-surface-50">
            Current Project Allocations
          </h3>
          {validationResult.existingAllocations.length > 0 ? (
            <div className="max-h-40 space-y-2 overflow-y-auto">
              {validationResult.existingAllocations.map((allocation) => (
                <div
                  key={allocation.projectId}
                  className="flex items-center justify-between rounded-lg border border-surface-200 p-3 dark:border-surface-700"
                >
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4 text-surface-400" />
                    <div>
                      <p className="text-sm font-medium text-surface-900 dark:text-surface-50">
                        {allocation.projectName}
                      </p>
                      <p className="text-xs text-surface-500 dark:text-surface-400">
                        {allocation.role}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-surface-900 dark:text-surface-50">
                    {formatAllocationPercentage(allocation.allocationPercentage)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-surface-500 dark:text-surface-400">
              No existing project allocations
            </p>
          )}
        </div>

        {/* Reason input */}
        {showReasonInput ? (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
              Reason for over-allocation (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this over-allocation is necessary..."
              className="w-full rounded-lg border border-surface-200 bg-white p-3 text-sm placeholder:text-surface-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-surface-700 dark:bg-surface-800 dark:placeholder:text-surface-500"
              rows={3}
            />
          </div>
        ) : (
          <button
            onClick={() => setShowReasonInput(true)}
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            + Add reason for this allocation
          </button>
        )}

        {/* Approval flow info */}
        <div className="flex items-start gap-3 rounded-lg bg-surface-50 p-4 dark:bg-surface-800">
          <Clock className="h-5 w-5 flex-shrink-0 text-surface-400" />
          <div className="text-sm text-surface-600 dark:text-surface-400">
            <p className="font-medium text-surface-900 dark:text-surface-50">
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
            className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
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
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              Submit for Approval
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default AllocationApprovalModal;
