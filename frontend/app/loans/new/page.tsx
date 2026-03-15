'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/utils/logger';
import { AppLayout } from '@/components/layout/AppLayout';
import { CreateLoanRequest, LoanType, RepaymentFrequency } from '@/lib/types/loan';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCreateLoan } from '@/lib/hooks/queries/useLoans';
import { loanService } from '@/lib/services/loan.service';
import {
  ArrowLeft,
  Wallet,
  Loader2,
  AlertCircle,
  DollarSign,
  Calendar,
  FileText,
} from 'lucide-react';

export default function NewLoanPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const createLoanMutation = useCreateLoan();

  const [formData, setFormData] = useState<CreateLoanRequest>({
    loanType: 'PERSONAL',
    requestedAmount: 0,
    interestRate: 8.5,
    termMonths: 12,
    purpose: '',
    repaymentFrequency: 'MONTHLY',
    notes: '',
  });

  const loanTypes: { value: LoanType; label: string }[] = [
    { value: 'PERSONAL', label: 'Personal Loan' },
    { value: 'HOME', label: 'Home Loan' },
    { value: 'VEHICLE', label: 'Vehicle Loan' },
    { value: 'EDUCATION', label: 'Education Loan' },
    { value: 'MEDICAL', label: 'Medical Loan' },
    { value: 'EMERGENCY', label: 'Emergency Loan' },
    { value: 'OTHER', label: 'Other' },
  ];

  const repaymentFrequencies: { value: RepaymentFrequency; label: string }[] = [
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'BI_WEEKLY', label: 'Bi-Weekly' },
    { value: 'WEEKLY', label: 'Weekly' },
  ];

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.requestedAmount || formData.requestedAmount <= 0) {
      errors.requestedAmount = 'Please enter a valid loan amount';
    }

    if (!formData.termMonths || formData.termMonths <= 0) {
      errors.termMonths = 'Please enter a valid term in months';
    }

    if (!formData.purpose || formData.purpose.trim().length < 10) {
      errors.purpose = 'Please provide a detailed purpose (at least 10 characters)';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const calculateMonthlyPayment = (): number => {
    const principal = formData.requestedAmount;
    const rate = (formData.interestRate || 0) / 100 / 12;
    const n = formData.termMonths;

    if (rate === 0) return principal / n;

    const payment = (principal * rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1);
    return Math.round(payment);
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    if (!isDraft && !validateForm()) return;

    try {
      setError(null);

      const loan = await createLoanMutation.mutateAsync(formData);

      // If not draft, we should submit it (would need a separate mutation)
      // For now, just redirect
      router.push('/loans');
    } catch (err) {
      logger.error('Error creating loan:', err);
      setError('Failed to create loan application');
    }
  };

  const isLoading = createLoanMutation.isPending;

  return (
    <AppLayout activeMenuItem="loans">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-surface-600 dark:text-surface-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
              Apply for Loan
            </h1>
            <p className="text-surface-500 dark:text-surface-400 mt-1">
              Fill in the details for your loan application
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-surface-200 dark:border-surface-800 p-6 space-y-6">
          {/* Loan Type */}
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              Loan Type *
            </label>
            <select
              value={formData.loanType}
              onChange={(e) => setFormData({ ...formData, loanType: e.target.value as LoanType })}
              className="w-full px-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {loanTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Loan Amount */}
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              Loan Amount *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-surface-400" />
              <input
                type="number"
                value={formData.requestedAmount || ''}
                onChange={(e) =>
                  setFormData({ ...formData, requestedAmount: parseFloat(e.target.value) || 0 })
                }
                placeholder="Enter loan amount"
                className={`w-full pl-12 pr-4 py-3 bg-surface-50 dark:bg-surface-800 border ${
                  validationErrors.requestedAmount
                    ? 'border-red-500'
                    : 'border-surface-200 dark:border-surface-700'
                } rounded-xl text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500`}
              />
            </div>
            {validationErrors.requestedAmount && (
              <p className="mt-1 text-sm text-red-500">{validationErrors.requestedAmount}</p>
            )}
          </div>

          {/* Interest Rate */}
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              Interest Rate (% per annum)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.interestRate || ''}
              onChange={(e) =>
                setFormData({ ...formData, interestRate: parseFloat(e.target.value) || 0 })
              }
              placeholder="8.5"
              className="w-full px-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Term Months */}
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              Loan Term (months) *
            </label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-surface-400" />
              <input
                type="number"
                value={formData.termMonths || ''}
                onChange={(e) =>
                  setFormData({ ...formData, termMonths: parseInt(e.target.value) || 0 })
                }
                placeholder="12"
                className={`w-full pl-12 pr-4 py-3 bg-surface-50 dark:bg-surface-800 border ${
                  validationErrors.termMonths
                    ? 'border-red-500'
                    : 'border-surface-200 dark:border-surface-700'
                } rounded-xl text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500`}
              />
            </div>
            {validationErrors.termMonths && (
              <p className="mt-1 text-sm text-red-500">{validationErrors.termMonths}</p>
            )}
          </div>

          {/* Repayment Frequency */}
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              Repayment Frequency
            </label>
            <select
              value={formData.repaymentFrequency}
              onChange={(e) =>
                setFormData({ ...formData, repaymentFrequency: e.target.value as RepaymentFrequency })
              }
              className="w-full px-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {repaymentFrequencies.map((freq) => (
                <option key={freq.value} value={freq.value}>
                  {freq.label}
                </option>
              ))}
            </select>
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              Purpose *
            </label>
            <div className="relative">
              <FileText className="absolute left-4 top-4 h-5 w-5 text-surface-400" />
              <textarea
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                placeholder="Describe the purpose of this loan..."
                rows={4}
                className={`w-full pl-12 pr-4 py-3 bg-surface-50 dark:bg-surface-800 border ${
                  validationErrors.purpose
                    ? 'border-red-500'
                    : 'border-surface-200 dark:border-surface-700'
                } rounded-xl text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none`}
              />
            </div>
            {validationErrors.purpose && (
              <p className="mt-1 text-sm text-red-500">{validationErrors.purpose}</p>
            )}
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              Additional Notes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional information..."
              rows={3}
              className="w-full px-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
        </div>

        {/* EMI Calculator */}
        {formData.requestedAmount > 0 && formData.termMonths > 0 && (
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <Wallet className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Estimated Monthly Payment</h3>
            </div>
            <div className="text-4xl font-bold mb-2">
              {loanService.formatCurrency(calculateMonthlyPayment())}
            </div>
            <p className="text-primary-100 text-sm">
              Based on {formData.interestRate}% interest rate for {formData.termMonths} months
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 rounded-xl font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit(true)}
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-xl font-medium hover:bg-surface-300 dark:hover:bg-surface-600 transition-colors disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            onClick={() => handleSubmit(false)}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-medium shadow-lg shadow-primary-500/25 transition-all duration-200 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              'Submit Application'
            )}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
