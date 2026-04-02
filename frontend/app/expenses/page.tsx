'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppLayout } from '@/components/layout';
import { Plus, DollarSign, FileText, CheckCircle, XCircle, Receipt, AlertCircle, Filter, ChevronDown, Search } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { Permissions } from '@/lib/hooks/usePermissions';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { ExpenseCategory, CurrencyCode, CreateExpenseClaimRequest } from '@/lib/types/hrms/expense';
import { Modal, ModalHeader, ModalBody, ModalFooter, EmptyState, ConfirmDialog } from '@/components/ui';
import { ExpenseAnalytics } from '@/components/expenses';
import { safeWindowOpen } from '@/lib/utils/url';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import {
  useMyExpenseClaims,
  usePendingExpenseClaims,
  useAllExpenseClaims,
  useCreateExpenseClaim,
  useSubmitExpenseClaim,
  useApproveExpenseClaim,
  useRejectExpenseClaim,
  useDeleteExpenseClaim,
} from '@/lib/hooks/queries';

const expenseClaimSchema = z.object({
  claimDate: z.string().min(1, 'Claim date required'),
  category: z.string().min(1, 'Category required'),
  description: z.string().min(1, 'Description required'),
  amount: z.number({ coerce: true }).positive('Amount must be positive'),
  currency: z.string().length(3, 'Invalid currency code'),
  receiptUrl: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('ExpensesPage');

type ExpenseClaimFormData = z.infer<typeof expenseClaimSchema>;

type TabType = 'my-claims' | 'pending' | 'all' | 'analytics';

interface Filters {
  category: ExpenseCategory | 'ALL';
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
  search: string;
}

export default function ExpenseClaims() {
  const { user, hasHydrated } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('my-claims');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Initialize React Query hooks
  const myClaimsQuery = useMyExpenseClaims(user?.employeeId, 0, 50);
  const pendingClaimsQuery = usePendingExpenseClaims(0, 50);
  const allClaimsQuery = useAllExpenseClaims(0, 20);
  const createMutation = useCreateExpenseClaim();
  const submitMutation = useSubmitExpenseClaim();
  const approveMutation = useApproveExpenseClaim();
  const rejectMutation = useRejectExpenseClaim();
  const deleteMutation = useDeleteExpenseClaim();

  // Bulk selection
  const [selectedClaims, setSelectedClaims] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState('');

  // Confirm dialogs
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [selectedClaimForAction, setSelectedClaimForAction] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    category: 'ALL',
    dateFrom: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    dateTo: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    amountMin: '',
    amountMax: '',
    search: '',
  });

  // Form setup
  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseClaimFormData>({
    resolver: zodResolver(expenseClaimSchema),
    defaultValues: {
      claimDate: new Date().toISOString().split('T')[0],
      category: 'TRAVEL',
      description: '',
      amount: 0,
      currency: 'INR',
      receiptUrl: '',
      notes: '',
    },
  });

  const showNotification = (message: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccess(message);
      setError(null);
    } else {
      setError(message);
      setSuccess(null);
    }
    setTimeout(() => {
      setSuccess(null);
      setError(null);
    }, 5000);
  };

  // Get current claims based on active tab
  const currentClaimsData = useMemo(() => {
    if (activeTab === 'my-claims') return myClaimsQuery.data?.content || [];
    if (activeTab === 'pending') return pendingClaimsQuery.data?.content || [];
    if (activeTab === 'all') return allClaimsQuery.data?.content || [];
    return [];
  }, [activeTab, myClaimsQuery.data, pendingClaimsQuery.data, allClaimsQuery.data]);

  // Filter claims
  const filteredClaims = useMemo(() => {
    return currentClaimsData.filter((claim) => {
      // Category filter
      if (filters.category !== 'ALL' && claim.category !== filters.category) return false;

      // Date range filter
      const claimDate = new Date(claim.claimDate);
      if (filters.dateFrom && claimDate < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && claimDate > new Date(filters.dateTo)) return false;

      // Amount range filter
      if (filters.amountMin && claim.amount < parseFloat(filters.amountMin)) return false;
      if (filters.amountMax && claim.amount > parseFloat(filters.amountMax)) return false;

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          claim.description?.toLowerCase().includes(searchLower) ||
          claim.claimNumber?.toLowerCase().includes(searchLower) ||
          claim.employeeName?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [currentClaimsData, filters]);

  // Statistics
  const statistics = useMemo(() => {
    const allClaims = currentClaimsData;
    const pending = allClaims.filter((c) => c.status === 'SUBMITTED');
    const approved = allClaims.filter((c) => c.status === 'APPROVED');
    const totalPendingAmount = pending.reduce((sum, c) => sum + c.amount, 0);
    const totalApprovedAmount = approved.reduce((sum, c) => sum + c.amount, 0);

    return {
      pendingCount: pending.length,
      approvedCount: approved.length,
      totalPendingAmount,
      totalApprovedAmount,
      totalClaims: allClaims.length,
    };
  }, [currentClaimsData]);

  // Bulk selection handlers
  const handleSelectAll = () => {
    const selectableClaims = filteredClaims.filter((c) => c.status === 'SUBMITTED');
    if (selectedClaims.size === selectableClaims.length) {
      setSelectedClaims(new Set());
    } else {
      setSelectedClaims(new Set(selectableClaims.map((c) => c.id)));
    }
  };

  const handleSelectClaim = (claimId: string) => {
    const newSelection = new Set(selectedClaims);
    if (newSelection.has(claimId)) {
      newSelection.delete(claimId);
    } else {
      newSelection.add(claimId);
    }
    setSelectedClaims(newSelection);
  };

  const handleBulkApprove = async () => {
    if (!user?.employeeId || selectedClaims.size === 0) return;

    setBulkProcessing(true);
    try {
      const promises = Array.from(selectedClaims).map((claimId) =>
        approveMutation.mutateAsync(claimId)
      );
      await Promise.all(promises);
      setSelectedClaims(new Set());
      showNotification(`${selectedClaims.size} claims approved successfully!`, 'success');
    } catch (err) {
      log.error('Bulk approve error:', err);
      showNotification('Failed to approve some claims', 'error');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkReject = async () => {
    if (!user?.employeeId || selectedClaims.size === 0 || !bulkRejectReason) return;

    setBulkProcessing(true);
    try {
      const promises = Array.from(selectedClaims).map((claimId) =>
        rejectMutation.mutateAsync({ claimId, reason: bulkRejectReason })
      );
      await Promise.all(promises);
      setSelectedClaims(new Set());
      setShowBulkRejectModal(false);
      setBulkRejectReason('');
      showNotification(`${selectedClaims.size} claims rejected`, 'success');
    } catch (err) {
      log.error('Bulk reject error:', err);
      showNotification('Failed to reject some claims', 'error');
    } finally {
      setBulkProcessing(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      category: 'ALL',
      dateFrom: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      dateTo: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
      amountMin: '',
      amountMax: '',
      search: '',
    });
  };


  const onSubmit = async (data: ExpenseClaimFormData) => {
    if (!user?.employeeId) {
      showNotification('You must be logged in to create an expense claim', 'error');
      return;
    }

    try {
      const request: CreateExpenseClaimRequest = {
        claimDate: data.claimDate,
        category: data.category as ExpenseCategory,
        description: data.description,
        amount: data.amount,
        currency: data.currency as CurrencyCode,
        receiptUrl: data.receiptUrl || undefined,
        notes: data.notes || undefined,
      };

      await createMutation.mutateAsync({ employeeId: user.employeeId, data: request });

      resetForm();
      setShowForm(false);
      showNotification('Expense claim created successfully!', 'success');
    } catch (err) {
      log.error('Error creating claim:', err);
      showNotification('Failed to create expense claim', 'error');
    }
  };

  const handleSubmitClaim = async (claimId: string) => {
    try {
      await submitMutation.mutateAsync(claimId);
      showNotification('Expense claim submitted successfully!', 'success');
    } catch (err) {
      log.error('Error submitting claim:', err);
      showNotification('Failed to submit expense claim', 'error');
    }
  };

  const handleApprove = async (claimId: string) => {
    if (!user?.employeeId) return;

    try {
      await approveMutation.mutateAsync(claimId);
      showNotification('Expense claim approved successfully!', 'success');
    } catch (err) {
      log.error('Error approving claim:', err);
      showNotification('Failed to approve expense claim', 'error');
    }
  };

  const handleRejectStart = (claimId: string) => {
    setSelectedClaimForAction(claimId);
    setRejectReason('');
    setShowRejectConfirm(true);
  };

  const handleRejectConfirm = async () => {
    if (!user?.employeeId || !selectedClaimForAction || !rejectReason.trim()) return;

    try {
      await rejectMutation.mutateAsync({ claimId: selectedClaimForAction, reason: rejectReason });
      showNotification('Expense claim rejected', 'success');
      setShowRejectConfirm(false);
      setSelectedClaimForAction(null);
      setRejectReason('');
    } catch (err) {
      log.error('Error rejecting claim:', err);
      showNotification('Failed to reject expense claim', 'error');
    }
  };

  const handleDeleteStart = (claimId: string) => {
    setSelectedClaimForAction(claimId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedClaimForAction) return;

    try {
      await deleteMutation.mutateAsync(selectedClaimForAction);
      showNotification('Expense claim deleted', 'success');
      setShowDeleteConfirm(false);
      setSelectedClaimForAction(null);
    } catch (err) {
      log.error('Error deleting claim:', err);
      showNotification('Failed to delete expense claim', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DRAFT: 'bg-[var(--bg-surface)] text-[var(--text-primary)] dark:bg-[var(--bg-secondary)] dark:text-[var(--text-secondary)]',
      SUBMITTED: 'bg-accent-100 text-accent-800 dark:bg-accent-900/50 dark:text-accent-300',
      APPROVED: 'bg-success-100 text-success-800 dark:bg-success-900/50 dark:text-success-300',
      REJECTED: 'bg-danger-100 text-danger-800 dark:bg-danger-900/50 dark:text-danger-300',
      PAID: 'bg-accent-100 text-accent-800 dark:bg-accent-900/50 dark:text-accent-300'
    };
    return styles[status] || 'bg-[var(--bg-surface)] text-[var(--text-primary)] dark:bg-[var(--bg-secondary)] dark:text-[var(--text-secondary)]';
  };

  // Show loading state while hydrating
  if (!hasHydrated) {
    return (
      <AppLayout activeMenuItem="expenses">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500"></div>
        </div>
      </AppLayout>
    );
  }

  if (!user?.employeeId) {
    return (
      <AppLayout activeMenuItem="expenses">
        <EmptyState
          icon={<DollarSign className="h-12 w-12" />}
          title="No Employee Profile Linked"
          description="Expense management requires an employee profile. Use the admin panels to manage employee expenses."
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="expenses">
      <div className="max-w-7xl mx-auto">
        {/* Notifications */}
        {error && (
          <div className="mb-4 p-4 bg-danger-100 dark:bg-danger-900/30 border border-danger-300 dark:border-danger-700 rounded-lg flex items-center gap-2 text-danger-800 dark:text-danger-300">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-success-100 dark:bg-success-900/30 border border-success-300 dark:border-success-700 rounded-lg flex items-center gap-2 text-success-800 dark:text-success-300">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2 skeuo-emboss">
              <DollarSign className="w-7 h-7 sm:w-8 sm:h-8" />
              Expense Claims
            </h1>
            <p className="text-[var(--text-secondary)] mt-1 skeuo-deboss">Submit and manage your expense claims</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 sm:px-6 py-2.5 sm:py-4 bg-accent-500 text-white rounded-lg hover:bg-accent-700 transition-colors flex items-center gap-2 skeuo-button"
          >
            <Plus className="w-5 h-5" />
            New Claim
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-[var(--bg-input)] rounded-lg p-4 border border-[var(--border-main)] skeuo-card">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-warning-100 dark:bg-warning-900/30 text-warning-600">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">{statistics.pendingCount}</p>
                <p className="text-body-muted">Pending</p>
              </div>
            </div>
          </div>
          <div className="bg-[var(--bg-input)] rounded-lg p-4 border border-[var(--border-main)] skeuo-card">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-success-100 dark:bg-success-900/30 text-success-600">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">{statistics.approvedCount}</p>
                <p className="text-body-muted">Approved</p>
              </div>
            </div>
          </div>
          <div className="bg-[var(--bg-input)] rounded-lg p-4 border border-[var(--border-main)] skeuo-card">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-accent-100 dark:bg-accent-900/30 text-accent-700">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">{formatCurrency(statistics.totalPendingAmount)}</p>
                <p className="text-body-muted">Pending Amount</p>
              </div>
            </div>
          </div>
          <div className="bg-[var(--bg-input)] rounded-lg p-4 border border-[var(--border-main)] skeuo-card">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-info-100 dark:bg-info-900/30 text-info-600">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">{statistics.totalClaims}</p>
                <p className="text-body-muted">Total Claims</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="skeuo-card p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search claims..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="input-aura pl-10"
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
            {(filters.category !== 'ALL' || filters.amountMin || filters.amountMax) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-body-secondary hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-[var(--border-main)]">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value as ExpenseCategory | 'ALL' })}
                  className="input-aura"
                >
                  <option value="ALL">All Categories</option>
                  <option value="TRAVEL">Travel</option>
                  <option value="ACCOMMODATION">Accommodation</option>
                  <option value="MEALS">Meals</option>
                  <option value="TRANSPORT">Transportation</option>
                  <option value="OFFICE_SUPPLIES">Office Supplies</option>
                  <option value="EQUIPMENT">Equipment</option>
                  <option value="TRAINING">Training</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Date From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="input-aura"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Date To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="input-aura"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Min ₹</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={filters.amountMin}
                    onChange={(e) => setFilters({ ...filters, amountMin: e.target.value })}
                    className="input-aura"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Max ₹</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={filters.amountMax}
                    onChange={(e) => setFilters({ ...filters, amountMax: e.target.value })}
                    className="input-aura"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* New Claim Form */}
        {showForm && (
          <div className="skeuo-card p-4 mb-4">
            <h2 className="text-base font-semibold mb-3 skeuo-emboss">Create New Expense Claim</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Claim Date</label>
                <input
                  type="date"
                  className="input-aura"
                  {...register('claimDate')}
                />
                {errors.claimDate && <span className="text-danger-500 text-sm">{errors.claimDate.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Category</label>
                <select
                  className="input-aura"
                  {...register('category')}
                >
                  <option value="">Select category</option>
                  <option value="TRAVEL">Travel</option>
                  <option value="ACCOMMODATION">Accommodation</option>
                  <option value="MEALS">Meals</option>
                  <option value="TRANSPORT">Transportation</option>
                  <option value="OFFICE_SUPPLIES">Office Supplies</option>
                  <option value="EQUIPMENT">Equipment</option>
                  <option value="TRAINING">Training</option>
                  <option value="COMMUNICATION">Communication</option>
                  <option value="ENTERTAINMENT">Entertainment</option>
                  <option value="MEDICAL">Medical</option>
                  <option value="OTHER">Other</option>
                </select>
                {errors.category && <span className="text-danger-500 text-sm">{errors.category.message}</span>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Description</label>
                <textarea
                  className="input-aura"
                  rows={3}
                  placeholder="Describe your expense..."
                  {...register('description')}
                />
                {errors.description && <span className="text-danger-500 text-sm">{errors.description.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-aura"
                  placeholder="0.00"
                  {...register('amount')}
                />
                {errors.amount && <span className="text-danger-500 text-sm">{errors.amount.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Currency</label>
                <select
                  className="input-aura"
                  {...register('currency')}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="INR">INR</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Receipt URL (Optional)</label>
                <input
                  type="url"
                  className="input-aura"
                  placeholder="https://..."
                  {...register('receiptUrl')}
                />
                {errors.receiptUrl && <span className="text-danger-500 text-sm">{errors.receiptUrl.message}</span>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Notes (Optional)</label>
                <textarea
                  className="input-aura"
                  rows={2}
                  placeholder="Additional notes..."
                  {...register('notes')}
                />
              </div>

              <div className="md:col-span-2 flex gap-4">
                <PermissionGate permission={Permissions.EXPENSE_CREATE}>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Claim'}
                  </button>
                </PermissionGate>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Bulk Action Toolbar */}
        {selectedClaims.size > 0 && activeTab === 'pending' && (
          <div className="bg-accent-50 dark:bg-accent-900/30 border border-accent-200 dark:border-accent-800 rounded-lg p-4 mb-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                checked={selectedClaims.size === filteredClaims.filter(c => c.status === 'SUBMITTED').length}
                onChange={handleSelectAll}
                className="w-5 h-5 rounded border-[var(--border-main)] text-accent-700 focus:ring-accent-500"
              />
              <span className="font-medium text-accent-900 dark:text-accent-100">
                {selectedClaims.size} claim{selectedClaims.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex gap-2">
              <PermissionGate permission={Permissions.EXPENSE_APPROVE}>
                <button
                  onClick={handleBulkApprove}
                  disabled={bulkProcessing}
                  className="px-4 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {bulkProcessing ? 'Processing...' : `Approve ${selectedClaims.size}`}
                </button>
              </PermissionGate>
              <PermissionGate permission={Permissions.EXPENSE_APPROVE}>
                <button
                  onClick={() => setShowBulkRejectModal(true)}
                  disabled={bulkProcessing}
                  className="px-4 py-2 bg-danger-600 text-white rounded-lg hover:bg-danger-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Reject {selectedClaims.size}
                </button>
              </PermissionGate>
              <button
                onClick={() => setSelectedClaims(new Set())}
                className="px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="skeuo-card !rounded-b-none">
          <div className="flex border-b border-[var(--border-main)]">
            <button
              onClick={() => { setActiveTab('my-claims'); setSelectedClaims(new Set()); }}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'my-claims'
                  ? 'text-accent-700 dark:text-accent-400 border-b-2 border-accent-500'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)]'
              }`}
            >
              My Claims
            </button>
            <button
              onClick={() => { setActiveTab('pending'); setSelectedClaims(new Set()); }}
              className={`px-6 py-4 font-medium transition-colors relative ${
                activeTab === 'pending'
                  ? 'text-accent-700 dark:text-accent-400 border-b-2 border-accent-500'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)]'
              }`}
            >
              Pending Approval
              {statistics.pendingCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-warning-100 text-warning-700 dark:bg-warning-900/50 dark:text-warning-300">
                  {statistics.pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab('all'); setSelectedClaims(new Set()); }}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'all'
                  ? 'text-accent-700 dark:text-accent-400 border-b-2 border-accent-500'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)]'
              }`}
            >
              All Claims
            </button>
            <button
              onClick={() => { setActiveTab('analytics'); setSelectedClaims(new Set()); }}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'analytics'
                  ? 'text-accent-700 dark:text-accent-400 border-b-2 border-accent-500'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)]'
              }`}
            >
              Analytics
            </button>
          </div>
        </div>

        {/* Content Area */}
        {activeTab === 'analytics' ? (
          <div className="skeuo-card !rounded-t-none p-4">
            <ExpenseAnalytics claims={currentClaimsData} />
          </div>
        ) : (
        <div className="skeuo-card !rounded-t-none p-4">
          {/* Select All Header for Pending Tab */}
          {activeTab === 'pending' && filteredClaims.filter(c => c.status === 'SUBMITTED').length > 0 && (
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-[var(--border-main)]">
              <input
                type="checkbox"
                checked={selectedClaims.size === filteredClaims.filter(c => c.status === 'SUBMITTED').length && selectedClaims.size > 0}
                onChange={handleSelectAll}
                className="w-5 h-5 rounded border-[var(--border-main)] text-accent-700 focus:ring-accent-500"
              />
              <span className="text-body-secondary">
                Select all ({filteredClaims.filter(c => c.status === 'SUBMITTED').length} claims)
              </span>
            </div>
          )}

          {((activeTab === 'my-claims' && myClaimsQuery.isLoading) || (activeTab === 'pending' && pendingClaimsQuery.isLoading) || (activeTab === 'all' && allClaimsQuery.isLoading)) ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500"></div>
            </div>
          ) : myClaimsQuery.error || pendingClaimsQuery.error || allClaimsQuery.error ? (
            <div className="flex flex-col items-center justify-center h-64">
              <AlertCircle className="h-12 w-12 text-danger-500 mb-4" />
              <p className="text-center text-[var(--text-secondary)] max-w-md">
                {myClaimsQuery.error?.message || pendingClaimsQuery.error?.message || allClaimsQuery.error?.message || 'Failed to load expense claims. Please try again.'}
              </p>
              <button
                onClick={() => {
                  if (activeTab === 'my-claims') myClaimsQuery.refetch();
                  else if (activeTab === 'pending') pendingClaimsQuery.refetch();
                  else if (activeTab === 'all') allClaimsQuery.refetch();
                }}
                className="mt-4 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : filteredClaims.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-12 w-12" />}
              title="No Expense Claims"
              description="Submit your first expense claim"
              action={{ label: 'New Claim', onClick: () => setShowForm(true) }}
            />
          ) : (
            <div className="space-y-4">
              {filteredClaims.map((claim) => (
                <div
                  key={claim.id}
                  className={`border rounded-lg p-4 hover:shadow-[var(--shadow-elevated)] transition-shadow ${
                    selectedClaims.has(claim.id)
                      ? 'border-accent-400 bg-accent-50/50 dark:bg-accent-900/20'
                      : 'border-[var(--border-main)]'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start gap-4">
                      {/* Checkbox for pending claims */}
                      {activeTab === 'pending' && claim.status === 'SUBMITTED' && (
                        <input
                          type="checkbox"
                          checked={selectedClaims.has(claim.id)}
                          onChange={() => handleSelectClaim(claim.id)}
                          className="w-5 h-5 mt-1 rounded border-[var(--border-main)] text-accent-700 focus:ring-accent-500"
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="font-semibold text-lg">{claim.claimNumber}</h3>
                          <span className={`px-4 py-1 rounded-full text-xs font-medium ${getStatusBadge(claim.status)}`}>
                            {claim.status}
                          </span>
                        </div>
                        <p className="text-[var(--text-secondary)]">{claim.description}</p>
                        {claim.employeeName && (
                          <p className="text-body-secondary mt-1">
                            By: {claim.employeeName} ({claim.employeeCode})
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[var(--text-primary)]">
                        {formatCurrency(claim.amount, claim.currency)}
                      </div>
                      <div className="text-body-secondary">{claim.category.replace('_', ' ')}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-[var(--text-secondary)]">Claim Date:</span>
                      <p className="font-medium">{new Date(claim.claimDate).toLocaleDateString()}</p>
                    </div>
                    {claim.submittedAt && (
                      <div>
                        <span className="text-[var(--text-secondary)]">Submitted:</span>
                        <p className="font-medium">{new Date(claim.submittedAt).toLocaleDateString()}</p>
                      </div>
                    )}
                    {claim.approvedAt && (
                      <div>
                        <span className="text-[var(--text-secondary)]">Approved By:</span>
                        <p className="font-medium">{claim.approvedByName}</p>
                      </div>
                    )}
                    {claim.rejectionReason && (
                      <div className="col-span-2">
                        <span className="text-[var(--text-secondary)]">Rejection Reason:</span>
                        <p className="font-medium text-danger-600">{claim.rejectionReason}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-[var(--border-main)]">
                    {claim.status === 'DRAFT' && activeTab === 'my-claims' && (
                      <>
                        <PermissionGate permission={Permissions.EXPENSE_CREATE}>
                          <button
                            onClick={() => handleSubmitClaim(claim.id)}
                            className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-700 text-sm transition-colors"
                          >
                            Submit for Approval
                          </button>
                        </PermissionGate>
                        <PermissionGate permission={Permissions.EXPENSE_CREATE}>
                          <button
                            onClick={() => handleDeleteStart(claim.id)}
                            className="px-4 py-2 bg-danger-600 text-white rounded-lg hover:bg-danger-700 text-sm transition-colors flex items-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            Delete
                          </button>
                        </PermissionGate>
                      </>
                    )}
                    {claim.status === 'SUBMITTED' && activeTab === 'pending' && (
                      <>
                        <PermissionGate permission={Permissions.EXPENSE_APPROVE}>
                          <button
                            onClick={() => handleApprove(claim.id)}
                            className="px-4 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 text-sm transition-colors flex items-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </button>
                        </PermissionGate>
                        <PermissionGate permission={Permissions.EXPENSE_APPROVE}>
                          <button
                            onClick={() => handleRejectStart(claim.id)}
                            className="px-4 py-2 bg-danger-600 text-white rounded-lg hover:bg-danger-700 text-sm transition-colors flex items-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </PermissionGate>
                      </>
                    )}
                    {claim.receiptUrl && (
                      <button
                        onClick={() => safeWindowOpen(claim.receiptUrl, '_blank')}
                        className="px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 text-sm transition-colors flex items-center gap-2"
                      >
                        <Receipt className="w-4 h-4" />
                        View Receipt
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Bulk Reject Modal */}
        <Modal isOpen={showBulkRejectModal} onClose={() => setShowBulkRejectModal(false)} size="md">
          <ModalHeader onClose={() => setShowBulkRejectModal(false)}>
            Reject {selectedClaims.size} Expense Claim{selectedClaims.size !== 1 ? 's' : ''}
          </ModalHeader>
          <ModalBody>
            <p className="text-[var(--text-secondary)] mb-4">
              You are about to reject {selectedClaims.size} expense claim{selectedClaims.size !== 1 ? 's' : ''}.
              Please provide a reason for rejection.
            </p>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Rejection Reason <span className="text-danger-500">*</span>
              </label>
              <textarea
                value={bulkRejectReason}
                onChange={(e) => setBulkRejectReason(e.target.value)}
                rows={3}
                className="input-aura"
                placeholder="Enter reason for rejection..."
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <button
              onClick={() => setShowBulkRejectModal(false)}
              className="px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkReject}
              disabled={!bulkRejectReason.trim() || bulkProcessing}
              className="px-4 py-2 bg-danger-600 text-white rounded-lg hover:bg-danger-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            >
              <XCircle className="w-4 h-4" />
              {bulkProcessing ? 'Rejecting...' : `Reject ${selectedClaims.size} Claims`}
            </button>
          </ModalFooter>
        </Modal>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setSelectedClaimForAction(null);
          }}
          onConfirm={handleDeleteConfirm}
          title="Delete Expense Claim"
          message="Are you sure you want to delete this expense claim? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          loading={deleteMutation.isPending}
        />

        {/* Reject Confirmation Dialog */}
        <Modal
          isOpen={showRejectConfirm}
          onClose={() => {
            setShowRejectConfirm(false);
            setSelectedClaimForAction(null);
            setRejectReason('');
          }}
          size="md"
        >
          <ModalHeader onClose={() => {
            setShowRejectConfirm(false);
            setSelectedClaimForAction(null);
            setRejectReason('');
          }}>
            Reject Expense Claim
          </ModalHeader>
          <ModalBody>
            <p className="text-[var(--text-secondary)] mb-4">
              Please provide a reason for rejecting this expense claim.
            </p>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Rejection Reason <span className="text-danger-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="input-aura"
                placeholder="Enter reason for rejection..."
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <button
              onClick={() => {
                setShowRejectConfirm(false);
                setSelectedClaimForAction(null);
                setRejectReason('');
              }}
              className="px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]"
            >
              Cancel
            </button>
            <button
              onClick={handleRejectConfirm}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              className="px-4 py-2 bg-danger-600 text-white rounded-lg hover:bg-danger-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            >
              <XCircle className="w-4 h-4" />
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
            </button>
          </ModalFooter>
        </Modal>
      </div>
    </AppLayout>
  );
}
