'use client';

import {useRouter} from 'next/navigation';
import {useForm} from 'react-hook-form';
import {Permissions} from '@/lib/hooks/usePermissions';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {logger} from '@/lib/utils/logger';
import {AppLayout} from '@/components/layout/AppLayout';
import {LoanType, RepaymentFrequency} from '@/lib/types/hrms/loan';
import {useCreateLoan} from '@/lib/hooks/queries/useLoans';
import {loanService} from '@/lib/services/hrms/loan.service';
import {AlertCircle, ArrowLeft, Calendar, DollarSign, FileText, Loader2, Wallet,} from 'lucide-react';

// ─── Zod Schema ────────────────────────────────────────────────────────────────

const loanFormSchema = z.object({
  loanType: z.enum(['PERSONAL', 'HOME', 'VEHICLE', 'EDUCATION', 'MEDICAL', 'EMERGENCY', 'OTHER']),
  requestedAmount: z
    .number({coerce: true, invalid_type_error: 'Please enter a valid loan amount'})
    .positive('Loan amount must be greater than 0'),
  interestRate: z
    .number({coerce: true, invalid_type_error: 'Please enter a valid interest rate'})
    .min(0, 'Interest rate cannot be negative')
    .max(100, 'Interest rate cannot exceed 100%'),
  termMonths: z
    .number({coerce: true, invalid_type_error: 'Please enter a valid term in months'})
    .int('Term must be a whole number')
    .positive('Loan term must be greater than 0'),
  purpose: z
    .string()
    .min(10, 'Please provide a detailed purpose (at least 10 characters)')
    .max(1000, 'Purpose cannot exceed 1000 characters'),
  repaymentFrequency: z.enum(['MONTHLY', 'BI_WEEKLY', 'WEEKLY']),
  notes: z.string().max(2000, 'Notes cannot exceed 2000 characters').optional().or(z.literal('')),
});

type LoanFormData = z.infer<typeof loanFormSchema>;

// ─── Constants ─────────────────────────────────────────────────────────────────

const LOAN_TYPES: { value: LoanType; label: string }[] = [
  {value: 'PERSONAL', label: 'Personal Loan'},
  {value: 'HOME', label: 'Home Loan'},
  {value: 'VEHICLE', label: 'Vehicle Loan'},
  {value: 'EDUCATION', label: 'Education Loan'},
  {value: 'MEDICAL', label: 'Medical Loan'},
  {value: 'EMERGENCY', label: 'Emergency Loan'},
  {value: 'OTHER', label: 'Other'},
];

