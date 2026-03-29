'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Loader2, X } from 'lucide-react';
import { Candidate } from '@/lib/types/recruitment';
import { CreateOfferFormData } from '@/lib/validations/recruitment';

interface CreateOfferModalProps {
  open: boolean;
  candidate: Candidate | null;
  offerForm: UseFormReturn<CreateOfferFormData>;
  isSubmitting: boolean;
  onSubmit: (data: CreateOfferFormData) => void;
  onClose: () => void;
}

export function CreateOfferModal({
  open,
  candidate,
  offerForm,
  isSubmitting,
  onSubmit,
  onClose,
}: CreateOfferModalProps) {
  if (!open || !candidate) return null;

  const inputCls = 'w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500';

  return (
    <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-[var(--border-main)] shadow-xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Generate Offer Letter
            </h2>
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-4 p-4 bg-success-50 dark:bg-success-900/20 rounded-xl">
            <p className="text-sm text-success-700 dark:text-success-300">
              Creating offer letter for <strong>{candidate.fullName}</strong>
            </p>
          </div>

          <form onSubmit={offerForm.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Offered Salary *</label>
              <input
                type="number"
                {...offerForm.register('offeredSalary', { valueAsNumber: true })}
                className={inputCls}
              />
              {offerForm.formState.errors.offeredSalary && (
                <p className="text-xs text-danger-500 mt-1">{offerForm.formState.errors.offeredSalary.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Position Title</label>
              <input
                type="text"
                {...offerForm.register('positionTitle')}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Joining Date *</label>
              <input
                type="date"
                {...offerForm.register('joiningDate')}
                className={inputCls}
              />
              {offerForm.formState.errors.joiningDate && (
                <p className="text-xs text-danger-500 mt-1">{offerForm.formState.errors.joiningDate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Offer Expiry Date</label>
              <input
                type="date"
                {...offerForm.register('offerExpiryDate')}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Notes</label>
              <textarea
                rows={3}
                {...offerForm.register('notes')}
                className={inputCls}
              />
            </div>

            <div className="flex gap-4 pt-4 border-t border-[var(--border-main)]">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : 'Create Offer'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
