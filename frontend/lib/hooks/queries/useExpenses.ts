'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseService } from '@/lib/services/hrms/expense.service';
import {
  CreateExpenseClaimRequest,
  CreateExpenseCategoryRequest,
  CreateExpensePolicyRequest,
  CreateExpenseItemRequest,
  CreateExpenseAdvanceRequest,
  ExpenseStatus,
} from '@/lib/types/hrms/expense';
import { notifications } from '@mantine/notifications';

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
  // Claim items
  claimItems: (claimId: string) => [...expenseKeys.all, 'items', claimId] as const,
  // Categories
  categories: () => [...expenseKeys.all, 'categories'] as const,
  activeCategories: () => [...expenseKeys.categories(), 'active'] as const,
  allCategories: (page: number, size: number) =>
    [...expenseKeys.categories(), 'all', { page, size }] as const,
  // Policies
  policies: () => [...expenseKeys.all, 'policies'] as const,
  activePolicies: () => [...expenseKeys.policies(), 'active'] as const,
  allPolicies: (page: number, size: number) =>
    [...expenseKeys.policies(), 'all', { page, size }] as const,
  // Advances
  advances: () => [...expenseKeys.all, 'advances'] as const,
  myAdvances: (employeeId: string, page: number, size: number) =>
    [...expenseKeys.advances(), 'my', { employeeId, page, size }] as const,
  allAdvances: (page: number, size: number) =>
    [...expenseKeys.advances(), 'all', { page, size }] as const,
  // Reports
  reports: () => [...expenseKeys.all, 'reports'] as const,
  report: (startDate: string, endDate: string) =>
    [...expenseKeys.reports(), { startDate, endDate }] as const,
  // Policy validation
  policyValidation: (employeeId: string, amount: number) =>
    [...expenseKeys.all, 'validate', { employeeId, amount }] as const,
};

// ========== CLAIM QUERIES ==========

export function useMyExpenseClaims(
  employeeId: string | undefined,
  page: number = 0,
  size: number = 50,
  status?: ExpenseStatus,
  dateFrom?: string,
  dateTo?: string
) {
  return useQuery({
    queryKey: expenseKeys.myClaimsList(page, size, status, dateFrom, dateTo),
    queryFn: () => expenseService.getMyClaims(employeeId!, page, size),
    enabled: !!employeeId,
    staleTime: 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useAllExpenseClaims(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: expenseKeys.allClaimsList(page, size),
    queryFn: () => expenseService.getAllClaims(page, size),
    staleTime: 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function usePendingExpenseClaims(page: number = 0, size: number = 50) {
  return useQuery({
    queryKey: expenseKeys.pendingClaimsList(page, size),
    queryFn: () => expenseService.getPendingClaims(page, size),
    staleTime: 30 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useExpenseStatistics(employeeId?: string) {
  return useQuery({
    queryKey: expenseKeys.statisticsForEmployee(employeeId),
    queryFn: () => expenseService.getEmployeeStatistics(employeeId || '', new Date().getFullYear()),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useExpenseClaimDetail(claimId: string | undefined) {
  return useQuery({
    queryKey: expenseKeys.claimDetail(claimId || ''),
    queryFn: () => expenseService.getClaimById(claimId!),
    enabled: !!claimId,
    staleTime: 60 * 1000,
  });
}

export function useExpenseClaimItems(claimId: string | undefined) {
  return useQuery({
    queryKey: expenseKeys.claimItems(claimId || ''),
    queryFn: () => expenseService.getClaimItems(claimId!),
    enabled: !!claimId,
    staleTime: 60 * 1000,
  });
}

// ========== CATEGORY QUERIES ==========

export function useActiveExpenseCategories() {
  return useQuery({
    queryKey: expenseKeys.activeCategories(),
    queryFn: () => expenseService.getActiveCategories(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useAllExpenseCategories(page: number = 0, size: number = 50) {
  return useQuery({
    queryKey: expenseKeys.allCategories(page, size),
    queryFn: () => expenseService.getAllCategories(page, size),
    staleTime: 5 * 60 * 1000,
  });
}

// ========== POLICY QUERIES ==========

export function useActiveExpensePolicies() {
  return useQuery({
    queryKey: expenseKeys.activePolicies(),
    queryFn: () => expenseService.getActivePolicies(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useAllExpensePolicies(page: number = 0, size: number = 50) {
  return useQuery({
    queryKey: expenseKeys.allPolicies(page, size),
    queryFn: () => expenseService.getAllPolicies(page, size),
    staleTime: 5 * 60 * 1000,
  });
}

// ========== ADVANCE QUERIES ==========

export function useMyExpenseAdvances(employeeId: string | undefined, page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: expenseKeys.myAdvances(employeeId || '', page, size),
    queryFn: () => expenseService.getMyAdvances(employeeId!, page, size),
    enabled: !!employeeId,
    staleTime: 60 * 1000,
  });
}

export function useAllExpenseAdvances(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: expenseKeys.allAdvances(page, size),
    queryFn: () => expenseService.getAllAdvances(page, size),
    staleTime: 60 * 1000,
  });
}

// ========== REPORT QUERIES ==========

export function useExpenseReport(startDate: string, endDate: string, enabled: boolean = true) {
  return useQuery({
    queryKey: expenseKeys.report(startDate, endDate),
    queryFn: () => expenseService.getExpenseReport(startDate, endDate),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

// ========== POLICY VALIDATION ==========

export function usePolicyValidation(employeeId: string | undefined, amount: number) {
  return useQuery({
    queryKey: expenseKeys.policyValidation(employeeId || '', amount),
    queryFn: () => expenseService.validatePolicy(employeeId!, amount),
    enabled: !!employeeId && amount > 0,
    staleTime: 30 * 1000,
  });
}

// ========== CLAIM MUTATIONS ==========

export function useCreateExpenseClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, data }: { employeeId: string; data: CreateExpenseClaimRequest }) =>
      expenseService.createClaim(employeeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.myClaims() });
      queryClient.invalidateQueries({ queryKey: expenseKeys.allClaims() });
      queryClient.invalidateQueries({ queryKey: expenseKeys.statistics() });
    },
  });
}

export function useUpdateExpenseClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, data }: { claimId: string; data: CreateExpenseClaimRequest }) =>
      expenseService.updateClaim(claimId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.claimDetail(data.id) });
      queryClient.invalidateQueries({ queryKey: expenseKeys.myClaims() });
      queryClient.invalidateQueries({ queryKey: expenseKeys.allClaims() });
    },
  });
}

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

export function useRejectExpenseClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, reason }: { claimId: string; reason: string }) =>
      expenseService.rejectClaim(claimId, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.claimDetail(data.id) });
      queryClient.invalidateQueries({ queryKey: expenseKeys.pendingClaims() });
      queryClient.invalidateQueries({ queryKey: expenseKeys.allClaims() });
      queryClient.invalidateQueries({ queryKey: expenseKeys.myClaims() });
      queryClient.invalidateQueries({ queryKey: expenseKeys.statistics() });
    },
  });
}

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

