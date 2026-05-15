'use client';

import React, {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {motion} from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  ChevronDown,
  Clock,
  DollarSign,
  FileText,
  Filter,
  PieChart,
  Plus,
  Receipt,
  Search,
  ShieldAlert,
  Tag,
  TrendingUp,
  Wallet,
  XCircle,
} from 'lucide-react';

import {AppLayout} from '@/components/layout';
import {useAuth} from '@/lib/hooks/useAuth';
import {Permissions} from '@/lib/hooks/usePermissions';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {CreateExpenseClaimRequest, CurrencyCode, ExpenseCategory} from '@/lib/types/hrms/expense';
import {ConfirmDialog, EmptyState} from '@/components/ui';
import {Button} from '@/components/ui/Button';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {EXPENSE_STATUS} from '@/lib/status/vocabulary';
import {ExpenseAnalytics} from '@/components/expenses';
import {safeWindowOpen} from '@/lib/utils/url';
import {endOfMonth, format, startOfMonth} from 'date-fns';
import {formatCurrency} from '@/lib/utils';
import {formatDate} from '@/lib/utils/format/date';
import {
  useAllExpenseClaims,
  useApproveExpenseClaim,
  useCreateExpenseClaim,
  useDeleteExpenseClaim,
  useMyExpenseClaims,
  usePendingExpenseClaims,
  useRejectExpenseClaim,
  useSubmitExpenseClaim,
} from '@/lib/hooks/queries';
import {createLogger} from '@/lib/utils/logger';

