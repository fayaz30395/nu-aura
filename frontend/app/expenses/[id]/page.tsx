'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import { AppLayout } from '@/components/layout';
import {
  ArrowLeft, Receipt, CheckCircle, XCircle, Clock, DollarSign,
  FileText, User, Calendar, Tag, Plus, Trash2,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  useExpenseClaimDetail,
  useExpenseClaimItems,
  useAddExpenseItem,
  useDeleteExpenseItem,
  useSubmitExpenseClaim,
  useApproveExpenseClaim,
  useRejectExpenseClaim,
  useActiveExpenseCategories,
} from '@/lib/hooks/queries';
import { Modal, ModalHeader, ModalBody, ModalFooter, ConfirmDialog } from '@/components/ui';
import { ExpenseStatus, CreateExpenseItemRequest } from '@/lib/types/hrms/expense';
import { ReceiptScanner, ConfirmedOcrData } from '@/components/expenses';

const itemSchema = z.object({
  description: z.string().min(1, 'Description required'),
  amount: z.number({ coerce: true }).positive('Amount must be positive'),
  expenseDate: z.string().min(1, 'Date required'),
  categoryId: z.string().optional(),
  merchantName: z.string().optional(),
  projectCode: z.string().optional(),
  notes: z.string().optional(),
  isBillable: z.boolean().optional(),
});

type ItemFormData = z.infer<typeof itemSchema>;