const REPAYMENT_FREQUENCIES: { value: RepaymentFrequency; label: string }[] = [
  {value: 'MONTHLY', label: 'Monthly'},
  {value: 'BI_WEEKLY', label: 'Bi-Weekly'},
  {value: 'WEEKLY', label: 'Weekly'},
];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function NewLoanPage() {
  const router = useRouter();
  const createLoanMutation = useCreateLoan();

  const {
    register,
    handleSubmit,
    watch,
    formState: {errors, isSubmitting},
  } = useForm<LoanFormData>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: {
      loanType: 'PERSONAL',
      requestedAmount: 0,
      interestRate: 8.5,
      termMonths: 12,
      purpose: '',
      repaymentFrequency: 'MONTHLY',
      notes: '',
    },
  });

  const watchedAmount = watch('requestedAmount');
  const watchedTerm = watch('termMonths');
  const watchedRate = watch('interestRate');

  const calculateMonthlyPayment = (): number => {
    const principal = Number(watchedAmount) || 0;
    const rate = (Number(watchedRate) || 0) / 100 / 12;
    const n = Number(watchedTerm) || 0;
    if (!principal || !n) return 0;
    if (rate === 0) return principal / n;
    const payment = (principal * rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1);
    return Math.round(payment);
  };

  const onSubmit = async (data: LoanFormData) => {
    try {
      // BUG-FIX: Map form field names to backend CreateLoanRequest DTO fields.
      // Backend expects principalAmount/tenureMonths/remarks, not requestedAmount/termMonths/notes.
      await createLoanMutation.mutateAsync({
        loanType: data.loanType as LoanType,
        principalAmount: data.requestedAmount as number,
        interestRate: data.interestRate as number,
        tenureMonths: data.termMonths as number,
        purpose: data.purpose as string,
        remarks: data.notes || undefined,
      });
      router.push('/loans');
    } catch (err) {
      logger.error('Error creating loan:', err);
    }
  };

  const isLoading = isSubmitting || createLoanMutation.isPending;
  const monthlyPayment = calculateMonthlyPayment();

  return (
    <AppLayout activeMenuItem="loans">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5 text-[var(--text-secondary)]"/>
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">Apply for Loan</h1>
            <p className="text-[var(--text-muted)] mt-1">
              Fill in the details for your loan application
            </p>
          </div>
        </div>

        {createLoanMutation.isError && (
          <div
            className='p-4 bg-status-danger-bg border border-status-danger-border rounded-xl flex items-center gap-4'>
            <AlertCircle className='h-5 w-5 text-status-danger-text flex-shrink-0'/>
            <p className='text-sm text-status-danger-text'>
              Failed to create loan application. Please try again.
            </p>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] p-6 space-y-6"
        >
          {/* Loan Type */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Loan Type *
            </label>
            <select
              {...register('loanType')}
              className="w-full px-4 py-4 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-500"
            >
              {LOAN_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.loanType && (
              <p className='mt-1 text-sm text-status-danger-text'>{errors.loanType.message}</p>
            )}
          </div>

          {/* Loan Amount */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Loan Amount *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]"/>
              <input
                type="number"
                {...register('requestedAmount', {valueAsNumber: true})}
                placeholder="Enter loan amount"
                className={`w-full pl-12 pr-4 py-4 bg-[var(--bg-secondary)] border ${
                  errors.requestedAmount ? "border-status-danger-border" : 'border-[var(--border-main)]'
                } rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-500`}
              />
            </div>
            {errors.requestedAmount && (
              <p className='mt-1 text-sm text-status-danger-text'>{errors.requestedAmount.message}</p>
            )}
          </div>

          {/* Interest Rate */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Interest Rate (% per annum)
            </label>
            <input
              type="number"
              step="0.1"
              {...register('interestRate', {valueAsNumber: true})}
              placeholder="8.5"
              className={`w-full px-4 py-4 bg-[var(--bg-secondary)] border ${
                errors.interestRate ? "border-status-danger-border" : 'border-[var(--border-main)]'
              } rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-500`}
            />
            {errors.interestRate && (
              <p className='mt-1 text-sm text-status-danger-text'>{errors.interestRate.message}</p>
            )}
          </div>

          {/* Term Months */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Loan Term (months) *
            </label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]"/>
              <input
                type="number"
                {...register('termMonths', {valueAsNumber: true})}
                placeholder="12"
                className={`w-full pl-12 pr-4 py-4 bg-[var(--bg-secondary)] border ${
                  errors.termMonths ? "border-status-danger-border" : 'border-[var(--border-main)]'
                } rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-500`}
              />
            </div>
            {errors.termMonths && (
              <p className='mt-1 text-sm text-status-danger-text'>{errors.termMonths.message}</p>
            )}
          </div>

          {/* Repayment Frequency */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Repayment Frequency
            </label>
            <select
              {...register('repaymentFrequency')}
              className="w-full px-4 py-4 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-500"
            >
              {REPAYMENT_FREQUENCIES.map((freq) => (
                <option key={freq.value} value={freq.value}>
                  {freq.label}
                </option>
              ))}
            </select>
            {errors.repaymentFrequency && (
              <p className='mt-1 text-sm text-status-danger-text'>{errors.repaymentFrequency.message}</p>
            )}
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Purpose *
            </label>
            <div className="relative">
              <FileText className="absolute left-4 top-4 h-5 w-5 text-[var(--text-muted)]"/>
              <textarea
                {...register('purpose')}
                placeholder="Describe the purpose of this loan..."
                rows={4}
                className={`w-full pl-12 pr-4 py-4 bg-[var(--bg-secondary)] border ${
                  errors.purpose ? "border-status-danger-border" : 'border-[var(--border-main)]'
                } rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none`}
              />
            </div>
            {errors.purpose && (
              <p className='mt-1 text-sm text-status-danger-text'>{errors.purpose.message}</p>
            )}
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Additional Notes
            </label>
            <textarea
              {...register('notes')}
              placeholder="Any additional information..."
              rows={3}
              className="w-full px-4 py-4 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none"
            />
            {errors.notes && (
              <p className='mt-1 text-sm text-status-danger-text'>{errors.notes.message}</p>
            )}
          </div>

          {/* EMI Calculator */}
          {monthlyPayment > 0 && (
            <div className='bg-gradient-to-br from-accent-500 to-accent-700 rounded-lg p-6 text-inverse'>
              <div className="flex items-center gap-4 mb-4">
                <Wallet className="h-6 w-6"/>
                <h3 className="text-xl font-semibold">Estimated Monthly Payment</h3>
              </div>
              <div className="text-4xl font-bold mb-2">
                {loanService.formatCurrency(monthlyPayment)}
              </div>
              <p className='text-accent text-sm'>
                Based on {watchedRate}% interest rate for {watchedTerm} months
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-4 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-xl font-medium hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            >
              Cancel
            </button>
            <PermissionGate permission={Permissions.LOAN_CREATE}>
              <button
                type="submit"
                disabled={isLoading}
                className='flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-accent-500 to-accent-700 hover:from-accent-700 hover:to-accent-700 text-inverse rounded-xl font-medium shadow-[var(--shadow-dropdown)] shadow-accent-500/25 transition-all duration-200 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin"/>
                    Saving...
                  </>
                ) : (
                  'Submit Application'
                )}
              </button>
            </PermissionGate>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