// Single ease curve for every transition on this page.
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const expenseClaimSchema = z.object({
  claimDate: z.string().min(1, 'Claim date required'),
  category: z.string().min(1, 'Category required'),
  description: z.string().min(1, 'Description required'),
  amount: z.number({coerce: true}).positive('Amount must be positive'),
  currency: z.string().length(3, 'Invalid currency code'),
  receiptUrl: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

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
  const {user, hasHydrated} = useAuth();
  useEffect(() => {
    document.title = 'Expenses | NU-AURA';
  }, []);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('my-claims');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const myClaimsQuery = useMyExpenseClaims(user?.employeeId, 0, 50);
  const pendingClaimsQuery = usePendingExpenseClaims(0, 50);
  const allClaimsQuery = useAllExpenseClaims(0, 20);
  const createMutation = useCreateExpenseClaim();
  const submitMutation = useSubmitExpenseClaim();
  const approveMutation = useApproveExpenseClaim();
  const rejectMutation = useRejectExpenseClaim();
  const deleteMutation = useDeleteExpenseClaim();

  const [selectedClaims, setSelectedClaims] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [selectedClaimForAction, setSelectedClaimForAction] = useState<string | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    category: 'ALL',
    dateFrom: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    dateTo: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    amountMin: '',
    amountMax: '',
    search: '',
  });

  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: {errors, isSubmitting},
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

  const currentClaimsData = useMemo(() => {
    if (activeTab === 'my-claims') return myClaimsQuery.data?.content || [];
    if (activeTab === 'pending') return pendingClaimsQuery.data?.content || [];
    if (activeTab === 'all') return allClaimsQuery.data?.content || [];
    return [];
  }, [activeTab, myClaimsQuery.data, pendingClaimsQuery.data, allClaimsQuery.data]);

  const filteredClaims = useMemo(() => {
    return currentClaimsData.filter((claim) => {
      if (filters.category !== 'ALL' && claim.category !== filters.category) return false;
      const claimDate = new Date(claim.claimDate);
      if (filters.dateFrom && claimDate < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && claimDate > new Date(filters.dateTo)) return false;
      if (filters.amountMin && claim.amount < parseFloat(filters.amountMin)) return false;
      if (filters.amountMax && claim.amount > parseFloat(filters.amountMax)) return false;
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

  // Statistics — fed by *all* my-claims so the dashboard summary is stable across tabs.
  const myClaims = myClaimsQuery.data?.content ?? [];
  const pendingForApproval = pendingClaimsQuery.data?.content ?? [];

  const statistics = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const pending = myClaims.filter((c) => c.status === 'SUBMITTED');
    const approvedThisMonth = myClaims.filter(
      (c) => c.status === 'APPROVED' && c.approvedAt && new Date(c.approvedAt) >= monthStart
    );
    const awaitingReimbursement = myClaims.filter((c) => c.status === 'APPROVED');
    const overPolicy = myClaims.filter((c) => c.amount > 50000);

    return {
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, c) => sum + c.amount, 0),
      approvedThisMonthCount: approvedThisMonth.length,
      approvedThisMonthAmount: approvedThisMonth.reduce((sum, c) => sum + c.amount, 0),
      awaitingReimbursementCount: awaitingReimbursement.length,
      awaitingReimbursementAmount: awaitingReimbursement.reduce((sum, c) => sum + c.amount, 0),
      overPolicyCount: overPolicy.length,
      approvalsWaitingCount: pendingForApproval.length,
    };
  }, [myClaims, pendingForApproval]);

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
    if (newSelection.has(claimId)) newSelection.delete(claimId);
    else newSelection.add(claimId);
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

  const handleBulkReject = async (reason?: string) => {
    const trimmed = (reason ?? bulkRejectReason).trim();
    if (!user?.employeeId || selectedClaims.size === 0 || !trimmed) return;
    setBulkProcessing(true);
    try {
      const promises = Array.from(selectedClaims).map((claimId) =>
        rejectMutation.mutateAsync({claimId, reason: trimmed})
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
      await createMutation.mutateAsync({employeeId: user.employeeId, data: request});
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
    setShowRejectConfirm(true);
  };

  const handleRejectConfirm = async (reason?: string) => {
    const trimmed = (reason ?? '').trim();
    if (!user?.employeeId || !selectedClaimForAction || !trimmed) return;
    try {
      await rejectMutation.mutateAsync({claimId: selectedClaimForAction, reason: trimmed});
      showNotification('Expense claim rejected', 'success');
      setShowRejectConfirm(false);
      setSelectedClaimForAction(null);
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

  if (!hasHydrated) {
    return (
      <AppLayout activeMenuItem="expenses">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500" />
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

  const tabLoading =
    (activeTab === 'my-claims' && myClaimsQuery.isLoading) ||
    (activeTab === 'pending' && pendingClaimsQuery.isLoading) ||
    (activeTab === 'all' && allClaimsQuery.isLoading);
  const tabError = myClaimsQuery.error || pendingClaimsQuery.error || allClaimsQuery.error;

  return (
    <AppLayout activeMenuItem="expenses">
      <div className="mx-auto w-full max-w-7xl px-6 py-8 space-y-10">
        <PageHeader onCreate={() => setShowForm(true)} />

        {error && <InlineAlert tone="danger" icon={AlertCircle} message={error} />}
        {success && <InlineAlert tone="success" icon={CheckCircle} message={success} />}

        <StatsRow
          pendingCount={statistics.pendingCount}
          pendingAmount={statistics.pendingAmount}
          approvedThisMonthAmount={statistics.approvedThisMonthAmount}
          awaitingReimbursementAmount={statistics.awaitingReimbursementAmount}
          overPolicyCount={statistics.overPolicyCount}
        />

        <BentoNavigation
          approvalsWaiting={statistics.approvalsWaitingCount}
          onSubmit={() => setShowForm(true)}
          onApprovals={() => {
            setActiveTab('pending');
            setSelectedClaims(new Set());
          }}
        />

        {statistics.overPolicyCount > 0 && (
          <AttentionStrip count={statistics.overPolicyCount} />
        )}

        {/* New claim form — unchanged structure, lighter chrome */}
        {showForm && (
          <NewClaimForm
            register={register}
            errors={errors}
            isSubmitting={isSubmitting}
            onCancel={() => setShowForm(false)}
            onSubmit={handleSubmit(onSubmit)}
          />
        )}

        {/* Filters bar */}
        <FiltersBar
          filters={filters}
          showFilters={showFilters}
          onToggle={() => setShowFilters(!showFilters)}
          onChange={setFilters}
          onClear={clearFilters}
        />

        {/* Bulk action toolbar */}
        {selectedClaims.size > 0 && activeTab === 'pending' && (
          <BulkActionBar
            count={selectedClaims.size}
            total={filteredClaims.filter((c) => c.status === 'SUBMITTED').length}
            processing={bulkProcessing}
            onSelectAll={handleSelectAll}
            onApprove={handleBulkApprove}
            onReject={() => setShowBulkRejectModal(true)}
            onCancel={() => setSelectedClaims(new Set())}
          />
        )}

        {/* Tabs + list */}
        <section aria-label="Expense claims" className="space-y-4">
          <Tabs
            activeTab={activeTab}
            onChange={(t) => {
              setActiveTab(t);
              setSelectedClaims(new Set());
            }}
            pendingCount={statistics.pendingCount}
            approvalsCount={statistics.approvalsWaitingCount}
          />

          {activeTab === 'analytics' ? (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-6">
              <ExpenseAnalytics claims={currentClaimsData} />
            </div>
          ) : tabLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500" />
            </div>
          ) : tabError ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <AlertCircle className="h-10 w-10 text-danger-500" aria-hidden="true" />
              <p className="text-center text-[var(--text-secondary)] max-w-md">
                {myClaimsQuery.error?.message ||
                  pendingClaimsQuery.error?.message ||
                  allClaimsQuery.error?.message ||
                  'Failed to load expense claims. Please try again.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (activeTab === 'my-claims') myClaimsQuery.refetch();
                  else if (activeTab === 'pending') pendingClaimsQuery.refetch();
                  else if (activeTab === 'all') allClaimsQuery.refetch();
                }}
              >
                Retry
              </Button>
            </div>
          ) : filteredClaims.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-12 w-12" />}
              title="No Expense Claims"
              description="Submit your first expense claim"
              action={{label: 'New Claim', onClick: () => setShowForm(true)}}
            />
          ) : (
            <RecentClaimsList
              activeTab={activeTab}
              claims={filteredClaims}
              selectedClaims={selectedClaims}
              onSelectClaim={handleSelectClaim}
              onSelectAll={handleSelectAll}
              onSubmit={handleSubmitClaim}
              onDelete={handleDeleteStart}
              onApprove={handleApprove}
              onReject={handleRejectStart}
            />
          )}
        </section>

        <ConfirmDialog
          isOpen={showBulkRejectModal}
          onClose={() => setShowBulkRejectModal(false)}
          onConfirm={handleBulkReject}
          title={`Reject ${selectedClaims.size} Expense Claim${selectedClaims.size !== 1 ? 's' : ''}`}
          message={`You are about to reject ${selectedClaims.size} expense claim${selectedClaims.size !== 1 ? 's' : ''}. Please provide a reason for rejection.`}
          confirmText={`Reject ${selectedClaims.size} Claim${selectedClaims.size !== 1 ? 's' : ''}`}
          cancelText="Cancel"
          type="danger"
          loading={bulkProcessing}
          reason={{
            label: 'Rejection reason',
            placeholder: 'Enter reason for rejection...',
            required: true,
          }}
        />

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

        <ConfirmDialog
          isOpen={showRejectConfirm}
          onClose={() => {
            setShowRejectConfirm(false);
            setSelectedClaimForAction(null);
          }}
          onConfirm={handleRejectConfirm}
          title="Reject Expense Claim"
          message="Please provide a reason for rejecting this expense claim."
          confirmText="Reject"
          cancelText="Cancel"
          type="danger"
          loading={rejectMutation.isPending}
          reason={{
            label: 'Rejection reason',
            placeholder: 'Enter reason for rejection...',
            required: true,
          }}
        />
      </div>
    </AppLayout>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────
function PageHeader({onCreate}: {onCreate: () => void}) {
  return (
    <motion.header
      initial={{opacity: 0, y: 4}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.4, ease: EASE}}
      className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"
    >
      <div className="space-y-2 max-w-2xl">
        <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Expenses
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--text-heading)] leading-[1.05]">
          Claims, approvals, and reimbursements — without the spreadsheet shuffle.
        </h1>
        <p className="text-body-secondary max-w-[55ch]">
          Submit receipts in seconds, approve in batches, and keep reimbursements predictable.
        </p>
      </div>
      <PermissionGate permission={Permissions.EXPENSE_CREATE}>
        <Button variant="primary" onClick={onCreate} className="self-start sm:self-end">
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Submit expense
        </Button>
      </PermissionGate>
    </motion.header>
  );
}

