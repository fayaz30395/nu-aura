'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {motion} from 'framer-motion';
import {AppLayout} from '@/components/layout/AppLayout';
import {PageTransition, Reveal} from '@/components/motion';
import {loanService} from '@/lib/services/hrms/loan.service';
import {useAuth} from '@/lib/hooks/useAuth';
import {Permissions} from '@/lib/hooks/usePermissions';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {useEmployeeLoans} from '@/lib/hooks/queries/useLoans';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
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
        <div className="flex items-center justify-center h-[calc(100dvh-200px)]">
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
      <PageTransition className="mx-auto w-full max-w-7xl px-6 py-8 space-y-8">
        {/* Header */}
        <motion.header
          initial={{opacity: 0, y: 4}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.4, ease: [0.16, 1, 0.3, 1]}}
          className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start"
        >
          <div className="space-y-1.5 max-w-2xl">
            <h1 className="text-aura-title text-[var(--text-1)]">
              Employee Loans
            </h1>
            <p className="text-sm text-[var(--text-3)]">
              Manage your loan applications and repayments
            </p>
          </div>
          <PermissionGate permission={Permissions.LOAN_CREATE}>
            <Button
              onClick={() => router.push('/loans/new')}
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
            >
              Apply for Loan
            </Button>
          </PermissionGate>
        </motion.header>

        {/* Summary Cards */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{visible: {transition: {staggerChildren: 0.06, delayChildren: 0.08}}}}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <Reveal delay={0.08}>
            <Card className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-[color-mix(in_srgb,var(--ok-fg)_12%,transparent)] text-[var(--ok-fg)] flex items-center justify-center">
                  <CreditCard className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-3)] mb-2">
                Active Loans
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="num text-aura-stat text-[var(--text-1)]">
                  {summary.activeLoans}
                </span>
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.12}>
            <Card className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-[color-mix(in_srgb,var(--err-fg)_12%,transparent)] text-[var(--err-fg)] flex items-center justify-center">
                  <DollarSign className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-3)] mb-2">
                Outstanding Balance
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="num text-aura-stat text-[var(--text-1)]">
                  {loanService.formatCurrency(summary.totalOutstanding)}
                </span>
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.14}>
            <Card className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-[color-mix(in_srgb,var(--ok-fg)_12%,transparent)] text-[var(--ok-fg)] flex items-center justify-center">
                  <TrendingUp className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-3)] mb-2">
                Total Repaid
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="num text-aura-stat text-[var(--text-1)]">
                  {loanService.formatCurrency(summary.totalRepaid)}
                </span>
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.16}>
            <Card className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-[color-mix(in_srgb,var(--warn-fg)_12%,transparent)] text-[var(--warn-fg)] flex items-center justify-center">
                  <Clock className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-3)] mb-2">
                Pending Approvals
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="num text-aura-stat text-[var(--text-1)]">
                  {summary.pendingApprovals}
                </span>
              </div>
            </Card>
          </Reveal>
        </motion.div>

        {/* Loans List */}
        <Reveal delay={0.14}>
          <Card className="overflow-hidden">
            <div className="row-between px-6 py-5 border-b border-[var(--border)]">
              <motion.h2 className="text-aura-title text-[var(--text-1)]">
                My Loans
              </motion.h2>
            </div>

            {loans.length === 0 ? (
              <EmptyState
                icon={<Wallet className="h-12 w-12"/>}
                title="No loan requests yet"
                description="Apply for a loan to request an advance against your salary. Your requests and repayment schedule will appear here."
                action={{label: 'Apply for Loan', onClick: () => router.push('/loans/new')}}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                  <tr className="bg-[color-mix(in_srgb,var(--surface)_50%,transparent)] border-b border-[var(--border)]">
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">
                      Loan #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">
                      Type
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">
                      Term
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">
                      Actions
                    </th>
                  </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                  {loans.map((loan) => {
                    return (
                      <tr
                        key={loan.id}
                        className="h-12 hover:bg-[color-mix(in_srgb,var(--accent-fg)_8%,transparent)] transition-colors cursor-pointer"
                        onClick={() => router.push(`/loans/${loan.id}`)}
                      >
                        <td className="px-6 py-4">
                            <span className="num text-sm font-medium text-[var(--text-2)]">
                              {loan.loanNumber || loan.id.slice(0, 8).toUpperCase()}
                            </span>
                        </td>
                        <td className="px-6 py-4">
                            <span className="text-sm text-[var(--text-2)]">
                              {loanService.getLoanTypeLabel(loan.loanType)}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                            <span className="num text-sm font-medium text-[var(--text-2)]">
                              {loanService.formatCurrency(loan.totalAmount || loan.principalAmount)}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                            <span className="num text-sm text-[var(--text-2)]">
                              {loan.tenureMonths} months
                            </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <StatusBadge status={loan.status} domain={LOAN_STATUS}/>
                        </td>
                        <td className="px-6 py-4 text-right">
                            <span className="num text-sm font-medium text-[var(--text-2)]">
                              {loanService.formatCurrency(loan.outstandingAmount || 0)}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/loans/${loan.id}`);
                            }}
                            className="text-[var(--accent-fg)] hover:text-[var(--accent-fg)] text-sm font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-fg)] focus-visible:ring-offset-2 rounded px-2 py-1 transition-colors"
                            aria-label={`View details for loan ${loan.loanNumber || loan.id.slice(0, 8)}`}
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
          </Card>
        </Reveal>

        {/* Quick Actions */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{visible: {transition: {staggerChildren: 0.05, delayChildren: 0.16}}}}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <Reveal delay={0.16}>
            <PermissionGate permission={Permissions.LOAN_CREATE}>
              <button
                onClick={() => router.push('/loans/new')}
                className="group hover-lift focus-visible:ring-2 focus-visible:ring-[var(--accent-fg)] focus-visible:ring-offset-2 rounded-lg"
              >
                <Card className="p-5 text-left cursor-pointer">
                  <div className="row-between mb-4">
                    <div className="p-3 rounded-lg bg-[color-mix(in_srgb,var(--accent-fg)_12%,transparent)] text-[var(--accent-fg)] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Plus className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <ChevronRight
                      className="h-5 w-5 text-[var(--text-3)] group-hover:text-[var(--accent-fg)] group-hover:translate-x-1 transition-all"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="text-aura-micro text-[var(--text-1)] mb-1">
                    Apply for Loan
                  </h3>
                  <p className="text-xs text-[var(--text-3)]">
                    Submit a new loan application
                  </p>
                </Card>
              </button>
            </PermissionGate>
          </Reveal>

          <Reveal delay={0.18}>
            <button
              onClick={() => router.push('/loans?filter=active')}
              className="group hover-lift focus-visible:ring-2 focus-visible:ring-[var(--ok-fg)] focus-visible:ring-offset-2 rounded-lg"
            >
              <Card className="p-5 text-left cursor-pointer">
                <div className="row-between mb-4">
                  <div className="p-3 rounded-lg bg-[color-mix(in_srgb,var(--ok-fg)_12%,transparent)] text-[var(--ok-fg)] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <ChevronRight
                    className="h-5 w-5 text-[var(--text-3)] group-hover:text-[var(--ok-fg)] group-hover:translate-x-1 transition-all"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-aura-micro text-[var(--text-1)] mb-1">
                  View Active Loans
                </h3>
                <p className="text-xs text-[var(--text-3)]">
                  Check your active loan details and payments
                </p>
              </Card>
            </button>
          </Reveal>
        </motion.div>
      </PageTransition>
    </AppLayout>
  );
}
