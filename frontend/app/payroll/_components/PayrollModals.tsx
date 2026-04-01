'use client';

import React from 'react';
import { UseFormReturn, UseFieldArrayReturn } from 'react-hook-form';
import {
  PayrollRun as _PayrollRun,
  Payslip as _Payslip,
  SalaryStructure as _SalaryStructure,
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
    <div className="fixed inset-0 glass-aura flex items-center justify-center p-4 z-50">
      <div className="skeuo-card rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-main)]">
        <div className="p-6">
          <h2 className="skeuo-emboss text-2xl font-bold mb-6">
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
                  className="input-aura w-full px-4 py-2 rounded-lg"
                  placeholder="e.g., November 2024 Payroll"
                />
                {formHook.formState.errors.runName && (
                  <p className="text-danger-500 text-xs mt-1">{formHook.formState.errors.runName.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Period Start *</label>
                  <input
                    type="date"
                    {...formHook.register('payrollPeriodStart')}
                    className="input-aura w-full px-4 py-2 rounded-lg"
                  />
                  {formHook.formState.errors.payrollPeriodStart && (
                    <p className="text-danger-500 text-xs mt-1">{formHook.formState.errors.payrollPeriodStart.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Period End *</label>
                  <input
                    type="date"
                    {...formHook.register('payrollPeriodEnd')}
                    className="input-aura w-full px-4 py-2 rounded-lg"
                  />
                  {formHook.formState.errors.payrollPeriodEnd && (
                    <p className="text-danger-500 text-xs mt-1">{formHook.formState.errors.payrollPeriodEnd.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Payment Date *</label>
                <input
                  type="date"
                  {...formHook.register('paymentDate')}
                  className="input-aura w-full px-4 py-2 rounded-lg"
                />
                {formHook.formState.errors.paymentDate && (
                  <p className="text-danger-500 text-xs mt-1">{formHook.formState.errors.paymentDate.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Notes</label>
                <textarea
                  {...formHook.register('notes')}
                  rows={3}
                  className="input-aura w-full px-4 py-2 rounded-lg"
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1 px-4 py-2 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary flex-1 px-4 py-2 rounded-lg disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
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
    <div className="fixed inset-0 glass-aura flex items-center justify-center p-4 z-50">
      <div className="skeuo-card rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-main)]">
        <div className="p-6">
          <h2 className="skeuo-emboss text-2xl font-bold mb-6">
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
                    className="input-aura w-full px-4 py-2 rounded-lg"
                  />
                  {formHook.formState.errors.employeeId && (
                    <p className="text-danger-500 text-xs mt-1">{formHook.formState.errors.employeeId.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Payroll Run ID *</label>
                  <input
                    type="text"
                    {...formHook.register('payrollRunId')}
                    className="input-aura w-full px-4 py-2 rounded-lg"
                  />
                  {formHook.formState.errors.payrollRunId && (
                    <p className="text-danger-500 text-xs mt-1">{formHook.formState.errors.payrollRunId.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Period Start *</label>
                  <input
                    type="date"
                    {...formHook.register('payrollPeriodStart')}
                    className="input-aura w-full px-4 py-2 rounded-lg"
                  />
                  {formHook.formState.errors.payrollPeriodStart && (
                    <p className="text-danger-500 text-xs mt-1">{formHook.formState.errors.payrollPeriodStart.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Period End *</label>
                  <input
                    type="date"
                    {...formHook.register('payrollPeriodEnd')}
                    className="input-aura w-full px-4 py-2 rounded-lg"
                  />
                  {formHook.formState.errors.payrollPeriodEnd && (
                    <p className="text-danger-500 text-xs mt-1">{formHook.formState.errors.payrollPeriodEnd.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Payment Date *</label>
                <input
                  type="date"
                  {...formHook.register('paymentDate')}
                  className="input-aura w-full px-4 py-2 rounded-lg"
                />
                {formHook.formState.errors.paymentDate && (
                  <p className="text-danger-500 text-xs mt-1">{formHook.formState.errors.paymentDate.message}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Base Salary *</label>
                  <input
                    type="number"
                    step="0.01"
                    {...formHook.register('baseSalary', { valueAsNumber: true })}
                    className="input-aura w-full px-4 py-2 rounded-lg"
                  />
                  {formHook.formState.errors.baseSalary && (
                    <p className="text-danger-500 text-xs mt-1">{formHook.formState.errors.baseSalary.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Allowances</label>
                  <input
                    type="number"
                    step="0.01"
                    {...formHook.register('allowances', { valueAsNumber: true })}
                    className="input-aura w-full px-4 py-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Deductions</label>
                  <input
                    type="number"
                    step="0.01"
                    {...formHook.register('deductions', { valueAsNumber: true })}
                    className="input-aura w-full px-4 py-2 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1 px-4 py-2 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary flex-1 px-4 py-2 rounded-lg disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
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
    <div className="fixed inset-0 glass-aura flex items-center justify-center p-4 z-50">
      <div className="skeuo-card rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-main)]">
        <div className="p-6">
          <h2 className="skeuo-emboss text-2xl font-bold mb-6">
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
                    className="input-aura w-full px-4 py-2 rounded-lg"
                  />
                  {formHook.formState.errors.employeeId && (
                    <p className="text-danger-500 text-xs mt-1">{formHook.formState.errors.employeeId.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Effective Date *</label>
                  <input
                    type="date"
                    {...formHook.register('effectiveDate')}
                    className="input-aura w-full px-4 py-2 rounded-lg"
                  />
                  {formHook.formState.errors.effectiveDate && (
                    <p className="text-danger-500 text-xs mt-1">{formHook.formState.errors.effectiveDate.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Base Salary *</label>
                <input
                  type="number"
                  step="0.01"
                  {...formHook.register('baseSalary', { valueAsNumber: true })}
                  className="input-aura w-full px-4 py-2 rounded-lg"
                />
                {formHook.formState.errors.baseSalary && (
                  <p className="text-danger-500 text-xs mt-1">{formHook.formState.errors.baseSalary.message}</p>
                )}
              </div>

              {/* Allowances */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-success-700">Allowances</h3>
                  <button
                    type="button"
                    onClick={() => appendAllowance({ name: '', amount: 0, type: 'FIXED', description: '' })}
                    className="px-4 py-1 text-sm bg-success-100 text-success-700 rounded hover:bg-success-200"
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
                          className="input-aura w-full px-4 py-2 rounded-lg text-sm"
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Amount"
                          {...formHook.register(`allowances.${idx}.amount`, { valueAsNumber: true })}
                          className="input-aura w-full px-4 py-2 rounded-lg text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAllowance(idx)}
                        className="px-2 py-2 bg-danger-100 text-danger-600 rounded hover:bg-danger-200"
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
                  <h3 className="font-semibold text-danger-700">Deductions</h3>
                  <button
                    type="button"
                    onClick={() => appendDeduction({ name: '', amount: 0, type: 'FIXED', description: '' })}
                    className="px-4 py-1 text-sm bg-danger-100 text-danger-700 rounded hover:bg-danger-200"
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
                          className="input-aura w-full px-4 py-2 rounded-lg text-sm"
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Amount"
                          {...formHook.register(`deductions.${idx}.amount`, { valueAsNumber: true })}
                          className="input-aura w-full px-4 py-2 rounded-lg text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDeduction(idx)}
                        className="px-2 py-2 bg-danger-100 text-danger-600 rounded hover:bg-danger-200"
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
                className="btn-secondary flex-1 px-4 py-2 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary flex-1 px-4 py-2 rounded-lg disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
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
    <div className="fixed inset-0 glass-aura flex items-center justify-center p-4 z-50">
      <div className="skeuo-card rounded-xl max-w-md w-full p-6 border border-[var(--border-main)]">
        <h2 className="skeuo-emboss text-xl font-bold mb-4">{title}</h2>
        <p className="text-[var(--text-secondary)] mb-6">{message}</p>
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="btn-secondary flex-1 px-4 py-2 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-danger-600 text-white rounded-lg hover:bg-danger-700 disabled:opacity-50 skeuo-button cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
});
