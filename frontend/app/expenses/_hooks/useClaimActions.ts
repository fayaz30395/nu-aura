'use client';

import {useState} from 'react';
import {useToast} from '@/components/notifications/ToastProvider';
import {
  useApproveExpenseClaim,
  useCreateExpenseClaim,
  useDeleteExpenseClaim,
  useRejectExpenseClaim,
  useSubmitExpenseClaim,
} from '@/lib/hooks/queries';
import type {CreateExpenseClaimRequest, CurrencyCode, ExpenseCategory} from '@/lib/types/hrms/expense';
import {createLogger} from '@/lib/utils/logger';
import type {ExpenseClaimFormData} from '../_components/NewClaimModal';

const log = createLogger('ExpensesPage');

/**
 * Claim mutations for the expenses list. Error toasts come from the global
 * MutationCache handler, so the handlers here only toast on success.
 */
export function useClaimActions(employeeId: string | undefined) {
  const toast = useToast();
  const createMutation = useCreateExpenseClaim();
  const submitMutation = useSubmitExpenseClaim();
  const approveMutation = useApproveExpenseClaim();
  const rejectMutation = useRejectExpenseClaim();
  const deleteMutation = useDeleteExpenseClaim();

  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [selectedClaims, setSelectedClaims] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [showBulkReject, setShowBulkReject] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const track = async (id: string, run: () => Promise<unknown>) => {
    setPendingIds((prev) => new Set(prev).add(id));
    try {
      await run();
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const createClaim = async (data: ExpenseClaimFormData) => {
    if (!employeeId) {
      toast.error('You must be logged in to create an expense claim');
      throw new Error('No employee profile');
    }
    const request: CreateExpenseClaimRequest = {
      claimDate: data.claimDate,
      category: data.category as ExpenseCategory,
      description: data.description,
      amount: data.amount,
      currency: data.currency as CurrencyCode,
      receiptUrl: data.receiptUrl || undefined,
      notes: data.notes || undefined,
    };
    await createMutation.mutateAsync({employeeId, data: request});
    toast.success('Expense claim created');
  };

  const submitClaim = (id: string) =>
    track(id, async () => {
      try {
        await submitMutation.mutateAsync(id);
        toast.success('Expense claim submitted');
      } catch (err) {
        log.error('Error submitting claim:', err);
      }
    });

  const approveClaim = (id: string) =>
    track(id, async () => {
      if (!employeeId) return;
      try {
        await approveMutation.mutateAsync(id);
        toast.success('Expense claim approved');
      } catch (err) {
        log.error('Error approving claim:', err);
      }
    });

  const confirmReject = async (reason?: string) => {
    const trimmed = (reason ?? '').trim();
    if (!employeeId || !rejectTarget || !trimmed) return;
    try {
      await rejectMutation.mutateAsync({claimId: rejectTarget, reason: trimmed});
      toast.success('Expense claim rejected');
      setRejectTarget(null);
    } catch (err) {
      log.error('Error rejecting claim:', err);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget);
      toast.success('Expense claim deleted');
      setDeleteTarget(null);
    } catch (err) {
      log.error('Error deleting claim:', err);
    }
  };

  const bulkApprove = async () => {
    if (!employeeId || selectedClaims.size === 0) return;
    const count = selectedClaims.size;
    setBulkProcessing(true);
    try {
      await Promise.all(Array.from(selectedClaims).map((id) => approveMutation.mutateAsync(id)));
      setSelectedClaims(new Set());
      toast.success(`${count} claims approved`);
    } catch (err) {
      log.error('Bulk approve error:', err);
    } finally {
      setBulkProcessing(false);
    }
  };

  const bulkReject = async (reason?: string) => {
    const trimmed = (reason ?? '').trim();
    if (!employeeId || selectedClaims.size === 0 || !trimmed) return;
    const count = selectedClaims.size;
    setBulkProcessing(true);
    try {
      await Promise.all(
        Array.from(selectedClaims).map((claimId) => rejectMutation.mutateAsync({claimId, reason: trimmed}))
      );
      setSelectedClaims(new Set());
      setShowBulkReject(false);
      toast.success(`${count} claims rejected`);
    } catch (err) {
      log.error('Bulk reject error:', err);
    } finally {
      setBulkProcessing(false);
    }
  };

  return {
    pendingIds,
    selectedClaims,
    setSelectedClaims,
    bulkProcessing,
    showBulkReject,
    setShowBulkReject,
    rejectTarget,
    setRejectTarget,
    deleteTarget,
    setDeleteTarget,
    rejectPending: rejectMutation.isPending,
    deletePending: deleteMutation.isPending,
    createClaim,
    submitClaim,
    approveClaim,
    confirmReject,
    confirmDelete,
    bulkApprove,
    bulkReject,
  };
}
