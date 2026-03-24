'use client';

import { useRouter, useParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoanStatus } from '@/lib/types/loan';
import { useLoan } from '@/lib/hooks/queries/useLoans';
import { loanService } from '@/lib/services/loan.service';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Wallet,
  DollarSign,
  TrendingUp,
  FileText,
  Banknote,
} from 'lucide-react';

export default function LoanDetailPage() {
  const router = useRouter();
  const params = useParams();
  const loanId = params.id as string;

  const { data: loan, isLoading, error } = useLoan(loanId);

  const getStatusConfig = (status: LoanStatus) => {
    const configs: Record<LoanStatus, { bg: string; text: string; icon: typeof Clock }> = {
      PENDING: {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: 'text-amber-700 dark:text-amber-400',
        icon: Clock,
      },
      APPROVED: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-400',
        icon: CheckCircle,
      },
      REJECTED: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-400',
        icon: XCircle,
      },
      DISBURSED: {
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        text: 'text-purple-700 dark:text-purple-400',
        icon: Banknote,
      },
      ACTIVE: {
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        text: 'text-emerald-700 dark:text-emerald-400',
        icon: TrendingUp,
      },
      CLOSED: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-400',
        icon: CheckCircle,
      },
      DEFAULTED: {
        bg: 'bg-red-200 dark:bg-red-900/50',
        text: 'text-red-800 dark:text-red-300',
        icon: AlertCircle,
      },
      CANCELLED: {
        bg: 'bg-[var(--bg-secondary)]',
        text: 'text-[var(--text-secondary)]',
        icon: XCircle,
      },
    };
    return configs[status] || configs.PENDING;
  };

  if (isLoading) {
    return (
      <AppLayout activeMenuItem="loans">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
            <p className="text-[var(--text-secondary)]">Loading loan details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!isLoading && !error && !loan) {
    notFound();
  }

  if (error || !loan) {
    return (
      <AppLayout activeMenuItem="loans">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <p className="text-[var(--text-secondary)]">
              {error instanceof Error ? error.message : 'Loan not found'}
            </p>
            <button
              onClick={() => router.push('/loans')}
              className="px-4 py-2 bg-sky-500 text-white rounded-xl hover:bg-sky-700 transition-colors"
            >
              Back to Loans
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const statusConfig = getStatusConfig(loan.status);
  const StatusIcon = statusConfig.icon;
  const progress = loan.totalAmount
    ? (((loan.paidAmount || 0) / loan.totalAmount) * 100)
    : 0;

  return (
    <AppLayout activeMenuItem="loans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] rounded-xl transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-[var(--text-secondary)]" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
                Loan #{loan.loanNumber || loan.id.slice(0, 8).toUpperCase()}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-lg ${statusConfig.bg} ${statusConfig.text}`}
              >
                <StatusIcon className="h-4 w-4" />
                {loan.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-[var(--text-muted)] mt-1">
              {loanService.getLoanTypeLabel(loan.loanType)}
            </p>
          </div>
        </div>

        {/* Amount Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-5">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm text-[var(--text-muted)]">
                {loan.totalAmount ? 'Total Amount' : 'Principal Amount'}
              </span>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
              {loanService.formatCurrency(loan.totalAmount || loan.principalAmount)}
            </p>
          </div>

          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-5">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm text-[var(--text-muted)]">Amount Repaid</span>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
              {loanService.formatCurrency(loan.paidAmount || 0)}
            </p>
          </div>

          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-5">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <Wallet className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-sm text-[var(--text-muted)]">
                Outstanding Amount
              </span>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
              {loanService.formatCurrency(loan.outstandingAmount || 0)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        {(loan.status === 'ACTIVE' || loan.status === 'DISBURSED') && (
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Repayment Progress
              </h3>
              <span className="text-sm font-medium text-sky-700 dark:text-sky-400">
                {progress.toFixed(1)}% Complete
              </span>
            </div>
            <div className="h-3 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-sky-700 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-sm text-[var(--text-muted)]">
              <span>Paid: {loanService.formatCurrency(loan.paidAmount || 0)}</span>
              <span>Outstanding: {loanService.formatCurrency(loan.outstandingAmount || 0)}</span>
            </div>
          </div>
        )}

        {/* Loan Details */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Loan Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-[var(--text-muted)] mb-1">Interest Rate</p>
              <p className="text-lg font-medium text-[var(--text-primary)]">
                {loan.interestRate}% per annum
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)] mb-1">Loan Term</p>
              <p className="text-lg font-medium text-[var(--text-primary)]">
                {loan.tenureMonths} months
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)] mb-1">EMI Amount</p>
              <p className="text-lg font-medium text-[var(--text-primary)]">
                {loan.emiAmount ? loanService.formatCurrency(loan.emiAmount) : 'N/A'}
              </p>
            </div>
            {loan.paidEmis != null && (
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">EMIs Paid / Remaining</p>
                <p className="text-lg font-medium text-[var(--text-primary)]">
                  {loan.paidEmis} / {loan.remainingEmis ?? 'N/A'}
                </p>
              </div>
            )}
            {loan.firstEmiDate && (
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">First EMI Date</p>
                <p className="text-lg font-medium text-[var(--text-primary)]">
                  {new Date(loan.firstEmiDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            )}
            {loan.requestedDate && (
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">Request Date</p>
                <p className="text-lg font-medium text-[var(--text-primary)]">
                  {new Date(loan.requestedDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Purpose */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
            Purpose
          </h3>
          <p className="text-[var(--text-secondary)]">{loan.purpose}</p>
          {loan.remarks && (
            <>
              <h4 className="text-sm font-medium text-[var(--text-muted)] mt-4 mb-2">
                Additional Remarks
              </h4>
              <p className="text-[var(--text-secondary)]">{loan.remarks}</p>
            </>
          )}
        </div>

        {/* Approval Info */}
        {loan.approvedDate && (
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Approval Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">Approved By</p>
                <p className="text-lg font-medium text-[var(--text-primary)]">
                  {loan.approverName || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">Approved Date</p>
                <p className="text-lg font-medium text-[var(--text-primary)]">
                  {new Date(loan.approvedDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
              {loan.disbursementDate && (
                <div>
                  <p className="text-sm text-[var(--text-muted)] mb-1">Disbursed Date</p>
                  <p className="text-lg font-medium text-[var(--text-primary)]">
                    {new Date(loan.disbursementDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rejection Reason */}
        {loan.status === 'REJECTED' && loan.rejectedReason && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-3">
              <XCircle className="h-5 w-5 text-red-500" />
              <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">
                Rejection Reason
              </h3>
            </div>
            <p className="text-red-600 dark:text-red-300">{loan.rejectedReason}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <button
            onClick={() => router.push('/loans')}
            className="px-6 py-3 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-xl font-medium hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors"
          >
            Back to Loans
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