// ── Stats row ────────────────────────────────────────────────────────────────
function StatsRow({
  pendingCount,
  pendingAmount,
  approvedThisMonthAmount,
  awaitingReimbursementAmount,
  overPolicyCount,
}: {
  pendingCount: number;
  pendingAmount: number;
  approvedThisMonthAmount: number;
  awaitingReimbursementAmount: number;
  overPolicyCount: number;
}) {
  const items = [
    {
      label: 'Pending claims',
      value: pendingCount,
      sub: formatCurrency(pendingAmount),
      icon: Clock,
      tone: pendingCount > 0 ? ('warning' as const) : ('neutral' as const),
    },
    {
      label: 'Approved this month',
      value: formatCurrency(approvedThisMonthAmount),
      icon: CheckCircle,
      tone: 'neutral' as const,
    },
    {
      label: 'Awaiting reimbursement',
      value: formatCurrency(awaitingReimbursementAmount),
      icon: Wallet,
      tone: 'neutral' as const,
    },
    {
      label: 'Over-policy',
      value: overPolicyCount,
      icon: ShieldAlert,
      tone: overPolicyCount > 0 ? ('danger' as const) : ('neutral' as const),
    },
  ];

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={{visible: {transition: {staggerChildren: 0.06, delayChildren: 0.08}}}}
      aria-label="Expense summary"
      className="grid grid-cols-2 sm:grid-cols-4 border-y border-[var(--border-subtle)] divide-x divide-[var(--border-subtle)]"
    >
      {items.map((item) => (
        <motion.div
          key={item.label}
          variants={{
            hidden: {opacity: 0, y: 6},
            visible: {opacity: 1, y: 0, transition: {duration: 0.4, ease: EASE}},
          }}
          className="px-5 py-6 sm:px-7 sm:py-8 first:pl-0 last:pr-0"
        >
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-2xs font-medium uppercase tracking-wider">{item.label}</span>
          </div>
          <p
            className={`mt-3 font-mono text-2xl sm:text-3xl tabular-nums tracking-tight ${
              item.tone === 'danger'
                ? 'text-danger-700 dark:text-danger-300'
                : item.tone === 'warning'
                  ? 'text-warning-700 dark:text-warning-300'
                  : 'text-[var(--text-heading)]'
            }`}
          >
            {item.value}
          </p>
          {item.sub && (
            <p className="mt-1 font-mono text-xs tabular-nums text-[var(--text-muted)]">{item.sub}</p>
          )}
        </motion.div>
      ))}
    </motion.section>
  );
}

