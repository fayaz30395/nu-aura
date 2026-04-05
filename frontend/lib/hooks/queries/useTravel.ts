'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {TravelRequestFilters, TravelStatus,} from '@/lib/types/hrms/travel';
import {travelService} from '@/lib/services/hrms/travel.service';

// Query Key Factory
export const travelKeys = {
  all: ['travel'] as const,
  requests: () => [...travelKeys.all, 'requests'] as const,
  requestsPaginated: (page: number, size: number, filters?: TravelRequestFilters) =>
    [...travelKeys.requests(), 'paginated', {page, size, ...filters}] as const,
  requestById: (id: string) =>
    [...travelKeys.requests(), 'detail', id] as const,
  requestsByStatus: (status: TravelStatus, page: number, size: number) =>
    [...travelKeys.requests(), 'status', {status, page, size}] as const,
  employeeRequests: (employeeId: string, page: number, size: number) =>
    [...travelKeys.requests(), 'employee', {employeeId, page, size}] as const,
  expenses: () => [...travelKeys.all, 'expenses'] as const,
  expenseById: (id: string) =>
    [...travelKeys.expenses(), 'detail', id] as const,
  expensesByRequest: (travelRequestId: string, page: number, size: number) =>
    [...travelKeys.expenses(), 'request', {travelRequestId, page, size}] as const,
  employeeExpenses: (employeeId: string, page: number, size: number) =>
    [...travelKeys.expenses(), 'employee', {employeeId, page, size}] as const,
  travelSummary: (employeeId: string, year?: number) =>
    [...travelKeys.all, 'summary', {employeeId, year}] as const,
  expenseSummary: (travelRequestId: string) =>
    [...travelKeys.all, 'expenseSummary', travelRequestId] as const,
};

// Travel Request Query Hooks

/**
 * Fetch all travel requests with optional filters
 */
export function useTravelRequests(
  page: number = 0,
  size: number = 20,
  filters?: TravelRequestFilters
) {
  return useQuery({
    queryKey: travelKeys.requestsPaginated(page, size, filters),
    queryFn: () => travelService.getAllTravelRequests(page, size, filters),
  });
}

/**
 * Fetch a single travel request by ID
 */
export function useTravelRequest(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: travelKeys.requestById(id),
    queryFn: () => travelService.getTravelRequestById(id),
    enabled,
  });
}

/**
 * Fetch travel requests by status
 */
export function useTravelRequestsByStatus(
  status: TravelStatus,
  page: number = 0,
  size: number = 20
) {
  return useQuery({
    queryKey: travelKeys.requestsByStatus(status, page, size),
    queryFn: () => travelService.getTravelRequestsByStatus(status, page, size),
  });
}

/**
 * Fetch travel requests for a specific employee
 */
export function useEmployeeTravelRequests(
  employeeId: string,
  page: number = 0,
  size: number = 20
) {
  return useQuery({
    queryKey: travelKeys.employeeRequests(employeeId, page, size),
    queryFn: () => travelService.getEmployeeTravelRequests(employeeId, page, size),
  });
}

/**
 * Fetch travel summary for an employee
 */
export function useTravelSummary(
  employeeId: string,
  year?: number,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: travelKeys.travelSummary(employeeId, year),
    queryFn: () => travelService.getTravelSummary(employeeId, year),
    enabled,
  });
}

// Travel Expense Query Hooks

/**
 * Fetch a single travel expense by ID
 */
export function useTravelExpense(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: travelKeys.expenseById(id),
    queryFn: () => travelService.getTravelExpenseById(id),
    enabled,
  });
}

/**
 * Fetch expenses for a specific travel request
 */
export function useTravelExpensesByRequest(
  travelRequestId: string,
  page: number = 0,
  size: number = 20
) {
  return useQuery({
    queryKey: travelKeys.expensesByRequest(travelRequestId, page, size),
    queryFn: () =>
      travelService.getTravelExpensesByRequest(travelRequestId, page, size),
  });
}

/**
 * Fetch expenses for a specific employee
 */
export function useEmployeeTravelExpenses(
  employeeId: string,
  page: number = 0,
  size: number = 20
) {
  return useQuery({
    queryKey: travelKeys.employeeExpenses(employeeId, page, size),
    queryFn: () =>
      travelService.getEmployeeTravelExpenses(employeeId, page, size),
  });
}

/**
 * Fetch expense summary for a travel request
 */
