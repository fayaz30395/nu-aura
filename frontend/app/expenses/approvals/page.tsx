'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {AppLayout} from '@/components/layout';
import {CheckCircle, Eye, XCircle} from 'lucide-react';
import {formatCurrency} from '@/lib/utils';
import {format} from 'date-fns';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {ConfirmDialog} from '@/components/ui';
import {useApproveExpenseClaim, usePendingExpenseClaims, useRejectExpenseClaim,} from '@/lib/hooks/queries';
import {ExpenseClaim} from '@/lib/types/hrms/expense';

export default function ExpenseApprovalsPage() {
  const router = useRouter();
  const {data: pendingData, isLoading} = usePendingExpenseClaims(0, 50);
  const approveMutation = useApproveExpenseClaim();
  const rejectMutation = useRejectExpenseClaim();

  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Bulk
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const claims = pendingData?.content || [];

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === claims.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(claims.map((c) => c.id)));
    }
  };

  const handleApprove = (claimId: string) => {
    approveMutation.mutate(claimId);
  };

  const handleReject = (reason?: string) => {
    const trimmed = (reason ?? rejectReason).trim();
    if (!selectedClaim || !trimmed) return;
    rejectMutation.mutate(
      {claimId: selectedClaim.id, reason: trimmed},
      {
        onSuccess: () => {
          setShowRejectModal(false);
          setRejectReason('');
          setSelectedClaim(null);
        },
      }
    );
  };

  const openReject = (claim: ExpenseClaim) => {
    setSelectedClaim(claim);
    setShowRejectModal(true);
  };

  return (
    <AppLayout>
      <PermissionGate permission={Permissions.EXPENSE_APPROVE}
                      fallback={<div className="p-8 text-center text-surface-500">You do not have permission to view
                        expense approvals.</div>}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <div className="row-between">
            <div>
              <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Expense Approvals</h1>
              <p className="text-surface-500 mt-1">
                {claims.length} pending claim{claims.length !== 1 ? 's' : ''} awaiting your approval
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent-700"/>
            </div>
          ) : claims.length === 0 ? (
            <div className="text-center py-20">
              <CheckCircle className="w-12 h-12 text-success-400 mx-auto mb-4"/>
              <p className="text-lg font-medium text-surface-700 dark:text-surface-300">All caught up!</p>
              <p className="text-surface-500">No pending expense claims to approve.</p>
            </div>
          ) : (
            <div
              className="bg-[var(--bg-input)] border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                <tr
                  className="text-left text-sm text-surface-500 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800">
                  <th scope="col" className="px-4 py-2">
                    <input
                      type="checkbox"
                      aria-label="Select all expense claims"
                      checked={selected.size === claims.length && claims.length > 0}
                      onChange={toggleAll}
                      className="rounded border-surface-300"
                    />
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">Claim #</th>
                  <th scope="col" className="px-4 py-2 font-medium">Employee</th>
                  <th scope="col" className="px-4 py-2 font-medium">Category</th>
                  <th scope="col" className="px-4 py-2 font-medium">Date</th>
                  <th scope="col" className="px-4 py-2 font-medium text-right">Amount</th>
                  <th scope="col" className="px-4 py-2 font-medium text-right">Actions</th>
                </tr>
                </thead>
                <tbody>
                {claims.map((claim) => (
                  <tr key={claim.id}
                      className="border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selected.has(claim.id)}
                        onChange={() => toggleSelect(claim.id)}
                        className="rounded border-surface-300"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => router.push(`/expenses/${claim.id}`)}
                        className="text-accent-700 hover:underline font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                      >
                        {claim.claimNumber}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-surface-700 dark:text-surface-300">{claim.employeeName}</td>
                    <td className="px-4 py-4">
                        <span className="px-2 py-0.5 bg-surface-100 dark:bg-surface-700 rounded text-xs font-medium">
                          {claim.categoryDisplayName || claim.category}
                        </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-surface-500">
                      {format(new Date(claim.claimDate), 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-surface-900 dark:text-surface-50">
                      {formatCurrency(claim.amount, claim.currency)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/expenses/${claim.id}`)}
                          className="p-1.5 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                          title="View details"
                          aria-label="View expense details"
                        >
                          <Eye className="w-4 h-4"/>
                        </button>
                        <button
                          onClick={() => handleApprove(claim.id)}
                          disabled={approveMutation.isPending}
                          className="p-1.5 text-success-600 hover:bg-success-50 dark:hover:bg-success-900/20 rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                          title="Approve"
                          aria-label="Approve expense"
                        >
                          <CheckCircle className="w-4 h-4"/>
                        </button>
                        <button
                          onClick={() => openReject(claim)}
                          className="p-1.5 text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                          title="Reject"
                          aria-label="Reject expense"
                        >
                          <XCircle className="w-4 h-4"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Reject Dialog */}
          <ConfirmDialog
            isOpen={showRejectModal}
            onClose={() => setShowRejectModal(false)}
            onConfirm={handleReject}
            title={`Reject Expense: ${selectedClaim?.claimNumber ?? ''}`}
            message={
              selectedClaim
                ? `Amount: ${formatCurrency(selectedClaim.amount, selectedClaim.currency)} · Employee: ${selectedClaim.employeeName}`
                : 'Please provide a reason for rejecting this expense claim.'
            }
            confirmText="Reject Claim"
            cancelText="Cancel"
            type="danger"
            loading={rejectMutation.isPending}
            reason={{
              label: 'Rejection reason',
              placeholder: 'Explain why this claim is being rejected...',
              required: true,
            }}
          />
        </div>
      </PermissionGate>
    </AppLayout>
  );
}