// ── Bento navigation ─────────────────────────────────────────────────────────
function BentoNavigation({
  approvalsWaiting,
  onSubmit,
  onApprovals,
}: {
  approvalsWaiting: number;
  onSubmit: () => void;
  onApprovals: () => void;
}) {
  const tiles: Array<{
    title: string;
    description: string;
    icon: React.ElementType;
    href?: string;
    onClick?: () => void;
    badge?: number;
  }> = [
    {
      title: 'My claims',
      description: 'Drafts, submissions, and history of every receipt you have filed.',
      icon: Receipt,
      onClick: () => undefined,
      href: '#my-claims',
    },
    {
      title: 'Categories & policies',
      description: 'Per-category limits, mileage rates, and policy guardrails.',
      icon: Tag,
      href: '/expenses/policies',
    },
    {
      title: 'Reports',
      description: 'Spend by category, employee, and period. Export to CSV or PDF.',
      icon: PieChart,
      href: '/expenses/reports',
    },
    {
      title: 'Advances',
      description: 'Track outstanding travel advances and settlement against claims.',
      icon: TrendingUp,
      href: '/expenses/advances',
    },
  ];

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={{visible: {transition: {staggerChildren: 0.07, delayChildren: 0.18}}}}
      className="grid gap-4 grid-cols-1 lg:grid-cols-12"
      aria-label="Quick actions"
    >
      <BentoHero approvalsWaiting={approvalsWaiting} onSubmit={onSubmit} onApprovals={onApprovals} />
      {tiles.map((tile) => (
        <BentoTile key={tile.title} {...tile} />
      ))}
    </motion.section>
  );
}