export function useExpenseSummary(
  travelRequestId: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: travelKeys.expenseSummary(travelRequestId),
    queryFn: () => travelService.getExpenseSummary(travelRequestId),
    enabled,
  });
}

// Travel Request Mutation Hooks

/**
 * Create a new travel request
 */
export function useCreateTravelRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof travelService.createTravelRequest>[0]) =>
      travelService.createTravelRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: travelKeys.requests()});
    },
  });
}

/**
 * Update an existing travel request
 */
export function useUpdateTravelRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
                   id,
                   data,
                 }: {
      id: string;
      data: Parameters<typeof travelService.updateTravelRequest>[1];
    }) => travelService.updateTravelRequest(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: travelKeys.requests()});
      queryClient.invalidateQueries({
        queryKey: travelKeys.requestById(data.id),
      });
    },
  });
}

/**
 * Submit a travel request for approval
 */
export function useSubmitTravelRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => travelService.submitTravelRequest(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: travelKeys.requests()});
      queryClient.invalidateQueries({
        queryKey: travelKeys.requestById(data.id),
      });
    },
  });
}

/**
 * Approve a travel request
 */
export function useApproveTravelRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
                   id,
                   approverId,
                   comments,
                 }: {
      id: string;
      approverId: string;
      comments?: string;
    }) => travelService.approveTravelRequest(id, approverId, comments),
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: travelKeys.requests()});
      queryClient.invalidateQueries({
        queryKey: travelKeys.requestById(data.id),
      });
    },
  });
}

/**
 * Reject a travel request
 */
export function useRejectTravelRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
                   id,
                   approverId,
                   reason,
                 }: {
      id: string;
      approverId: string;
      reason: string;
    }) => travelService.rejectTravelRequest(id, approverId, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: travelKeys.requests()});
      queryClient.invalidateQueries({
        queryKey: travelKeys.requestById(data.id),
      });
    },
  });
}

/**
 * Cancel a travel request
 */
export function useCancelTravelRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
                   id,
                   reason,
                 }: {
      id: string;
      reason: string;
    }) => travelService.cancelTravelRequest(id, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: travelKeys.requests()});
      queryClient.invalidateQueries({
        queryKey: travelKeys.requestById(data.id),
      });
    },
  });
}

/**
 * Complete a travel request
 */
export function useCompleteTravelRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => travelService.completeTravelRequest(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: travelKeys.requests()});
      queryClient.invalidateQueries({
        queryKey: travelKeys.requestById(data.id),
      });
    },
  });
}

/**
 * Delete a travel request
 */
export function useDeleteTravelRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => travelService.deleteTravelRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: travelKeys.requests()});
    },
  });
}

// Travel Expense Mutation Hooks

/**
 * Create a new travel expense
 */
export function useCreateTravelExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof travelService.createTravelExpense>[0]) =>
      travelService.createTravelExpense(data),
    onSuccess: (_data) => {
      queryClient.invalidateQueries({queryKey: travelKeys.expenses()});
      queryClient.invalidateQueries({
        queryKey: travelKeys.expenses(),
      });
    },
  });
}

/**
 * Update an existing travel expense
 */
export function useUpdateTravelExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
                   id,
                   data,
                 }: {
      id: string;
      data: Parameters<typeof travelService.updateTravelExpense>[1];
    }) => travelService.updateTravelExpense(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: travelKeys.expenses()});
      queryClient.invalidateQueries({
        queryKey: travelKeys.expenseById(data.id),
      });
    },
  });
}

/**
 * Approve a travel expense
 */
export function useApproveTravelExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
                   id,
                   approverId,
                   approvedAmount,
                   comments,
                 }: {
      id: string;
      approverId: string;
      approvedAmount?: number;
      comments?: string;
    }) =>
      travelService.approveTravelExpense(id, approverId, approvedAmount, comments),
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: travelKeys.expenses()});
      queryClient.invalidateQueries({
        queryKey: travelKeys.expenseById(data.id),
      });
    },
  });
}

/**
 * Reject a travel expense
 */
export function useRejectTravelExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
                   id,
                   approverId,
                   reason,
                 }: {
      id: string;
      approverId: string;
      reason: string;
    }) => travelService.rejectTravelExpense(id, approverId, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: travelKeys.expenses()});
      queryClient.invalidateQueries({
        queryKey: travelKeys.expenseById(data.id),
      });
    },
  });
}

/**
 * Delete a travel expense
 */
export function useDeleteTravelExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => travelService.deleteTravelExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: travelKeys.expenses()});
    },
  });
}
