'use client';

import {useMemo, useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {AppLayout} from '@/components/layout';
import {AlertCircle, CheckCircle, Plus, RefreshCw, Send, TrendingUp, Wallet, X} from 'lucide-react';
import {useAuth} from '@/lib/hooks/useAuth';
import {Permissions} from '@/lib/hooks/usePermissions';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {AdvanceStatus, ExpenseAdvanceEntity} from '@/lib/types/hrms/expense';
import {ConfirmDialog, EmptyState, Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui';
import {formatCurrency} from '@/lib/utils';
import {formatDate} from '@/lib/utils/format/date';
import {
  useAllExpenseAdvances,
  useApproveExpenseAdvance,
  useCancelExpenseAdvance,
  useCreateExpenseAdvance,
  useDisburseExpenseAdvance,
  useMyExpenseAdvances,
  useMyExpenseClaims,
  useSettleExpenseAdvance,
} from '@/lib/hooks/queries';

const advanceRequestSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Invalid currency code'),
  purpose: z.string().min(1, 'Purpose is required').max(500),
  notes: z.string().max(1000).optional().or(z.literal('')),
});

type AdvanceRequestFormData = z.infer<typeof advanceRequestSchema>;

type TabType = 'my-advances' | 'all-advances';

const STATUS_COLORS: Record<AdvanceStatus, string> = {
  REQUESTED: 'bg-accent-100 text-accent-700',
  APPROVED: 'bg-sky-100 text-sky-700',
  DISBURSED: 'bg-warning-100 text-warning-700',
  SETTLED: 'bg-success-100 text-success-700',
  CANCELLED: 'bg-surface-100 text-surface-500',
};

