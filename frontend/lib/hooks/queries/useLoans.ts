'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {loanService} from '@/lib/services/hrms/loan.service';
import {CreateLoanRequest, LoanFilters,} from '@/lib/types/hrms/loan';

// Query keys for cache management
export const loanKeys = {
  all: ['loans'] as const,
  myLoans: (page: number, size: number) =>
    [...loanKeys.all, 'my', {page, size}] as const,
  allLoans: (page: number, size: number, filters?: LoanFilters) =>
    [...loanKeys.all, 'all', {page, size, filters}] as const,
  detail: (id: string) => [...loanKeys.all, 'detail', id] as const,
  pending: (page: number, size: number) =>
    [...loanKeys.all, 'pending', {page, size}] as const,
};

// ========== Queries ==========

/**
 * Fetch current user's loans
 */
export function useEmployeeLoans(page: number = 0, size: number = 20, enabled: boolean = true) {
  return useQuery({
    queryKey: loanKeys.myLoans(page, size),
    queryFn: () => loanService.getMyLoans(page, size),
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Fetch all loans (admin view)
 */
export function useAllLoans(
  page: number = 0,
  size: number = 20,
  filters?: LoanFilters,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: loanKeys.allLoans(page, size, filters),
    queryFn: () => loanService.getAllLoans(page, size, filters),
    enabled,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch a single loan by ID
 */
export function useLoan(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: loanKeys.detail(id),
    queryFn: () => loanService.getLoanById(id),
    enabled: enabled && !!id,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch pending loan approvals
 */
export function usePendingLoans(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: loanKeys.pending(page, size),
    queryFn: () => loanService.getPendingApprovals(page, size),
    staleTime: 30 * 1000, // 30 seconds for approvals
  });
}

// DEV-5: useLoanSummary, useUpdateLoan, useDeleteLoan and useSubmitLoan were
// removed — LoanController has no GET /summary, PUT /{id}, DELETE /{id} or
// POST /{id}/submit routes (loan applications are created already submitted).

// ========== Mutations ==========

/**
 * Create a new loan application
 */
export function useCreateLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLoanRequest) => loanService.createLoan(data),
    onSuccess: () => {
      // BUG-FIX: Use broader key prefix to invalidate all paginated loan lists
      queryClient.invalidateQueries({queryKey: loanKeys.all});
    },
  });
}

/**
 * Approve a loan
 */
export function useApproveLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({id, approvedAmount}: { id: string; approvedAmount?: number }) =>
      loanService.approveLoan(id, approvedAmount),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: loanKeys.all});
    },
  });
}

/**
 * Reject a loan
 */
export function useRejectLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({id, reason}: { id: string; reason: string }) =>
      loanService.rejectLoan(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: loanKeys.all});
    },
  });
}

/**
 * Disburse a loan
 */
export function useDisburseLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => loanService.disburseLoan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: loanKeys.all});
    },
  });
}

/**
 * Record a loan repayment
 */
export function useRecordLoanPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({id, amount}: { id: string; amount: number }) =>
      loanService.recordPayment(id, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: loanKeys.all});
    },
  });
}

/**
 * Close a loan (backend models this as POST /loans/{id}/cancel)
 */
export function useCloseLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => loanService.closeLoan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: loanKeys.all});
    },
  });
}
