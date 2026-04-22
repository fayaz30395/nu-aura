'use client';

import {Button} from '@/components/ui/Button';
import type {Employee} from '@/lib/types/hrms/employee';

export interface EmployeeDeleteModalProps {
  employee: Employee;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function EmployeeDeleteModal({
                                      employee,
                                      isDeleting,
                                      onConfirm,
                                      onCancel,
                                    }: EmployeeDeleteModalProps) {
  return (
    <div className="fixed inset-0 glass-aura !rounded-none flex items-center justify-center p-4 z-50">
      <div className="skeuo-card rounded-xl max-w-md w-full p-6">
        <div className="flex items-center gap-4 mb-4">
          <div
            className='flex-shrink-0 h-10 w-10 rounded-lg bg-status-danger-bg flex items-center justify-center'>
            <svg className='h-5 w-5 text-status-danger-text' fill="none" viewBox="0 0 24 24"
                 stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-[var(--text-primary)]">Delete Employee</h3>
        </div>
        <p className="text-body-secondary mb-6">
          Are you sure you want to delete{' '}
          <strong className="text-[var(--text-primary)]">{employee.fullName}</strong>? This action cannot be undone.
        </p>
        <div className="flex gap-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={onConfirm}
            isLoading={isDeleting}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
}