export default function ExpenseAdvancesPage() {
  const {user} = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('my-advances');
  const [showForm, setShowForm] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<ExpenseAdvanceEntity | null>(null);
  const [selectedClaimId, setSelectedClaimId] = useState('');

  const myAdvancesQuery = useMyExpenseAdvances(user?.employeeId, 0, 50);
  const allAdvancesQuery = useAllExpenseAdvances(0, 50);
  const myApprovedClaimsQuery = useMyExpenseClaims(user?.employeeId, 0, 50, 'APPROVED');

  const createMutation = useCreateExpenseAdvance();
  const approveMutation = useApproveExpenseAdvance();
  const disburseMutation = useDisburseExpenseAdvance();
  const settleMutation = useSettleExpenseAdvance();
  const cancelMutation = useCancelExpenseAdvance();

  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: {errors, isSubmitting},
  } = useForm<AdvanceRequestFormData>({
    resolver: zodResolver(advanceRequestSchema),
    defaultValues: {amount: 0, currency: 'INR', purpose: '', notes: ''},
  });

  const myAdvances = useMemo(() => myAdvancesQuery.data?.content || [], [myAdvancesQuery.data]);
  const allAdvances = useMemo(() => allAdvancesQuery.data?.content || [], [allAdvancesQuery.data]);
  const approvedClaims = useMemo(() => myApprovedClaimsQuery.data?.content || [], [myApprovedClaimsQuery.data]);

  const handleCreateAdvance = async (data: AdvanceRequestFormData) => {
    if (!user?.employeeId) return;
    try {
      await createMutation.mutateAsync({
        employeeId: user.employeeId,
        data: {
          amount: data.amount,
          currency: data.currency,
          purpose: data.purpose,
          notes: data.notes || undefined,
        },
      });
      setShowForm(false);
      resetForm();
    } catch {
      // error handled by React Query
    }
  };

  const openSettleModal = (advance: ExpenseAdvanceEntity) => {
    setSelectedAdvance(advance);
    setSelectedClaimId('');
    setShowSettleModal(true);
  };

  const handleSettle = async () => {
    if (!selectedAdvance || !selectedClaimId) return;
    try {
      await settleMutation.mutateAsync({advanceId: selectedAdvance.id, claimId: selectedClaimId});
      setShowSettleModal(false);
      setSelectedAdvance(null);
    } catch {
      // error handled by React Query
    }
  };

  const openCancelConfirm = (advance: ExpenseAdvanceEntity) => {
    setSelectedAdvance(advance);
    setShowCancelConfirm(true);
  };

  const handleCancel = async () => {
    if (!selectedAdvance) return;
    try {
      await cancelMutation.mutateAsync(selectedAdvance.id);
      setShowCancelConfirm(false);
      setSelectedAdvance(null);
    } catch {
      // error handled by React Query
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="row-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Expense Advances</h1>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
              Request travel advances and settle them against approved claims
            </p>
          </div>
          <PermissionGate permission={Permissions.EXPENSE_CREATE}>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent-700 hover:bg-accent-800 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4"/>
              Request Advance
            </button>
          </PermissionGate>
        </div>

        {/* Tabs */}
        <div className="border-b border-surface-200 dark:border-surface-700">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveTab('my-advances')}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                activeTab === 'my-advances'
                  ? 'border-accent-700 text-accent-700'
                  : 'border-transparent text-surface-500 hover:text-surface-700'
              }`}
            >
              My Advances
            </button>
            <PermissionGate permission={Permissions.EXPENSE_ADVANCE_MANAGE}>
              <button
                onClick={() => setActiveTab('all-advances')}
                className={`pb-4 text-sm font-medium border-b-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                  activeTab === 'all-advances'
                    ? 'border-accent-700 text-accent-700'
                    : 'border-transparent text-surface-500 hover:text-surface-700'
                }`}
              >
                All Advances
              </button>
            </PermissionGate>
          </nav>
        </div>

        {/* My Advances */}
        {activeTab === 'my-advances' && (
          <div className="space-y-4">
            {myAdvancesQuery.isError ? (
              <div className="p-6 bg-danger-50 dark:bg-danger-950/20 border border-danger-200 dark:border-danger-800 rounded-xl row-between">
                <div className="flex items-center gap-4">
                  <AlertCircle className="h-5 w-5 text-danger-500 flex-shrink-0"/>
                  <p className="text-sm text-danger-600 dark:text-danger-400">
                    {myAdvancesQuery.error instanceof Error ? myAdvancesQuery.error.message : 'Failed to load advances'}
                  </p>
                </div>
                <button
                  onClick={() => myAdvancesQuery.refetch()}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-danger-700 dark:text-danger-300 hover:bg-danger-100 dark:hover:bg-danger-900/30 rounded-lg transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5"/>
                  Retry
                </button>
              </div>
            ) : myAdvancesQuery.isLoading ? (
              <div className="text-center py-12 text-surface-500">Loading advances...</div>
            ) : myAdvances.length === 0 ? (
              <EmptyState
                title="No advances"
                description="Request a travel advance to get started."
                icon={<Wallet className="h-12 w-12 text-surface-400"/>}
              />
            ) : (
              <AdvancesTable
                advances={myAdvances}
                showEmployee={false}
                onSettle={openSettleModal}
                onCancel={openCancelConfirm}
                cancelPending={cancelMutation.isPending}
              />
            )}
          </div>
        )}

        {/* All Advances (admin) */}
        {activeTab === 'all-advances' && (
          <PermissionGate permission={Permissions.EXPENSE_ADVANCE_MANAGE}>
            <div className="space-y-4">
              {allAdvancesQuery.isError ? (
                <div className="p-6 bg-danger-50 dark:bg-danger-950/20 border border-danger-200 dark:border-danger-800 rounded-xl row-between">
                  <div className="flex items-center gap-4">
                    <AlertCircle className="h-5 w-5 text-danger-500 flex-shrink-0"/>
                    <p className="text-sm text-danger-600 dark:text-danger-400">
                      {allAdvancesQuery.error instanceof Error ? allAdvancesQuery.error.message : 'Failed to load advances'}
                    </p>
                  </div>
                  <button
                    onClick={() => allAdvancesQuery.refetch()}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-danger-700 dark:text-danger-300 hover:bg-danger-100 dark:hover:bg-danger-900/30 rounded-lg transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5"/>
                    Retry
                  </button>
                </div>
              ) : allAdvancesQuery.isLoading ? (
                <div className="text-center py-12 text-surface-500">Loading advances...</div>
              ) : allAdvances.length === 0 ? (
                <EmptyState
                  title="No advances"
                  description="No expense advances have been requested yet."
                  icon={<TrendingUp className="h-12 w-12 text-surface-400"/>}
                />
              ) : (
                <AdvancesTable
                  advances={allAdvances}
                  showEmployee
                  onApprove={(id) => approveMutation.mutate(id)}
                  onDisburse={(id) => disburseMutation.mutate(id)}
                  onCancel={openCancelConfirm}
                  approvePending={approveMutation.isPending}
                  disbursePending={disburseMutation.isPending}
                  cancelPending={cancelMutation.isPending}
                />
              )}
            </div>
          </PermissionGate>
        )}

        {/* Request Advance Modal */}
        <Modal isOpen={showForm} onClose={() => setShowForm(false)} size="md">
          <ModalHeader onClose={() => setShowForm(false)}>Request Advance</ModalHeader>
          <form onSubmit={handleSubmit(handleCreateAdvance)}>
            <ModalBody>
              <div className="space-y-4">
                <div>
                  <label htmlFor="advance-amount" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Amount *
                  </label>
                  <input
                    id="advance-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    {...register('amount')}
                    placeholder="0.00"
                    className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-input)] text-surface-900 dark:text-white focus:ring-2 focus:ring-accent-700 focus:border-transparent"
                  />
                  {errors.amount && <p className="text-danger-500 text-xs mt-1">{errors.amount.message}</p>}
                </div>
                <div>
                  <label htmlFor="advance-currency" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Currency
                  </label>
                  <select
                    id="advance-currency"
                    {...register('currency')}
                    className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-input)] text-surface-900 dark:text-white focus:ring-2 focus:ring-accent-700 focus:border-transparent"
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="advance-purpose" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Purpose *
                  </label>
                  <input
                    id="advance-purpose"
                    type="text"
                    {...register('purpose')}
                    placeholder="e.g., Client site travel"
                    className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-input)] text-surface-900 dark:text-white focus:ring-2 focus:ring-accent-700 focus:border-transparent"
                  />
                  {errors.purpose && <p className="text-danger-500 text-xs mt-1">{errors.purpose.message}</p>}
                </div>
                <div>
                  <label htmlFor="advance-notes" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    id="advance-notes"
                    {...register('notes')}
                    rows={2}
                    placeholder="Additional notes..."
                    className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-input)] text-surface-900 dark:text-white focus:ring-2 focus:ring-accent-700 focus:border-transparent"
                  />
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || createMutation.isPending}
                className="px-4 py-2 text-sm bg-accent-700 hover:bg-accent-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                {createMutation.isPending ? 'Requesting...' : 'Request Advance'}
              </button>
            </ModalFooter>
          </form>
        </Modal>

        {/* Settle Advance Modal */}
        <Modal isOpen={showSettleModal} onClose={() => setShowSettleModal(false)} size="md">
          <ModalHeader onClose={() => setShowSettleModal(false)}>
            Settle Advance {selectedAdvance ? formatCurrency(selectedAdvance.amount, selectedAdvance.currency) : ''}
          </ModalHeader>
          <ModalBody>
            {approvedClaims.length === 0 ? (
              <p className="text-sm text-surface-500">
                You have no approved expense claims to settle this advance against yet.
              </p>
            ) : (
              <div>
                <label htmlFor="settle-claim" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Settle against claim *
                </label>
                <select
                  id="settle-claim"
                  value={selectedClaimId}
                  onChange={(e) => setSelectedClaimId(e.target.value)}
                  className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-input)] text-surface-900 dark:text-white focus:ring-2 focus:ring-accent-700 focus:border-transparent"
                >
                  <option value="">Select an approved claim</option>
                  {approvedClaims.map((claim) => (
                    <option key={claim.id} value={claim.id}>
                      {claim.claimNumber} — {formatCurrency(claim.amount, claim.currency)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <button
              type="button"
              onClick={() => setShowSettleModal(false)}
              className="px-4 py-2 text-sm text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSettle}
              disabled={!selectedClaimId || settleMutation.isPending}
              className="px-4 py-2 text-sm bg-accent-700 hover:bg-accent-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            >
              {settleMutation.isPending ? 'Settling...' : 'Settle'}
            </button>
          </ModalFooter>
        </Modal>

        {/* Cancel Confirm */}
        <ConfirmDialog
          isOpen={showCancelConfirm}
          onClose={() => setShowCancelConfirm(false)}
          onConfirm={handleCancel}
          title="Cancel Advance"
          message="Are you sure you want to cancel this advance request? This action cannot be undone."
          confirmText="Cancel Advance"
          cancelText="Keep Advance"
          type="danger"
          loading={cancelMutation.isPending}
        />
      </div>
    </AppLayout>
  );
}

// ─── Table ──────────────────────────────────────────────────────────────────

interface AdvancesTableProps {
  advances: ExpenseAdvanceEntity[];
  showEmployee: boolean;
  onApprove?: (id: string) => void;
  onDisburse?: (id: string) => void;
  onSettle?: (advance: ExpenseAdvanceEntity) => void;
  onCancel?: (advance: ExpenseAdvanceEntity) => void;
  approvePending?: boolean;
  disbursePending?: boolean;
  cancelPending?: boolean;
}

function AdvancesTable({
  advances,
  showEmployee,
  onApprove,
  onDisburse,
  onSettle,
  onCancel,
  approvePending,
  disbursePending,
  cancelPending,
}: AdvancesTableProps) {
  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-50 dark:bg-surface-700/50">
          <tr>
            {showEmployee && (
              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-surface-500 uppercase">
                Employee
              </th>
            )}
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-surface-500 uppercase">
              Purpose
            </th>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-surface-500 uppercase">
              Amount
            </th>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-surface-500 uppercase">
              Requested
            </th>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-surface-500 uppercase">
              Status
            </th>
            <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-surface-500 uppercase">
              Actions
            </th>
          </tr>
          </thead>
          <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
          {advances.map((advance) => (
            <tr key={advance.id}>
              {showEmployee && (
                <td className="px-4 py-2 font-medium text-surface-900 dark:text-white">
                  {advance.employeeName || 'N/A'}
                </td>
              )}
              <td className="px-4 py-2 text-surface-600 dark:text-surface-300">{advance.purpose}</td>
              <td className="px-4 py-2 font-medium text-surface-900 dark:text-white">
                {formatCurrency(advance.amount, advance.currency)}
              </td>
              <td className="px-4 py-2 text-surface-600 dark:text-surface-300">
                {advance.requestedAt ? formatDate(advance.requestedAt) : '-'}
              </td>
              <td className="px-4 py-2">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[advance.status]}`}>
                  {advance.status}
                </span>
              </td>
              <td className="px-4 py-2 text-right">
                <div className="flex items-center justify-end gap-2">
                  {advance.status === 'REQUESTED' && onApprove && (
                    <button
                      onClick={() => onApprove(advance.id)}
                      disabled={approvePending}
                      className="flex items-center gap-1 px-2 py-1.5 text-xs bg-success-600 hover:bg-success-700 text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                    >
                      <CheckCircle className="h-3 w-3"/>
                      Approve
                    </button>
                  )}
                  {advance.status === 'APPROVED' && onDisburse && (
                    <button
                      onClick={() => onDisburse(advance.id)}
                      disabled={disbursePending}
                      className="flex items-center gap-1 px-2 py-1.5 text-xs bg-accent-700 hover:bg-accent-800 text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                    >
                      <Send className="h-3 w-3"/>
                      Disburse
                    </button>
                  )}
                  {advance.status === 'DISBURSED' && onSettle && (
                    <button
                      onClick={() => onSettle(advance)}
                      className="flex items-center gap-1 px-2 py-1.5 text-xs bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                    >
                      <Wallet className="h-3 w-3"/>
                      Settle
                    </button>
                  )}
                  {(advance.status === 'REQUESTED' || advance.status === 'APPROVED') && onCancel && (
                    <button
                      onClick={() => onCancel(advance)}
                      disabled={cancelPending}
                      className="flex items-center gap-1 px-2 py-1.5 text-xs bg-danger-600 hover:bg-danger-700 text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                    >
                      <X className="h-3 w-3"/>
                      Cancel
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
