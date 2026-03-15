'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseService, ExpenseStatistics } from '@/lib/services/expense.service';
import {
  ExpenseClaim,
  CreateExpenseClaimRequest,
  Page,
  ExpenseStatus,
} from '@/lib/types/expense';

// Query keys for cache management
export const expenseKeys = {
  all: ['expenses'] as const,
  // My claims
  myClaims: () => [...expenseKeys.all, 'my-claims'] as const,
  myClaimsList: (page: number, size: number, status?: ExpenseStatus, dateFrom?: string, dateTo?: string) =>
    [...expenseKeys.myClaims(), 'list', { page, size, status, dateFrom, dateTo }] as const,
  // All claims (admin)
  allClaims: () => [...expenseKeys.all, 'all-claims'] as const,
  allClaimsList: (page: number, size: number) =>
    [...expenseKeys.allClaims(), 'list', { page, size }] as const,
  // Pending claims for approval
  pendingClaims: () => [...expenseKeys.all, 'pending'] as const,
  pendingClaimsList: (page: number, size: number) =>
    [...expenseKeys.pendingClaims(), 'list', { page, size }] as const,
  // Statistics
  statistics: () => [...expenseKeys.all, 'statistics'] as const,
  statisticsForEmployee: (employeeId?: string) =>
    [...expenseKeys.statistics(), employeeId || 'self'] as const,
  // Claim detail
  claimDetail: (id: string) => [...expenseKeys.all, 'detail', id] as const,
};

// ========== QUERIES ==========

// Get my expense claims
export function useMyExpenseClaims(
  page: number = 0,
  size: number = 50,
  status?: ExpenseStatus,
  dateFrom?: string,
  dateTo?: string
) {
  return useQuery({
    queryKey: expenseKeys.myClaimsList(page, size, status, dateFrom, dateTo),
    queryFn: async () => {
      // Fetch my claims - we'll pass filter params via the service if needed
      // For now, filtering happens client-side in the page component
      return expenseService.getMyClaims('', page, size);
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

// Get all expense claims (admin/manager)
export function useAllExpenseClaims(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: expenseKeys.allClaimsList(page, size),
    queryFn: () => expenseService.getAllClaims(page, size),
    staleTime: 60 * 1000,
  });
}

// Get pending expense claims for approval
export function usePendingExpenseClaims(page: number = 0, size: number = 50) {
  return useQuery({
    queryKey: expenseKeys.pendingClaimsList(page, size),
    queryFn: () => expenseService.getPendingClaims(page, size),
    staleTime: 30 * 1000, // 30 seconds - pending items change frequently
  });
}

// Get expense statistics
export function useExpenseStatistics(employeeId?: string) {
  return useQuery({
    queryKey: expenseKeys.statisticsForEmployee(employeeId),
    queryFn: () => expenseService.getEmployeeStatistics(employeeId || '', new Date().getFullYear()),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ========== MUTATIONS ==========

// Create expense claim
export function useCreateExpenseClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ employeeId, data }: { employeeId: string; data: CreateExpenseClaimRequest }) =>
      expenseService.createClaim(employeeId, data),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: expenseKeys.myClaims() });
      queryClient.invalidateQueries({ queryKey: expenseKeys.statistics() });
    },
  });
}

// Update expense claim
export function useUpdateExpenseClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ claimId, data }: { claimId: string; data: CreateExpenseClaimRequest }) =>
      expenseService.updateClaim(claimId, data),
    onSuccess: (data) => {
      // Invalidate and update specific claim
      queryClient.invalidateQueries({ queryKey: expenseKeys.claimDetail(data.id) });
      queryClient.invalidateQueries({ queryKey: expenseKeys.myClaims() });
      queryClient.invalidateQueries({ queryKey: expenseKeys.allClaims() });
    },
  });
}

// Delete expense claim
export function useDeleteExpenseClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (claimId: string) => expenseService.deleteClaim(claimId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.myClaims() });
      queryClient.invalidateQueries({ queryKey: expenseKeys.allClaims() });
    },
  });
}

// Submit expense claim for approval
export function useSubmitExpenseClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (claimId: string) => expenseService.submitClaim(claimId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.claimDetail(data.id) });
      queryClient.invalidateQueries({ queryKey: expenseKeys.myClaims() });
      queryClient.invalidateQueries({ queryKey: expenseKeys.pendingClaims() });
    },
  });
}

// Approve expense claim
export function useApproveExpenseClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (claimId: string) => expenseService.approveClaim(claimId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.claimDetail(data.id) });
      queryClient.invalidateQueries({ queryKey: expenseKeys.pendingClaims() });
      queryClient.invalidateQueries({ queryKey: expenseKeys.allClaims() });
    },
  });
}

// Reject expense claim
export function useRejectExpenseClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ claimId, reason }: { claimId: string; reason: string }) =>
      expenseService.rejectClaim(claimId, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.claimDetail(data.id) });
      queryClient.invalidateQueries({ queryKey: expenseKeys.pendingClaims() });
      queryClient.invalidateQueries({ queryKey: expenseKeys.allClaims() });
    },
  });
}

// Mark expense claim as paid
export function useMarkExpensePaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ claimId, paymentReference }: { claimId: string; paymentReference: string }) =>
      expenseService.markAsPaid(claimId, paymentReference),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.claimDetail(data.id) });
      queryClient.invalidateQueries({ queryKey: expenseKeys.allClaims() });
      queryClient.invalidateQueries({ queryKey: expenseKeys.myClaims() });
    },
  });
}