export function useMarkExpenseReimbursed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, reimbursementRef }: { claimId: string; reimbursementRef: string }) =>
      expenseService.markAsReimbursed(claimId, reimbursementRef),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.claimDetail(data.id) });
      queryClient.invalidateQueries({ queryKey: expenseKeys.allClaims() });
      queryClient.invalidateQueries({ queryKey: expenseKeys.myClaims() });
    },
  });
}

// ========== ITEM MUTATIONS ==========

export function useAddExpenseItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, data }: { claimId: string; data: CreateExpenseItemRequest }) =>
      expenseService.addClaimItem(claimId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.claimItems(variables.claimId) });
      queryClient.invalidateQueries({ queryKey: expenseKeys.claimDetail(variables.claimId) });
      queryClient.invalidateQueries({ queryKey: expenseKeys.myClaims() });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to add expense item. Please try again.',
        color: 'red',
      });
    },
  });
}

export function useUpdateExpenseItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, itemId, data }: { claimId: string; itemId: string; data: CreateExpenseItemRequest }) =>
      expenseService.updateClaimItem(claimId, itemId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.claimItems(variables.claimId) });
      queryClient.invalidateQueries({ queryKey: expenseKeys.claimDetail(variables.claimId) });
    },
  });
}

export function useDeleteExpenseItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, itemId }: { claimId: string; itemId: string }) =>
      expenseService.deleteClaimItem(claimId, itemId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.claimItems(variables.claimId) });
      queryClient.invalidateQueries({ queryKey: expenseKeys.claimDetail(variables.claimId) });
      queryClient.invalidateQueries({ queryKey: expenseKeys.myClaims() });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to delete expense item. Please try again.',
        color: 'red',
      });
    },
  });
}

// ========== CATEGORY MUTATIONS ==========

export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExpenseCategoryRequest) => expenseService.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.categories() });
    },
  });
}

export function useUpdateExpenseCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, data }: { categoryId: string; data: CreateExpenseCategoryRequest }) =>
      expenseService.updateCategory(categoryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.categories() });
    },
  });
}

export function useToggleExpenseCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, active }: { categoryId: string; active: boolean }) =>
      expenseService.toggleCategory(categoryId, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.categories() });
    },
  });
}

export function useDeleteExpenseCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string) => expenseService.deleteCategory(categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.categories() });
    },
  });
}

// ========== POLICY MUTATIONS ==========

export function useCreateExpensePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExpensePolicyRequest) => expenseService.createPolicy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.policies() });
    },
  });
}

export function useUpdateExpensePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ policyId, data }: { policyId: string; data: CreateExpensePolicyRequest }) =>
      expenseService.updatePolicy(policyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.policies() });
    },
  });
}

export function useToggleExpensePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ policyId, active }: { policyId: string; active: boolean }) =>
      expenseService.togglePolicy(policyId, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.policies() });
    },
  });
}

// ========== ADVANCE MUTATIONS ==========

export function useCreateExpenseAdvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, data }: { employeeId: string; data: CreateExpenseAdvanceRequest }) =>
      expenseService.createAdvance(employeeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.advances() });
    },
  });
}

export function useApproveExpenseAdvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (advanceId: string) => expenseService.approveAdvance(advanceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.advances() });
    },
  });
}

export function useDisburseExpenseAdvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (advanceId: string) => expenseService.disburseAdvance(advanceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.advances() });
    },
  });
}

export function useSettleExpenseAdvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ advanceId, claimId }: { advanceId: string; claimId: string }) =>
      expenseService.settleAdvance(advanceId, claimId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.advances() });
    },
  });
}

export function useCancelExpenseAdvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (advanceId: string) => expenseService.cancelAdvance(advanceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.advances() });
    },
  });
}
