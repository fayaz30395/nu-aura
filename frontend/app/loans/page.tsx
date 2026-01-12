'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { loanService } from '@/lib/services/loan.service';
import { EmployeeLoan, LoanStatus } from '@/lib/types/loan';
import { useAuth } from '@/lib/hooks/useAuth';
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
  const { user, isAuthenticated, hasHydrated } = useAuth();
  const [loans, setLoans] = useState<EmployeeLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    activeLoans: 0,
    totalOutstanding: 0,
    totalRepaid: 0,
    pendingApprovals: 0,
  });

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadData();
  }, [isAuthenticated, hasHydrated, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const loansData = await loanService.getMyLoans(0, 10);
      setLoans(loansData.content);

      // Calculate summary from loans
      const activeLoans = loansData.content.filter(l =>
        l.status === 'ACTIVE' || l.status === 'DISBURSED'
      );
      const totalOutstanding = activeLoans.reduce((sum, l) => sum + l.remainingBalance, 0);
      const totalRepaid = loansData.content.reduce((sum, l) => sum + l.amountRepaid, 0);
      const pendingApprovals = loansData.content.filter(l => l.status === 'PENDING_APPROVAL').length;

      setSummary({
        activeLoans: activeLoans.length,
        totalOutstanding,
        totalRepaid,
        pendingApprovals,
      });
    } catch (error) {
      console.error('Error loading loans data:', error);
      setError('Failed to load loans data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: LoanStatus) => {
    const configs: Record<LoanStatus, { bg: string; text: string; icon: typeof Clock }> = {
      DRAFT: {
        bg: 'bg-surface-100 dark:bg-surface-800',
        text: 'text-surface-600 dark:text-surface-400',
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
            <p className="text-surface-600 dark:text-surface-400">Loading loans data...</p>
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
            <p className="text-surface-600 dark:text-surface-400">{error}</p>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
            >
              Retry
            </button>
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
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
              Employee Loans
            </h1>
            <p className="text-surface-500 dark:text-surface-400 mt-1">
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
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
              Active Loans
            </h3>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-surface-900 dark:text-surface-50">
                {summary.activeLoans}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-red-600">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
              Outstanding Balance
            </h3>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-surface-900 dark:text-surface-50">
                {loanService.formatCurrency(summary.totalOutstanding)}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
              Total Repaid
            </h3>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-surface-900 dark:text-surface-50">
                {loanService.formatCurrency(summary.totalRepaid)}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
              Pending Approvals
            </h3>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-surface-900 dark:text-surface-50">
                {summary.pendingApprovals}
              </span>
            </div>
          </div>
        </div>

        {/* Loans List */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-surface-200 dark:border-surface-800">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
              My Loans
            </h2>
          </div>

          {loans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-12 w-12 text-surface-300 dark:text-surface-600 mb-4" />
              <p className="text-surface-500 dark:text-surface-400">No loan applications found</p>
              <button
                onClick={() => router.push('/loans/new')}
                className="mt-4 text-primary-600 dark:text-primary-400 hover:text-primary-700 text-sm font-medium"
              >
                Apply for your first loan
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-50 dark:bg-surface-800/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Loan #
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Term
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
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
                        className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/loans/${loan.id}`)}
                      >
                        <td className="px-5 py-4">
                          <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                            {loan.loanNumber || loan.id.slice(0, 8).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-surface-700 dark:text-surface-300">
                            {loanService.getLoanTypeLabel(loan.loanType)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                            {loanService.formatCurrency(loan.approvedAmount || loan.requestedAmount)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-surface-600 dark:text-surface-400">
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
                          <span className="text-sm text-surface-700 dark:text-surface-300">
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
            className="group bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-200 text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 group-hover:scale-110 transition-transform">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <ChevronRight className="h-5 w-5 text-surface-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-1">
              Apply for Loan
            </h3>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Submit a new loan application
            </p>
          </button>

          <button
            onClick={() => router.push('/loans?filter=active')}
            className="group bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200 text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 group-hover:scale-110 transition-transform">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <ChevronRight className="h-5 w-5 text-surface-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-1">
              View Active Loans
            </h3>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Check your active loan details and payments
            </p>
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
