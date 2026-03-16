'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { loanService } from '@/lib/services/loan.service';
import { LoanStatus } from '@/lib/types/loan';
import { useAuth } from '@/lib/hooks/useAuth';
import { useEmployeeLoans } from '@/lib/hooks/queries/useLoans';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Wallet,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  DollarSign,
  CreditCard,
  Loader2,
  FileText,
  TrendingUp,
  Banknote,
} from 'lucide-react';

export default function LoansPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const [page] = useState(0);
  const [size] = useState(10);

  // Fetch loans using React Query
  const { data: loansResponse, isLoading: loading, error: queryError } = useEmployeeLoans(
    page,
    size,
    isAuthenticated && hasHydrated
  );

  const loans = loansResponse?.content ?? [];
  const error = queryError ? 'Failed to load loans data' : null;

  // Calculate summary from loans
  const activeLoans = loans.filter((l) =>
    l.status === 'ACTIVE' || l.status === 'DISBURSED'
  );
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + l.remainingBalance, 0);
  const totalRepaid = loans.reduce((sum, l) => sum + l.amountRepaid, 0);
  const pendingApprovals = loans.filter((l) => l.status === 'PENDING_APPROVAL').length;

  const summary = {
    activeLoans: activeLoans.length,
    totalOutstanding,
    totalRepaid,
    pendingApprovals,
  };

  const getStatusConfig = (status: LoanStatus) => {
    const configs: Record<LoanStatus, { bg: string; text: string; icon: typeof Clock }> = {
      DRAFT: {
        bg: 'bg-[var(--bg-secondary)]',
        text: 'text-[var(--text-secondary)]',
        icon: FileText,
      },
      PENDING_APPROVAL: {
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
    };
    return configs[status] || configs.DRAFT;
  };

  if (loading) {
    return (
      <AppLayout activeMenuItem="loans">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            <p className="text-[var(--text-secondary)]">Loading loans data...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout activeMenuItem="loans">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <p className="text-[var(--text-secondary)]">{error}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="loans">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Employee Loans
            </h1>
            <p className="text-[var(--text-muted)] mt-1">
              Manage your loan applications and repayments
            </p>
          </div>
          <button
            onClick={() => router.push('/loans/new')}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-medium shadow-lg shadow-primary-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-primary-500/30"
          >
            <Plus className="h-5 w-5" />
            Apply for Loan
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">
              Active Loans
            </h3>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-[var(--text-primary)]">
                {summary.activeLoans}
              </span>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-red-500 to-red-600">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">
              Outstanding Balance
            </h3>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-[var(--text-primary)]">
                {loanService.formatCurrency(summary.totalOutstanding)}
              </span>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-green-500 to-green-600">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">
              Total Repaid
            </h3>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-[var(--text-primary)]">
                {loanService.formatCurrency(summary.totalRepaid)}
              </span>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">
              Pending Approvals
            </h3>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-[var(--text-primary)]">
                {summary.pendingApprovals}
              </span>
            </div>
          </div>
        </div>

        {/* Loans List */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[var(--border-main)]">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              My Loans
            </h2>
          </div>

          {loans.length === 0 ? (
            <EmptyState
              icon={<Wallet className="h-12 w-12" />}
              title="No Loan Requests"
              description="Apply for a loan to get started"
              action={{ label: 'Apply for Loan', onClick: () => router.push('/loans/new') }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[var(--bg-secondary)]/50">
                    <th className="px-5 py-3 text-left text-xs font-medium text-[var(--text-muted)]">
                      Loan #
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-[var(--text-muted)]">
                      Type
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-[var(--text-muted)]">
                      Amount
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-[var(--text-muted)]">
                      Term
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-[var(--text-muted)]">
                      Status
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-[var(--text-muted)]">
                      Balance
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-[var(--text-muted)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                  {loans.map((loan) => {
                    const statusConfig = getStatusConfig(loan.status);
                    const StatusIcon = statusConfig.icon;

                    return (
                      <tr
                        key={loan.id}
                        className="hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/loans/${loan.id}`)}
                      >
                        <td className="px-5 py-4">
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {loan.loanNumber || loan.id.slice(0, 8).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-[var(--text-secondary)]">
                            {loanService.getLoanTypeLabel(loan.loanType)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {loanService.formatCurrency(loan.approvedAmount || loan.requestedAmount)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-[var(--text-secondary)]">
                            {loan.termMonths} months
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg ${statusConfig.bg} ${statusConfig.text}`}
                          >
                            <StatusIcon className="h-3.5 w-3.5" />
                            {loan.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-[var(--text-secondary)]">
                            {loanService.formatCurrency(loan.remainingBalance)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/loans/${loan.id}`);
                            }}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 text-sm font-medium"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => router.push('/loans/new')}
            className="group bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-6 hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-200 text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 group-hover:scale-110 transition-transform">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <ChevronRight className="h-5 w-5 text-[var(--text-muted)] group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
              Apply for Loan
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              Submit a new loan application
            </p>
          </button>

          <button
            onClick={() => router.push('/loans?filter=active')}
            className="group bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-6 hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200 text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 group-hover:scale-110 transition-transform">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <ChevronRight className="h-5 w-5 text-[var(--text-muted)] group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
              View Active Loans
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              Check your active loan details and payments
            </p>
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