function BentoHero({
  approvalsWaiting,
  onSubmit,
  onApprovals,
}: {
  approvalsWaiting: number;
  onSubmit: () => void;
  onApprovals: () => void;
}) {
  // If there are approvals waiting, lead with them; otherwise lead with submit.
  const leadWithApprovals = approvalsWaiting > 0;
  const Icon = leadWithApprovals ? Clock : Plus;
  const title = leadWithApprovals
    ? `${approvalsWaiting} approval${approvalsWaiting === 1 ? '' : 's'} waiting on you`
    : 'Submit an expense';
  const description = leadWithApprovals
    ? 'Review and clear pending claims in batches. Bulk approve receipts that match policy.'
    : 'Snap a receipt, pick a category, and file in under a minute. Reimbursements settle on the next payroll cycle.';
  const cta = leadWithApprovals ? 'Review approvals' : 'New claim';

  return (
    <motion.div
      variants={{hidden: {opacity: 0, y: 8}, visible: {opacity: 1, y: 0, transition: {duration: 0.5, ease: EASE}}}}
      className="lg:col-span-7 lg:row-span-2"
    >
      <button
        type="button"
        onClick={leadWithApprovals ? onApprovals : onSubmit}
        className="group block h-full w-full text-left rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-7 sm:p-9 transition-all hover:border-[var(--border-main)] hover:shadow-[0_20px_40px_-15px_rgba(15,23,42,0.08)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
      >
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <ArrowRight
            className="h-4 w-4 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </div>
        <h2 className="mt-8 text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-heading)]">
          {title}
        </h2>
        <p className="mt-3 text-body-secondary max-w-[48ch]">{description}</p>
        <div className="mt-10 flex items-end justify-between gap-6">
          <BentoHeroBars />
          <p className="text-2xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">{cta}</p>
        </div>
      </button>
    </motion.div>
  );
}

function BentoHeroBars() {
  const widths = [38, 64, 52, 81, 47, 69, 33, 76];
  return (
    <div className="flex items-end gap-1.5 h-16 flex-1" aria-hidden="true">
      {widths.map((w, i) => (
        <motion.span
          key={i}
          initial={{height: '0%'}}
          animate={{height: `${w}%`}}
          transition={{duration: 0.7, ease: EASE, delay: 0.35 + i * 0.04}}
          className="flex-1 max-w-3 rounded-sm bg-gradient-to-t from-accent-100 to-accent-300 dark:from-accent-900/60 dark:to-accent-700/80"
        />
      ))}
    </div>
  );
}

