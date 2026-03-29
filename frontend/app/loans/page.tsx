'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { loanService } from '@/lib/services/loan.service';
import { LoanStatus } from '@/lib/types/loan';
import { useAuth } from '@/lib/hooks/useAuth';
import { Permissions } from '@/lib/hooks/usePermissions';
import { PermissionGate } from '@/components/auth/PermissionGate';
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

  // Extract loans from the paginated response
  // loansResponse should be a Page<EmployeeLoan> with a 'content' array
  const loans = Array.isArray(loansResponse?.content)
    ? loansResponse.content
    : Array.isArray(loansResponse)
    ? loansResponse
    : [];
  const error = queryError ? 'Failed to load loans data' : null;

  // Calculate summary from loans
  const activeLoans = loans.filter((l) =>
    l.status === 'ACTIVE' || l.status === 'DISBURSED'
  );
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + (l.outstandingAmount || 0), 0);
  const totalRepaid = loans.reduce((sum, l) => sum + (l.paidAmount || 0), 0);
  const pendingApprovals = loans.filter((l) => l.status === 'PENDING').length;

  const summary = {
    activeLoans: activeLoans.length,
    totalOutstanding,
    totalRepaid,
    pendingApprovals,
  };

  const getStatusConfig = (status: LoanStatus) => {
    const configs: Record<LoanStatus, { bg: string; text: string; icon: typeof Clock }> = {
      PENDING: {
        bg: 'bg-warning-100 dark:bg-warning-900/30',
        text: 'text-warning-700 dark:text-warning-400',
        icon: Clock,
      },
      APPROVED: {
        bg: 'bg-accent-100 dark:bg-accent-900/30',
        text: 'text-accent-700 dark:text-accent-400',
        icon: CheckCircle,
      },
      REJECTED: {
        bg: 'bg-danger-100 dark:bg-danger-900/30',
        text: 'text-danger-700 dark:text-danger-400',
        icon: XCircle,
      },
      DISBURSED: {
        bg: 'bg-accent-300 dark:bg-accent-900/30',
        text: 'text-accent-900 dark:text-accent-600',
        icon: Banknote,
      },
      ACTIVE: {
        bg: 'bg-success-100 dark:bg-success-900/30',
        text: 'text-success-700 dark:text-success-400',
        icon: TrendingUp,
      },
      CLOSED: {
        bg: 'bg-success-100 dark:bg-success-900/30',
        text: 'text-success-700 dark:text-success-400',
        icon: CheckCircle,
      },
      DEFAULTED: {
        bg: 'bg-danger-200 dark:bg-danger-900/50',
        text: 'text-danger-800 dark:text-danger-300',
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

  if (loading) {
    return (
      <AppLayout activeMenuItem="loans">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
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
            <AlertCircle className="h-12 w-12 text-danger-500" />
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
            <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
              Employee Loans
            </h1>
            <p className="text-[var(--text-muted)] mt-1 skeuo-deboss">
              Manage your loan applications and repayments
            </p>
          </div>
          <PermissionGate permission={Permissions.LOAN_CREATE}>
            <button
              onClick={() => router.push('/loans/new')}
              className="btn-primary flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Apply for Loan
            </button>
          </PermissionGate>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="skeuo-card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-success-500 to-success-600">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">
              Active Loans
            </h3>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-[var(--text-primary)]">
                {summary.activeLoans}
              </span>
            </div>
          </div>

          <div className="skeuo-card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-danger-500 to-danger-600">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">
              Outstanding Balance
            </h3>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-[var(--text-primary)]">
                {loanService.formatCurrency(summary.totalOutstanding)}
              </span>
            </div>
          </div>

          <div className="skeuo-card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-success-500 to-success-600">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">
              Total Repaid
            </h3>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-[var(--text-primary)]">
                {loanService.formatCurrency(summary.totalRepaid)}
              </span>
            </div>
          </div>

          <div className="skeuo-card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-warning-500 to-warning-600">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">
              Pending Approvals
            </h3>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-[var(--text-primary)]">
                {summary.pendingApprovals}
              </span>
            </div>
          </div>
        </div>

        {/* Loans List */}
        <div className="skeuo-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border-main)]">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
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
              <table className="table-aura">
                <thead>
                  <tr className="skeuo-table-header">
                    <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)]">
                      Loan #
                    </th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)]">
                      Type
                    </th>
                    <th className="px-6 py-2 text-right text-xs font-medium text-[var(--text-muted)]">
                      Amount
                    </th>
                    <th className="px-6 py-2 text-right text-xs font-medium text-[var(--text-muted)]">
                      Term
                    </th>
                    <th className="px-6 py-2 text-center text-xs font-medium text-[var(--text-muted)]">
                      Status
                    </th>
                    <th className="px-6 py-2 text-right text-xs font-medium text-[var(--text-muted)]">
                      Balance
                    </th>
                    <th className="px-6 py-2 text-right text-xs font-medium text-[var(--text-muted)]">
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
                        className="h-11 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/loans/${loan.id}`)}
                      >
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {loan.loanNumber || loan.id.slice(0, 8).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-[var(--text-secondary)]">
                            {loanService.getLoanTypeLabel(loan.loanType)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {loanService.formatCurrency(loan.totalAmount || loan.principalAmount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm text-[var(--text-secondary)]">
                            {loan.tenureMonths} months
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg justify-center ${statusConfig.bg} ${statusConfig.text}`}
                          >
                            <StatusIcon className="h-3.5 w-3.5" />
                            {loan.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm text-[var(--text-secondary)]">
                            {loanService.formatCurrency(loan.outstandingAmount || 0)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/loans/${loan.id}`);
                            }}
                            className="text-accent-700 dark:text-accent-400 hover:text-accent-700 text-sm font-medium"
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
          <PermissionGate permission={Permissions.LOAN_CREATE}>
            <button
              onClick={() => router.push('/loans/new')}
              className="group card-interactive p-4 text-left"
            >
            <div className="flex items-center justify-between mb-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 group-hover:scale-110 transition-transform">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <ChevronRight className="h-5 w-5 text-[var(--text-muted)] group-hover:text-accent-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-1">
              Apply for Loan
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              Submit a new loan application
            </p>
            </button>
          </PermissionGate>

          <button
            onClick={() => router.push('/loans?filter=active')}
            className="group card-interactive p-4 text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-success-500 to-success-600 group-hover:scale-110 transition-transform">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <ChevronRight className="h-5 w-5 text-[var(--text-muted)] group-hover:text-success-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-1">
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
