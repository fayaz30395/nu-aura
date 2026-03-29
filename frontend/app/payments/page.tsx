'use client';

import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout';
import {
  CreditCard,
  Filter,
  ChevronDown,
  Search,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePayments, usePaymentStats } from '@/lib/hooks/queries/usePayments';
import { paymentService } from '@/lib/services/payment.service';
import {
  PaymentStatus,
  PaymentType,
  PaymentProvider,
} from '@/lib/types/payment';
import { EmptyState } from '@/components/ui';
import { format, startOfMonth, endOfMonth } from 'date-fns';

// Phase 2 stabilization: payments module gated behind feature flag
const _PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true';

type TabType = 'all' | 'completed' | 'failed' | 'pending';

interface Filters {
  status: PaymentStatus | 'ALL';
  type: PaymentType | 'ALL';
  provider: PaymentProvider | 'ALL';
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
  search: string;
}

export default function PaymentsPage() {
  const { hasHydrated } = useAuth();

  // All hooks must be called unconditionally before any early returns
  const { data: paymentsData, isLoading: paymentsLoading } = usePayments();
  const { data: statsData } = usePaymentStats();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    status: 'ALL',
    type: 'ALL',
    provider: 'ALL',
    dateFrom: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    dateTo: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    amountMin: '',
    amountMax: '',
    search: '',
  });

  // Stable reference: prevents filteredPayments useMemo from re-running on every render.
  const payments = useMemo(() => paymentsData?.content ?? [], [paymentsData]);

  // Filter payments based on active tab and filters
  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      // Tab filter
      if (activeTab === 'completed' && payment.status !== 'COMPLETED') return false;
      if (activeTab === 'failed' && payment.status !== 'FAILED') return false;
      if (activeTab === 'pending' && !['INITIATED', 'PROCESSING'].includes(payment.status)) return false;

      // Status filter
      if (filters.status !== 'ALL' && payment.status !== filters.status) return false;

      // Type filter
      if (filters.type !== 'ALL' && payment.paymentType !== filters.type) return false;

      // Provider filter
      if (filters.provider !== 'ALL' && payment.provider !== filters.provider) return false;

      // Date range filter
      const paymentDate = new Date(payment.paymentDate);
      if (filters.dateFrom && paymentDate < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && paymentDate > new Date(filters.dateTo)) return false;

      // Amount range filter
      if (filters.amountMin && payment.amount < parseFloat(filters.amountMin)) return false;
      if (filters.amountMax && payment.amount > parseFloat(filters.amountMax)) return false;

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          payment.transactionReference?.toLowerCase().includes(searchLower) ||
          payment.payeeName?.toLowerCase().includes(searchLower) ||
          payment.description?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [payments, activeTab, filters]);

  const clearFilters = () => {
    setFilters({
      status: 'ALL',
      type: 'ALL',
      provider: 'ALL',
      dateFrom: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      dateTo: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
      amountMin: '',
      amountMax: '',
      search: '',
    });
  };

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-success-600" />;
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-danger-600" />;
      case 'PROCESSING':
      case 'INITIATED':
        return <Clock className="w-5 h-5 text-warning-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-[var(--text-secondary)]" />;
    }
  };

  if (!hasHydrated) {
    return (
      <AppLayout activeMenuItem="payments">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="payments">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] flex items-center gap-2 skeuo-emboss">
              <CreditCard className="w-7 h-7 sm:w-8 sm:h-8" />
              Payment Gateway
            </h1>
            <p className="text-[var(--text-secondary)] mt-1 skeuo-deboss">
              Monitor and manage payment transactions
            </p>
          </div>
        </div>

        {/* Statistics */}
        {statsData && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-[var(--bg-input)] rounded-lg p-4 border border-[var(--border-main)]">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-accent-100 dark:bg-accent-900/30 text-accent-700">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    {statsData.totalTransactions}
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">Total Transactions</p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--bg-input)] rounded-lg p-4 border border-[var(--border-main)]">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-success-100 dark:bg-success-900/30 text-success-600">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    {statsData.completedTransactions}
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">Completed</p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--bg-input)] rounded-lg p-4 border border-[var(--border-main)]">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-warning-100 dark:bg-warning-900/30 text-warning-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    {statsData.processingTransactions}
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">Processing</p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--bg-input)] rounded-lg p-4 border border-[var(--border-main)]">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-error-100 dark:bg-error-900/30 text-error-600">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    {statsData.failedTransactions}
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">Failed</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters Bar */}
        <div className="bg-[var(--bg-input)] rounded-lg p-4 mb-6 border border-[var(--border-main)]">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)]"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${
                showFilters
                  ? 'border-accent-500 text-accent-700 bg-accent-50 dark:bg-accent-900/20'
                  : 'border-[var(--border-main)] dark:border-[var(--border-main)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* Clear Filters */}
            {(filters.status !== 'ALL' ||
              filters.type !== 'ALL' ||
              filters.provider !== 'ALL' ||
              filters.amountMin ||
              filters.amountMax) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)]"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-[var(--border-main)]">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value as PaymentStatus | 'ALL' })}
                  className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="INITIATED">Initiated</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FAILED">Failed</option>
                  <option value="REFUNDED">Refunded</option>
                  <option value="PARTIAL_REFUND">Partially Refunded</option>
                  <option value="REVERSED">Reversed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Type
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value as PaymentType | 'ALL' })}
                  className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)]"
                >
                  <option value="ALL">All Types</option>
                  <option value="PAYROLL">Payroll</option>
                  <option value="EXPENSE_REIMBURSEMENT">Expense Reimbursement</option>
                  <option value="LOAN">Loan</option>
                  <option value="BENEFIT_PAYMENT">Benefit Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Provider
                </label>
                <select
                  value={filters.provider}
                  onChange={(e) => setFilters({ ...filters, provider: e.target.value as PaymentProvider | 'ALL' })}
                  className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)]"
                >
                  <option value="ALL">All Providers</option>
                  <option value="RAZORPAY">Razorpay</option>
                  <option value="STRIPE">Stripe</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="PAYPAL">PayPal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Date From
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Date To
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)]"
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Min Amount
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={filters.amountMin}
                    onChange={(e) => setFilters({ ...filters, amountMin: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)]"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Max Amount
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={filters.amountMax}
                    onChange={(e) => setFilters({ ...filters, amountMax: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-[var(--bg-secondary)] rounded-t-lg shadow-sm">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'all'
                  ? 'text-accent-700 dark:text-accent-400 border-b-2 border-accent-500'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)]'
              }`}
            >
              All Transactions
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'completed'
                  ? 'text-accent-700 dark:text-accent-400 border-b-2 border-accent-500'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)]'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'pending'
                  ? 'text-accent-700 dark:text-accent-400 border-b-2 border-accent-500'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)]'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setActiveTab('failed')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'failed'
                  ? 'text-accent-700 dark:text-accent-400 border-b-2 border-accent-500'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)]'
              }`}
            >
              Failed
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-[var(--bg-secondary)] rounded-b-lg shadow-sm p-6">
          {paymentsLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <EmptyState
              icon={<CreditCard className="h-12 w-12" />}
              title="No Transactions"
              description="No payment transactions found matching your filters"
            />
          ) : (
            <div className="space-y-4">
              {filteredPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="border border-[var(--border-main)] rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start gap-4">
                      {getStatusIcon(payment.status)}
                      <div>
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="font-semibold text-lg">{payment.transactionReference}</h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${paymentService.getStatusColor(payment.status)}`}
                          >
                            {paymentService.getStatusLabel(payment.status)}
                          </span>
                        </div>
                        {payment.description && (
                          <p className="text-[var(--text-secondary)]">{payment.description}</p>
                        )}
                        {payment.payeeName && (
                          <p className="text-sm text-[var(--text-secondary)] mt-1">
                            Payee: {payment.payeeName}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[var(--text-primary)]">
                        {payment.currency} {payment.amount.toFixed(2)}
                      </div>
                      <div className="text-sm text-[var(--text-secondary)]">
                        {paymentService.getTypeLabel(payment.paymentType)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-[var(--text-secondary)]">Provider:</span>
                      <p className="font-medium">{paymentService.getProviderLabel(payment.provider)}</p>
                    </div>
                    <div>
                      <span className="text-[var(--text-secondary)]">Payment Date:</span>
                      <p className="font-medium">{paymentService.formatDate(payment.paymentDate)}</p>
                    </div>
                    <div>
                      <span className="text-[var(--text-secondary)]">Created:</span>
                      <p className="font-medium">{paymentService.formatDateTime(payment.createdAt)}</p>
                    </div>
                    {payment.completedAt && (
                      <div>
                        <span className="text-[var(--text-secondary)]">Completed:</span>
                        <p className="font-medium">{paymentService.formatDateTime(payment.completedAt)}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