function BentoTile({
  title,
  description,
  icon: Icon,
  href,
  onClick,
  badge,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  href?: string;
  onClick?: () => void;
  badge?: number;
}) {
  const inner = (
    <>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-base font-semibold text-[var(--text-heading)]">{title}</h3>
          {badge !== undefined && (
            <span className="inline-flex items-center justify-center min-w-6 px-2 h-5 text-2xs font-semibold rounded-full bg-danger-100 text-danger-700 dark:bg-danger-900/40 dark:text-danger-300">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-[var(--text-secondary)] leading-relaxed">{description}</p>
      </div>
      <ArrowRight
        className="h-4 w-4 self-center text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </>
  );

  const className =
    'group flex h-full items-start gap-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 sm:p-6 transition-all hover:border-[var(--border-main)] hover:shadow-[0_12px_30px_-12px_rgba(15,23,42,0.07)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 text-left w-full';

  return (
    <motion.div
      variants={{hidden: {opacity: 0, y: 8}, visible: {opacity: 1, y: 0, transition: {duration: 0.4, ease: EASE}}}}
      className="lg:col-span-5"
    >
      {href && !onClick ? (
        <Link href={href} className={className}>
          {inner}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={className}>
          {inner}
        </button>
      )}
    </motion.div>
  );
}

// ── Filters bar ──────────────────────────────────────────────────────────────
function FiltersBar({
  filters,
  showFilters,
  onToggle,
  onChange,
  onClear,
}: {
  filters: Filters;
  showFilters: boolean;
  onToggle: () => void;
  onChange: (f: Filters) => void;
  onClear: () => void;
}) {
  const hasCustom = filters.category !== 'ALL' || filters.amountMin || filters.amountMax;

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]" role="search">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="search"
            aria-label="Search claims"
            placeholder="Search claims, employees, claim numbers..."
            value={filters.search}
            onChange={(e) => onChange({...filters, search: e.target.value})}
            className="input-aura pl-10"
          />
        </div>

        <button
          onClick={onToggle}
          className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors text-sm ${
            showFilters
              ? 'border-accent-500 text-accent-700 bg-accent-50 dark:bg-accent-900/20'
              : 'border-[var(--border-main)] hover:bg-[var(--bg-secondary)]'
          }`}
          aria-expanded={showFilters}
        >
          <Filter className="w-4 h-4" aria-hidden="true" />
          Filters
          <ChevronDown
            className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        {hasCustom && (
          <button
            onClick={onClear}
            className="px-4 py-2 text-sm text-body-secondary hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded"
          >
            Clear filters
          </button>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-[var(--border-subtle)]">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Category</label>
            <select
              value={filters.category}
              onChange={(e) => onChange({...filters, category: e.target.value as ExpenseCategory | 'ALL'})}
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
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Date from</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onChange({...filters, dateFrom: e.target.value})}
              className="input-aura"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Date to</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => onChange({...filters, dateTo: e.target.value})}
              className="input-aura"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Min</label>
              <input
                type="number"
                placeholder="0"
                value={filters.amountMin}
                onChange={(e) => onChange({...filters, amountMin: e.target.value})}
                className="input-aura font-mono tabular-nums"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Max</label>
              <input
                type="number"
                placeholder="0"
                value={filters.amountMax}
                onChange={(e) => onChange({...filters, amountMax: e.target.value})}
                className="input-aura font-mono tabular-nums"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
function Tabs({
  activeTab,
  onChange,
  pendingCount,
  approvalsCount,
}: {
  activeTab: TabType;
  onChange: (t: TabType) => void;
  pendingCount: number;
  approvalsCount: number;
}) {
  const tabs: Array<{key: TabType; label: string; badge?: number}> = [
    {key: 'my-claims', label: 'My claims', badge: pendingCount > 0 ? pendingCount : undefined},
    {key: 'pending', label: 'Pending approval', badge: approvalsCount > 0 ? approvalsCount : undefined},
    {key: 'all', label: 'All claims'},
    {key: 'analytics', label: 'Analytics'},
  ];

  return (
    <div role="tablist" aria-label="Claim views" className="flex flex-wrap gap-1 border-b border-[var(--border-subtle)]">
      {tabs.map((t) => {
        const active = activeTab === t.key;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={`relative px-4 sm:px-5 py-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 ${
              active
                ? 'text-[var(--text-heading)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              {t.label}
              {t.badge !== undefined && (
                <span className="inline-flex items-center justify-center min-w-5 px-1.5 h-5 text-2xs font-semibold rounded-full bg-warning-100 text-warning-700 dark:bg-warning-900/40 dark:text-warning-300">
                  {t.badge}
                </span>
              )}
            </span>
            {active && (
              <span className="absolute inset-x-3 -bottom-px h-0.5 bg-accent-600 dark:bg-accent-400" aria-hidden="true" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Bulk action bar ──────────────────────────────────────────────────────────
function BulkActionBar({
  count,
  total,
  processing,
  onSelectAll,
  onApprove,
  onReject,
  onCancel,
}: {
  count: number;
  total: number;
  processing: boolean;
  onSelectAll: () => void;
  onApprove: () => void;
  onReject: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-accent-200 bg-accent-50/40 dark:border-accent-700/40 dark:bg-accent-900/20 px-5 py-4">
      <div className="flex items-center gap-4">
        <input
          type="checkbox"
          checked={count === total && count > 0}
          onChange={onSelectAll}
          className="w-5 h-5 rounded border-[var(--border-main)] text-accent-700 focus:ring-accent-500"
          aria-label="Select all pending claims"
        />
        <span className="text-sm font-medium text-accent-900 dark:text-accent-100 font-mono tabular-nums">
          {count} claim{count !== 1 ? 's' : ''} selected
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <PermissionGate permission={Permissions.EXPENSE_APPROVE}>
          <Button variant="primary" size="sm" onClick={onApprove} disabled={processing}>
            <CheckCircle className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {processing ? 'Processing...' : `Approve ${count}`}
          </Button>
        </PermissionGate>
        <PermissionGate permission={Permissions.EXPENSE_APPROVE}>
          <Button variant="danger" size="sm" onClick={onReject} disabled={processing}>
            <XCircle className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Reject {count}
          </Button>
        </PermissionGate>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ── New claim form ───────────────────────────────────────────────────────────
function NewClaimForm({
  register,
  errors,
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  register: ReturnType<typeof useForm<ExpenseClaimFormData>>['register'];
  errors: ReturnType<typeof useForm<ExpenseClaimFormData>>['formState']['errors'];
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <motion.section
      initial={{opacity: 0, y: 4}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.3, ease: EASE}}
      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-6"
      aria-label="Create new claim"
    >
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-[var(--text-heading)]">New expense claim</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Receipts, description, amount, that&apos;s all you need.</p>
        </div>
        <FileText className="h-5 w-5 text-[var(--text-muted)]" aria-hidden="true" />
      </div>
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Claim date</label>
          <input type="date" className="input-aura" {...register('claimDate')} />
          {errors.claimDate && <span className="text-danger-500 text-sm">{errors.claimDate.message}</span>}
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Category</label>
          <select className="input-aura" {...register('category')}>
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
          <textarea className="input-aura" rows={3} placeholder="Describe your expense..." {...register('description')} />
          {errors.description && <span className="text-danger-500 text-sm">{errors.description.message}</span>}
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input-aura font-mono tabular-nums"
            placeholder="0.00"
            {...register('amount')}
          />
          {errors.amount && <span className="text-danger-500 text-sm">{errors.amount.message}</span>}
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Currency</label>
          <select className="input-aura" {...register('currency')}>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="INR">INR</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Receipt URL</label>
          <input type="url" className="input-aura" placeholder="https://..." {...register('receiptUrl')} />
          {errors.receiptUrl && <span className="text-danger-500 text-sm">{errors.receiptUrl.message}</span>}
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Notes</label>
          <textarea className="input-aura" rows={2} placeholder="Additional notes..." {...register('notes')} />
        </div>
        <div className="md:col-span-2 flex flex-wrap gap-4 pt-2">
          <PermissionGate permission={Permissions.EXPENSE_CREATE}>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create claim'}
            </Button>
          </PermissionGate>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </motion.section>
  );
}

// ── Recent claims list (divide-y, not nested cards) ──────────────────────────
type ClaimItem = {
  id: string;
  claimNumber?: string;
  description?: string;
  status: string;
  amount: number;
  currency: string;
  category?: string;
  claimDate: string;
  submittedAt?: string;
  approvedAt?: string;
  approvedByName?: string;
  rejectionReason?: string;
  receiptUrl?: string;
  employeeName?: string;
  employeeCode?: string;
};

function RecentClaimsList({
  activeTab,
  claims,
  selectedClaims,
  onSelectClaim,
  onSelectAll,
  onSubmit,
  onDelete,
  onApprove,
  onReject,
}: {
  activeTab: TabType;
  claims: ClaimItem[];
  selectedClaims: Set<string>;
  onSelectClaim: (id: string) => void;
  onSelectAll: () => void;
  onSubmit: (id: string) => void;
  onDelete: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const selectableTotal = claims.filter((c) => c.status === 'SUBMITTED').length;
  const allSelected = selectableTotal > 0 && selectedClaims.size === selectableTotal;

  return (
    <motion.section
      initial={{opacity: 0, y: 6}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.4, ease: EASE}}
      aria-label="Recent claims"
    >
      {activeTab === 'pending' && selectableTotal > 0 && (
        <div className="flex items-center gap-4 py-4 px-1 border-b border-[var(--border-subtle)]">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onSelectAll}
            className="w-4 h-4 rounded border-[var(--border-main)] text-accent-700 focus:ring-accent-500"
            aria-label="Select all submitted claims"
          />
          <span className="text-sm text-[var(--text-secondary)] font-mono tabular-nums">
            Select all ({selectableTotal})
          </span>
        </div>
      )}

      <ul className="divide-y divide-[var(--border-subtle)] border-b border-[var(--border-subtle)]">
        {claims.map((claim) => (
          <ClaimRow
            key={claim.id}
            claim={claim}
            activeTab={activeTab}
            selected={selectedClaims.has(claim.id)}
            onSelect={() => onSelectClaim(claim.id)}
            onSubmit={() => onSubmit(claim.id)}
            onDelete={() => onDelete(claim.id)}
            onApprove={() => onApprove(claim.id)}
            onReject={() => onReject(claim.id)}
          />
        ))}
      </ul>
    </motion.section>
  );
}

function ClaimRow({
  claim,
  activeTab,
  selected,
  onSelect,
  onSubmit,
  onDelete,
  onApprove,
  onReject,
}: {
  claim: ClaimItem;
  activeTab: TabType;
  selected: boolean;
  onSelect: () => void;
  onSubmit: () => void;
  onDelete: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <li className={`py-5 grid grid-cols-[auto_1fr_auto] gap-4 sm:gap-6 items-start ${selected ? 'bg-accent-50/40 dark:bg-accent-900/10' : ''}`}>
      <div className="flex items-start gap-4 pt-1">
        {activeTab === 'pending' && claim.status === 'SUBMITTED' ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            className="w-4 h-4 rounded border-[var(--border-main)] text-accent-700 focus:ring-accent-500"
            aria-label={`Select claim ${claim.claimNumber}`}
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
            <Receipt className="h-4 w-4" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-4">
          <h3 className="text-sm font-semibold text-[var(--text-heading)] truncate">{claim.claimNumber}</h3>
          <StatusBadge status={claim.status} domain={EXPENSE_STATUS} />
          {claim.category && (
            <span className="text-2xs uppercase tracking-wider text-[var(--text-muted)]">
              {claim.category.replace(/_/g, ' ')}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-[var(--text-secondary)] line-clamp-2">{claim.description}</p>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--text-muted)] font-mono tabular-nums">
          <span>Claim {formatDate(claim.claimDate)}</span>
          {claim.submittedAt && <span>Submitted {formatDate(claim.submittedAt)}</span>}
          {claim.approvedAt && claim.approvedByName && (
            <span className="font-sans">Approved by {claim.approvedByName}</span>
          )}
          {claim.employeeName && (
            <span className="font-sans">
              {claim.employeeName}
              {claim.employeeCode ? ` (${claim.employeeCode})` : ''}
            </span>
          )}
        </div>
        {claim.rejectionReason && (
          <p className="mt-2 text-xs text-danger-600 dark:text-danger-300">
            <span className="font-medium">Rejected:</span> {claim.rejectionReason}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {claim.status === 'DRAFT' && activeTab === 'my-claims' && (
            <>
              <PermissionGate permission={Permissions.EXPENSE_CREATE}>
                <Button variant="primary" size="sm" onClick={onSubmit}>
                  Submit for approval
                </Button>
              </PermissionGate>
              <PermissionGate permission={Permissions.EXPENSE_CREATE}>
                <Button variant="danger" size="sm" onClick={onDelete}>
                  <XCircle className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Delete
                </Button>
              </PermissionGate>
            </>
          )}
          {claim.status === 'SUBMITTED' && activeTab === 'pending' && (
            <>
              <PermissionGate permission={Permissions.EXPENSE_APPROVE}>
                <Button variant="primary" size="sm" onClick={onApprove}>
                  <CheckCircle className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Approve
                </Button>
              </PermissionGate>
              <PermissionGate permission={Permissions.EXPENSE_APPROVE}>
                <Button variant="danger" size="sm" onClick={onReject}>
                  <XCircle className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Reject
                </Button>
              </PermissionGate>
            </>
          )}
          {claim.receiptUrl && (
            <Button variant="outline" size="sm" onClick={() => safeWindowOpen(claim.receiptUrl, '_blank')}>
              <Receipt className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              View receipt
            </Button>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className="font-mono text-lg sm:text-xl font-semibold tabular-nums tracking-tight text-[var(--text-heading)]">
          {formatCurrency(claim.amount, claim.currency)}
        </p>
      </div>
    </li>
  );
}

// ── Attention strip ──────────────────────────────────────────────────────────
function AttentionStrip({count}: {count: number}) {
  return (
    <motion.aside
      initial={{opacity: 0, y: 6}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.45, ease: EASE, delay: 0.42}}
      role="status"
      aria-live="polite"
      className="flex items-center justify-between gap-4 rounded-xl border border-danger-200 bg-danger-50/40 dark:border-danger-700/40 dark:bg-danger-950/30 px-5 py-4"
    >
      <div className="flex items-center gap-4 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0 text-danger-600 dark:text-danger-400" aria-hidden="true" />
        <p className="text-[var(--text-primary)]">
          <span className="font-mono font-semibold tabular-nums">{count}</span>{' '}
          {count === 1 ? 'claim is' : 'claims are'} above the per-claim policy cap. Review before approval.
        </p>
      </div>
    </motion.aside>
  );
}

// ── Inline alert (one-line, no card stack) ───────────────────────────────────
function InlineAlert({
  tone,
  icon: Icon,
  message,
}: {
  tone: 'success' | 'danger';
  icon: React.ElementType;
  message: string;
}) {
  const styles =
    tone === 'success'
      ? 'border-success-200 bg-success-50/40 dark:border-success-700/40 dark:bg-success-950/30 text-success-700 dark:text-success-300'
      : 'border-danger-200 bg-danger-50/40 dark:border-danger-700/40 dark:bg-danger-950/30 text-danger-700 dark:text-danger-300';
  return (
    <div role="alert" className={`flex items-center gap-4 rounded-xl border px-4 py-4 text-sm ${styles}`}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="text-[var(--text-primary)]">{message}</span>
    </div>
  );
}
