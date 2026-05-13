'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {AppLayout} from '@/components/layout/AppLayout';
import {loanService} from '@/lib/services/hrms/loan.service';
import {useAuth} from '@/lib/hooks/useAuth';
import {Permissions} from '@/lib/hooks/usePermissions';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {useEmployeeLoans} from '@/lib/hooks/queries/useLoans';
import {EmptyState} from '@/components/ui/EmptyState';
import {SkeletonStatCard, SkeletonTable} from '@/components/ui/Skeleton';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {LOAN_STATUS} from '@/lib/status/vocabulary';
import {
  AlertCircle,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Plus,
  TrendingUp,
  Wallet,
} from 'lucide-react';

export default function LoansPage() {
  const router = useRouter();
  const {isAuthenticated, hasHydrated} = useAuth();
  const [page] = useState(0);
  const [size] = useState(10);

  // Fetch loans using React Query
  const {data: loansResponse, isLoading: isLoadingLoans, error: queryError, fetchStatus} = useEmployeeLoans(
    page,
    size,
    isAuthenticated && hasHydrated
  );

  // Only show loading when actively fetching (not between retry attempts)
  const loading = isLoadingLoans && fetchStatus === 'fetching';

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

  if (loading) {
    return (
      <AppLayout activeMenuItem="loans">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({length: 4}).map((_, i) => (
              <SkeletonStatCard key={i}/>
            ))}
          </div>
          <SkeletonTable rows={6} columns={5}/>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout activeMenuItem="loans">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="h-8 w-8 text-danger-500"/>
            <p className="text-[var(--text-secondary)]">{error}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="loans">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Employee Loans
            </h1>
            <p className="text-[var(--text-muted)] mt-1">
              Manage your loan applications and repayments
            </p>
          </div>
          <PermissionGate permission={Permissions.LOAN_CREATE}>
            <button
              onClick={() => router.push('/loans/new')}
              className="btn-primary flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            >
              <Plus className="h-5 w-5"/>
              Apply for Loan
            </button>
          </PermissionGate>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="skeuo-card p-4">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 rounded-lg bg-success-100 dark:bg-success-500/10 text-success-600 dark:text-success-400 flex items-center justify-center">
                <CreditCard className="h-5 w-5"/>
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
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 rounded-lg bg-danger-100 dark:bg-danger-500/10 text-danger-600 dark:text-danger-400 flex items-center justify-center">
                <DollarSign className="h-5 w-5"/>
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
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 rounded-lg bg-success-100 dark:bg-success-500/10 text-success-600 dark:text-success-400 flex items-center justify-center">
                <TrendingUp className="h-5 w-5"/>
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
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 rounded-lg bg-warning-100 dark:bg-warning-500/10 text-warning-600 dark:text-warning-400 flex items-center justify-center">
                <Clock className="h-5 w-5"/>
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
          <div className="row-between px-4 py-4 border-b border-[var(--border-main)]">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              My Loans
            </h2>
          </div>

          {loans.length === 0 ? (
            <EmptyState
              icon={<Wallet className="h-12 w-12"/>}
              title="No Loan Requests"
              description="Apply for a loan to get started"
              action={{label: 'Apply for Loan', onClick: () => router.push('/loans/new')}}
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
                          <span className="text-body-secondary">
                            {loanService.getLoanTypeLabel(loan.loanType)}
                          </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {loanService.formatCurrency(loan.totalAmount || loan.principalAmount)}
                          </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                          <span className="text-body-secondary">
                            {loan.tenureMonths} months
                          </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={loan.status} domain={LOAN_STATUS}/>
                      </td>
                      <td className="px-6 py-4 text-right">
                          <span className="text-body-secondary">
                            {loanService.formatCurrency(loan.outstandingAmount || 0)}
                          </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/loans/${loan.id}`);
                          }}
                          className="text-accent-700 dark:text-accent-400 hover:text-accent-700 text-sm font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded px-2 py-1"
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
              className="group card-interactive p-4 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded-lg"
            >
              <div className="row-between mb-4">
                <div
                  className="p-4 rounded-xl bg-accent-100 dark:bg-accent-500/10 text-accent-600 dark:text-accent-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="h-5 w-5"/>
                </div>
                <ChevronRight
                  className="h-5 w-5 text-[var(--text-muted)] group-hover:text-accent-500 group-hover:translate-x-1 transition-all"/>
              </div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-1">
                Apply for Loan
              </h3>
              <p className="text-body-muted">
                Submit a new loan application
              </p>
            </button>
          </PermissionGate>

          <button
            onClick={() => router.push('/loans?filter=active')}
            className="group card-interactive p-4 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded-lg"
          >
            <div className="row-between mb-4">
              <div
                className="p-4 rounded-xl bg-success-100 dark:bg-success-500/10 text-success-600 dark:text-success-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="h-5 w-5"/>
              </div>
              <ChevronRight
                className="h-5 w-5 text-[var(--text-muted)] group-hover:text-success-500 group-hover:translate-x-1 transition-all"/>
            </div>
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-1">
              View Active Loans
            </h3>
            <p className="text-body-muted">
              Check your active loan details and payments
            </p>
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