const STATUS_CONFIG: Record<ExpenseStatus, { color: string; icon: typeof Clock; label: string }> = {
  DRAFT: { color: 'bg-surface-100 text-surface-700', icon: FileText, label: 'Draft' },
  SUBMITTED: { color: 'bg-accent-100 text-accent-700', icon: Clock, label: 'Submitted' },
  PENDING_APPROVAL: { color: 'bg-warning-100 text-warning-700', icon: Clock, label: 'Pending Approval' },
  APPROVED: { color: 'bg-success-100 text-success-700', icon: CheckCircle, label: 'Approved' },
  REJECTED: { color: 'bg-danger-100 text-danger-700', icon: XCircle, label: 'Rejected' },
  PROCESSING: { color: 'bg-accent-100 text-accent-700', icon: Clock, label: 'Processing' },
  REIMBURSED: { color: 'bg-success-100 text-success-700', icon: DollarSign, label: 'Reimbursed' },
  PAID: { color: 'bg-success-100 text-success-700', icon: DollarSign, label: 'Paid' },
  CANCELLED: { color: 'bg-surface-100 text-surface-500', icon: XCircle, label: 'Cancelled' },
};

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { hasPermission, isReady: permissionsReady } = usePermissions();
  const { user } = useAuth();
  const claimId = params.id as string;

  useEffect(() => {
    if (!permissionsReady) return;
    if (!hasPermission(Permissions.EXPENSE_VIEW)) {
      router.replace('/me/dashboard');
    }
  }, [permissionsReady, hasPermission, router]);

  const { data: claim, isLoading } = useExpenseClaimDetail(claimId);
  const { data: items = [], isLoading: itemsLoading } = useExpenseClaimItems(claimId);
  const { data: categories = [] } = useActiveExpenseCategories();

  const addItemMutation = useAddExpenseItem();
  const deleteItemMutation = useDeleteExpenseItem();
  const submitMutation = useSubmitExpenseClaim();
  const approveMutation = useApproveExpenseClaim();
  const rejectMutation = useRejectExpenseClaim();

  const [showAddItem, setShowAddItem] = useState(false);
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { errors },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      expenseDate: new Date().toISOString().split('T')[0],
      isBillable: false,
    },
  });

  const onAddItem = (data: ItemFormData) => {
    addItemMutation.mutate(
      { claimId, data: { ...data, currency: 'INR' } as CreateExpenseItemRequest },
      {
        onSuccess: () => {
          setShowAddItem(false);
          resetForm();
        },
      }
    );
  };

  const onReceiptConfirm = (ocrData: ConfirmedOcrData) => {
    setShowReceiptScanner(false);
    // Pre-fill the add item form with OCR data and open it
    resetForm({
      description: ocrData.merchantName ? `Receipt from ${ocrData.merchantName}` : 'Scanned receipt',
      amount: ocrData.amount || 0,
      expenseDate: ocrData.receiptDate || new Date().toISOString().split('T')[0],
      merchantName: ocrData.merchantName || '',
      isBillable: false,
    });
    setShowAddItem(true);
  };

  const onDeleteItem = () => {
    if (!deleteItemId) return;
    deleteItemMutation.mutate(
      { claimId, itemId: deleteItemId },
      { onSuccess: () => setDeleteItemId(null) }
    );
  };

  const onSubmit = () => {
    submitMutation.mutate(claimId);
  };

  const onApprove = () => {
    approveMutation.mutate(claimId);
  };

  const onReject = () => {
    rejectMutation.mutate(
      { claimId, reason: rejectReason },
      { onSuccess: () => { setShowRejectDialog(false); setRejectReason(''); } }
    );
  };

  if (!permissionsReady || !hasPermission(Permissions.EXPENSE_VIEW)) {
    return null;
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent-700" />
        </div>
      </AppLayout>
    );
  }

  if (!claim) {
    return (
      <AppLayout>
        <div className="text-center py-20 text-surface-500">Expense claim not found.</div>
      </AppLayout>
    );
  }

  const statusConfig = STATUS_CONFIG[claim.status];
  const StatusIcon = statusConfig.icon;
  const isDraft = claim.status === 'DRAFT';
  const isOwner = user?.employeeId === claim.employeeId;
  const canApprove = claim.status === 'SUBMITTED' || claim.status === 'PENDING_APPROVAL';

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/expenses')}
            className="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            aria-label="Back to expenses"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
              {claim.claimNumber}
            </h1>
            <p className="text-surface-500">{claim.title || claim.description}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium ${statusConfig.color}`}>
            <StatusIcon className="w-4 h-4" />
            {statusConfig.label}
          </span>
        </div>

        {/* Claim Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[var(--bg-input)] border border-surface-200 dark:border-surface-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-500 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Total Amount</span>
            </div>
            <p className="text-xl font-bold text-surface-900 dark:text-surface-50">
              {formatCurrency(claim.amount, claim.currency)}
            </p>
          </div>
          <div className="bg-[var(--bg-input)] border border-surface-200 dark:border-surface-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-500 mb-1">
              <User className="w-4 h-4" />
              <span className="text-sm">Employee</span>
            </div>
            <p className="text-sm font-medium text-surface-900 dark:text-surface-50">{claim.employeeName}</p>
          </div>
          <div className="bg-[var(--bg-input)] border border-surface-200 dark:border-surface-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-500 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Claim Date</span>
            </div>
            <p className="text-sm font-medium text-surface-900 dark:text-surface-50">
              {format(new Date(claim.claimDate), 'dd MMM yyyy')}
            </p>
          </div>
          <div className="bg-[var(--bg-input)] border border-surface-200 dark:border-surface-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-500 mb-1">
              <Tag className="w-4 h-4" />
              <span className="text-sm">Category</span>
            </div>
            <p className="text-sm font-medium text-surface-900 dark:text-surface-50">
              {claim.categoryDisplayName || claim.category}
            </p>
          </div>
        </div>

        {/* Items Section */}
        <div className="bg-[var(--bg-input)] border border-surface-200 dark:border-surface-700 rounded-lg">
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-700">
            <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Expense Items ({items.length})
            </h2>
            {isDraft && isOwner && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowReceiptScanner(true)}
                  className="flex items-center gap-1.5 px-4 py-1.5 border border-accent-700 text-accent-700 hover:bg-accent-50 dark:hover:bg-accent-900/20 rounded-lg text-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                >
                  <Receipt className="w-4 h-4" />
                  Scan Receipt
                </button>
                <button
                  onClick={() => setShowAddItem(true)}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-accent-700 hover:bg-accent-800 text-white rounded-lg text-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>
            )}
          </div>
          {itemsLoading ? (
            <div className="p-6 text-center text-surface-500">Loading items...</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-surface-500">
              No items added yet. {isDraft && isOwner ? 'Click "Add Item" to add expense line items.' : ''}
            </div>
          ) : (
            <div className="divide-y divide-surface-200 dark:divide-surface-700">
              {items.map((item) => (
                <div key={item.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-surface-900 dark:text-surface-50 truncate">{item.description}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-surface-500">
                      {item.categoryName && <span>{item.categoryName}</span>}
                      <span>{format(new Date(item.expenseDate), 'dd MMM yyyy')}</span>
                      {item.merchantName && <span>{item.merchantName}</span>}
                      {item.isBillable && (
                        <span className="px-1.5 py-0.5 bg-accent-100 text-accent-700 rounded text-xs">Billable</span>
                      )}
                    </div>
                  </div>
                  <p className="font-semibold text-surface-900 dark:text-surface-50 whitespace-nowrap">
                    {formatCurrency(item.amount, item.currency)}
                  </p>
                  {item.receiptFileName && (
                    <span className="text-xs text-accent-600 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {item.receiptFileName}
                    </span>
                  )}
                  {isDraft && isOwner && (
                    <button
                      onClick={() => setDeleteItemId(item.id)}
                      className="p-1.5 text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                      aria-label="Delete item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approval Timeline */}
        {(claim.submittedAt || claim.approvedAt || claim.rejectedAt || claim.reimbursedAt) && (
          <div className="bg-[var(--bg-input)] border border-surface-200 dark:border-surface-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-50 mb-4">Approval Timeline</h2>
            <div className="space-y-4">
              {claim.submittedAt && (
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-accent-500" />
                  <span className="text-sm text-surface-600 dark:text-surface-400">
                    Submitted on {format(new Date(claim.submittedAt), 'dd MMM yyyy HH:mm')}
                  </span>
                </div>
              )}
              {claim.approvedAt && (
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-success-500" />
                  <span className="text-sm text-surface-600 dark:text-surface-400">
                    Approved by {claim.approvedByName} on {format(new Date(claim.approvedAt), 'dd MMM yyyy HH:mm')}
                  </span>
                </div>
              )}
              {claim.rejectedAt && (
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-danger-500" />
                  <span className="text-sm text-surface-600 dark:text-surface-400">
                    Rejected by {claim.rejectedByName} on {format(new Date(claim.rejectedAt), 'dd MMM yyyy HH:mm')}
                    {claim.rejectionReason && ` — "${claim.rejectionReason}"`}
                  </span>
                </div>
              )}
              {claim.reimbursedAt && (
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-success-500" />
                  <span className="text-sm text-surface-600 dark:text-surface-400">
                    Reimbursed on {format(new Date(claim.reimbursedAt), 'dd MMM yyyy HH:mm')}
                    {claim.reimbursementRef && ` (Ref: ${claim.reimbursementRef})`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {claim.notes && (
          <div className="bg-[var(--bg-input)] border border-surface-200 dark:border-surface-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-50 mb-2">Notes</h2>
            <p className="text-surface-600 dark:text-surface-400">{claim.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          {isDraft && isOwner && (
            <button
              onClick={onSubmit}
              disabled={submitMutation.isPending}
              className="px-4 py-2 bg-accent-700 hover:bg-accent-800 text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            >
              {submitMutation.isPending ? 'Submitting...' : 'Submit for Approval'}
            </button>
          )}
          {canApprove && !isOwner && (
            <>
              <button
                onClick={onApprove}
                disabled={approveMutation.isPending}
                className="px-4 py-2 bg-success-600 hover:bg-success-700 text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                {approveMutation.isPending ? 'Approving...' : 'Approve'}
              </button>
              <button
                onClick={() => setShowRejectDialog(true)}
                className="px-4 py-2 bg-danger-600 hover:bg-danger-700 text-white rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                Reject
              </button>
            </>
          )}
        </div>

        {/* Add Item Modal */}
        <Modal isOpen={showAddItem} onClose={() => setShowAddItem(false)} size="lg">
          <ModalHeader>Add Expense Item</ModalHeader>
          <form onSubmit={handleSubmit(onAddItem)}>
            <ModalBody>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Description *</label>
                  <input {...register('description')} className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-input)] text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2" />
                  {errors.description && <p className="text-danger-500 text-sm mt-1">{errors.description.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Amount *</label>
                    <input type="number" step="0.01" {...register('amount')} className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-input)] text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2" />
                    {errors.amount && <p className="text-danger-500 text-sm mt-1">{errors.amount.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Date *</label>
                    <input type="date" {...register('expenseDate')} className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-input)] text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2" />
                    {errors.expenseDate && <p className="text-danger-500 text-sm mt-1">{errors.expenseDate.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Category</label>
                    <select {...register('categoryId')} className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-input)] text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2">
                      <option value="">Select category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Merchant</label>
                    <input {...register('merchantName')} className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-input)] text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Notes</label>
                  <textarea {...register('notes')} rows={2} className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-input)] text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2" />
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...register('isBillable')} className="rounded border-surface-300" />
                  <span className="text-sm text-surface-700 dark:text-surface-300">Billable to client</span>
                </label>
              </div>
            </ModalBody>
            <ModalFooter>
              <button type="button" onClick={() => setShowAddItem(false)} className="px-4 py-2 text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                Cancel
              </button>
              <button type="submit" disabled={addItemMutation.isPending} className="px-4 py-2 bg-accent-700 hover:bg-accent-800 text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                {addItemMutation.isPending ? 'Adding...' : 'Add Item'}
              </button>
            </ModalFooter>
          </form>
        </Modal>

        {/* Reject Dialog */}
        <Modal isOpen={showRejectDialog} onClose={() => setShowRejectDialog(false)} size="md">
          <ModalHeader>Reject Expense Claim</ModalHeader>
          <ModalBody>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Reason for Rejection *</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-input)] text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2"
                placeholder="Provide reason..."
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <button type="button" onClick={() => setShowRejectDialog(false)} className="px-4 py-2 text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
              Cancel
            </button>
            <button
              onClick={onReject}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              className="px-4 py-2 bg-danger-600 hover:bg-danger-700 text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
            </button>
          </ModalFooter>
        </Modal>

        {/* Delete Item Confirm */}
        <ConfirmDialog
          isOpen={!!deleteItemId}
          onClose={() => setDeleteItemId(null)}
          onConfirm={onDeleteItem}
          title="Delete Expense Item"
          message="Are you sure you want to delete this item? This action cannot be undone."
          confirmText="Delete"
          type="danger"
          loading={deleteItemMutation.isPending}
        />

        {/* Receipt Scanner Modal */}
        <Modal isOpen={showReceiptScanner} onClose={() => setShowReceiptScanner(false)} size="lg">
          <ModalHeader>Scan Receipt</ModalHeader>
          <ModalBody>
            <ReceiptScanner
              onConfirm={onReceiptConfirm}
              onCancel={() => setShowReceiptScanner(false)}
            />
          </ModalBody>
        </Modal>
      </div>
    </AppLayout>
  );
}
