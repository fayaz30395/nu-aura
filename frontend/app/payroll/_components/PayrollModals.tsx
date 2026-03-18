'use client';

import React from 'react';
import { UseFormReturn, UseFieldArrayReturn } from 'react-hook-form';
import {
  PayrollRun,
  Payslip,
  SalaryStructure,
  PayrollRunFormData,
  PayslipFormData,
  SalaryStructureFormData,
} from './types';

// ---- Payroll Run Modal ----
interface PayrollRunModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  formHook: UseFormReturn<PayrollRunFormData>;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (data: PayrollRunFormData) => void;
}

export const PayrollRunModal = React.memo(function PayrollRunModal({
  isOpen,
  mode,
  formHook,
  isSaving,
  onClose,
  onSubmit,
}: PayrollRunModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">
            {mode === 'create' ? 'Create Payroll Run' : 'Edit Payroll Run'}
          </h2>
          <form onSubmit={formHook.handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Run Name *
                </label>
                <input
                  type="text"
                  {...formHook.register('runName')}
                  className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., November 2024 Payroll"
                />
                {formHook.formState.errors.runName && (
                  <p className="text-red-500 text-xs mt-1">{formHook.formState.errors.runName.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Period Start *</label>
                  <input
                    type="date"
                    {...formHook.register('payrollPeriodStart')}
                    className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {formHook.formState.errors.payrollPeriodStart && (
                    <p className="text-red-500 text-xs mt-1">{formHook.formState.errors.payrollPeriodStart.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Period End *</label>
                  <input
                    type="date"
                    {...formHook.register('payrollPeriodEnd')}
                    className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {formHook.formState.errors.payrollPeriodEnd && (
                    <p className="text-red-500 text-xs mt-1">{formHook.formState.errors.payrollPeriodEnd.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Payment Date *</label>
                <input
                  type="date"
                  {...formHook.register('paymentDate')}
                  className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {formHook.formState.errors.paymentDate && (
                  <p className="text-red-500 text-xs mt-1">{formHook.formState.errors.paymentDate.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Notes</label>
                <textarea
                  {...formHook.register('notes')}
                  rows={3}
                  className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
});

// ---- Payslip Modal ----
interface PayslipModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  formHook: UseFormReturn<PayslipFormData>;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (data: PayslipFormData) => void;
}

export const PayslipModal = React.memo(function PayslipModal({
  isOpen,
  mode,
  formHook,
  isSaving,
  onClose,
  onSubmit,
}: PayslipModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">
            {mode === 'create' ? 'Create Payslip' : 'Edit Payslip'}
          </h2>
          <form onSubmit={formHook.handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Employee ID *</label>
                  <input
                    type="text"
                    {...formHook.register('employeeId')}
                    className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {formHook.formState.errors.employeeId && (
                    <p className="text-red-500 text-xs mt-1">{formHook.formState.errors.employeeId.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Payroll Run ID *</label>
                  <input
                    type="text"
                    {...formHook.register('payrollRunId')}
                    className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {formHook.formState.errors.payrollRunId && (
                    <p className="text-red-500 text-xs mt-1">{formHook.formState.errors.payrollRunId.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Period Start *</label>
                  <input
                    type="date"
                    {...formHook.register('payrollPeriodStart')}
                    className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {formHook.formState.errors.payrollPeriodStart && (
                    <p className="text-red-500 text-xs mt-1">{formHook.formState.errors.payrollPeriodStart.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Period End *</label>
                  <input
                    type="date"
                    {...formHook.register('payrollPeriodEnd')}
                    className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {formHook.formState.errors.payrollPeriodEnd && (
                    <p className="text-red-500 text-xs mt-1">{formHook.formState.errors.payrollPeriodEnd.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Payment Date *</label>
                <input
                  type="date"
                  {...formHook.register('paymentDate')}
                  className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {formHook.formState.errors.paymentDate && (
                  <p className="text-red-500 text-xs mt-1">{formHook.formState.errors.paymentDate.message}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Base Salary *</label>
                  <input
                    type="number"
                    step="0.01"
                    {...formHook.register('baseSalary', { valueAsNumber: true })}
                    className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {formHook.formState.errors.baseSalary && (
                    <p className="text-red-500 text-xs mt-1">{formHook.formState.errors.baseSalary.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Allowances</label>
                  <input
                    type="number"
                    step="0.01"
                    {...formHook.register('allowances', { valueAsNumber: true })}
                    className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Deductions</label>
                  <input
                    type="number"
                    step="0.01"
                    {...formHook.register('deductions', { valueAsNumber: true })}
                    className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
});

// ---- Salary Structure Modal ----
interface SalaryStructureModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  formHook: UseFormReturn<SalaryStructureFormData>;
  allowanceFields: UseFieldArrayReturn<SalaryStructureFormData, 'allowances'>['fields'];
  deductionFields: UseFieldArrayReturn<SalaryStructureFormData, 'deductions'>['fields'];
  appendAllowance: UseFieldArrayReturn<SalaryStructureFormData, 'allowances'>['append'];
  removeAllowance: UseFieldArrayReturn<SalaryStructureFormData, 'allowances'>['remove'];
  appendDeduction: UseFieldArrayReturn<SalaryStructureFormData, 'deductions'>['append'];
  removeDeduction: UseFieldArrayReturn<SalaryStructureFormData, 'deductions'>['remove'];
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (data: SalaryStructureFormData) => void;
}

export const SalaryStructureModal = React.memo(function SalaryStructureModal({
  isOpen,
  mode,
  formHook,
  allowanceFields,
  deductionFields,
  appendAllowance,
  removeAllowance,
  appendDeduction,
  removeDeduction,
  isSaving,
  onClose,
  onSubmit,
}: SalaryStructureModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">
            {mode === 'create' ? 'Create Salary Structure' : 'Edit Salary Structure'}
          </h2>
          <form onSubmit={formHook.handleSubmit(onSubmit)}>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Employee ID *</label>
                  <input
                    type="text"
                    {...formHook.register('employeeId')}
                    className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {formHook.formState.errors.employeeId && (
                    <p className="text-red-500 text-xs mt-1">{formHook.formState.errors.employeeId.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Effective Date *</label>
                  <input
                    type="date"
                    {...formHook.register('effectiveDate')}
                    className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {formHook.formState.errors.effectiveDate && (
                    <p className="text-red-500 text-xs mt-1">{formHook.formState.errors.effectiveDate.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Base Salary *</label>
                <input
                  type="number"
                  step="0.01"
                  {...formHook.register('baseSalary', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {formHook.formState.errors.baseSalary && (
                  <p className="text-red-500 text-xs mt-1">{formHook.formState.errors.baseSalary.message}</p>
                )}
              </div>

              {/* Allowances */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-green-700">Allowances</h3>
                  <button
                    type="button"
                    onClick={() => appendAllowance({ name: '', amount: 0, type: 'FIXED', description: '' })}
                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    Add Allowance
                  </button>
                </div>
                <div className="space-y-4">
                  {allowanceFields.map((field, idx) => (
                    <div key={field.id} className="flex gap-4 pb-3 border-b">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Name"
                          {...formHook.register(`allowances.${idx}.name`)}
                          className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Amount"
                          {...formHook.register(`allowances.${idx}.amount`, { valueAsNumber: true })}
                          className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAllowance(idx)}
                        className="px-2 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deductions */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-red-700">Deductions</h3>
                  <button
                    type="button"
                    onClick={() => appendDeduction({ name: '', amount: 0, type: 'FIXED', description: '' })}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Add Deduction
                  </button>
                </div>
                <div className="space-y-4">
                  {deductionFields.map((field, idx) => (
                    <div key={field.id} className="flex gap-4 pb-3 border-b">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Name"
                          {...formHook.register(`deductions.${idx}.name`)}
                          className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Amount"
                          {...formHook.register(`deductions.${idx}.amount`, { valueAsNumber: true })}
                          className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDeduction(idx)}
                        className="px-2 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
});

// ---- Delete Confirm Modals ----
interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmModal = React.memo(function DeleteConfirmModal({
  isOpen,
  title,
  message,
  loading,
  onCancel,
  onConfirm,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <p className="text-[var(--text-secondary)] mb-6">{message}</p>
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
});
