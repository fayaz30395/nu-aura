'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeService } from '@/lib/services/employee.service';
import { CreateEmployeeRequest, UpdateEmployeeRequest, Employee } from '@/lib/types/employee';

// Query keys for cache management
export const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: (page: number, size: number, sortBy: string, sortDirection: string, search?: string, status?: string) =>
    [...employeeKeys.lists(), { page, size, sortBy, sortDirection, search, status }] as const,
  search: (query: string, page: number, size: number) =>
    [...employeeKeys.all, 'search', { query, page, size }] as const,
  details: () => [...employeeKeys.all, 'detail'] as const,
  detail: (id: string) => [...employeeKeys.details(), id] as const,
  hierarchy: (id: string) => [...employeeKeys.all, 'hierarchy', id] as const,
  subordinates: (id: string) => [...employeeKeys.all, 'subordinates', id] as const,
  // BUG-013 FIX: dedicated key for the manager-picker list
  managers: () => [...employeeKeys.all, 'managers'] as const,
  dottedReports: (id: string) => [...employeeKeys.all, 'dotted-reports', id] as const,
};

// Get paginated list of employees with optional search and status filter
export function useEmployees(
  page: number = 0,
  size: number = 20,
  sortBy: string = 'createdAt',
  sortDirection: 'ASC' | 'DESC' = 'DESC',
  search?: string,
  status?: string
) {
  return useQuery({
    queryKey: employeeKeys.list(page, size, sortBy, sortDirection, search, status),
    queryFn: () => employeeService.getAllEmployees(page, size, sortBy, sortDirection, search, status),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * BUG-013 FIX: Fetch employees eligible to be a manager (LEAD level and above).
 * Use this hook for manager-picker dropdowns instead of useEmployees(0, 100),
 * which would load ALL employees regardless of whether they can manage others.
 *
 * Cache is long-lived (10 min) because the manager list changes infrequently.
 */
export function useManagers() {
  return useQuery({
    queryKey: employeeKeys.managers(),
    queryFn: () => employeeService.getManagers(),
    staleTime: 10 * 60 * 1000, // 10 minutes — manager list rarely changes
  });
}

// Search employees
export function useEmployeeSearch(
  query: string,
  page: number = 0,
  size: number = 20,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: employeeKeys.search(query, page, size),
    queryFn: () => employeeService.searchEmployees(query, page, size),
    enabled: enabled && query.length > 0,
    staleTime: 30 * 1000, // 30 seconds for search
  });
}

// Get single employee
export function useEmployee(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: () => employeeService.getEmployee(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes for individual employee
  });
}

// Get current authenticated user's own employee profile
export function useMyEmployee(enabled: boolean = true) {
  return useQuery({
    queryKey: [...employeeKeys.all, 'me'],
    queryFn: () => employeeService.getMyProfile(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

// Get employee hierarchy
export function useEmployeeHierarchy(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: employeeKeys.hierarchy(id),
    queryFn: () => employeeService.getEmployeeHierarchy(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// Get subordinates
export function useSubordinates(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: employeeKeys.subordinates(id),
    queryFn: () => employeeService.getSubordinates(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// Get dotted-line reports for a manager
export function useDottedLineReports(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: employeeKeys.dottedReports(id),
    queryFn: () => employeeService.getDottedLineReports(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// Create employee mutation
export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEmployeeRequest) => employeeService.createEmployee(data),
    onSuccess: () => {
      // Invalidate all employee lists to refresh
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}

// Update employee mutation with optimistic update
export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeeRequest }) =>
      employeeService.updateEmployee(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: employeeKeys.detail(id) });

      // Snapshot the previous value
      const previousEmployee = queryClient.getQueryData<Employee>(employeeKeys.detail(id));

      // Optimistically update the cache
      if (previousEmployee) {
        queryClient.setQueryData(employeeKeys.detail(id), {
          ...previousEmployee,
          ...data,
        });
      }

      return { previousEmployee };
    },
    onError: (_err, { id }, context) => {
      // Rollback on error
      if (context?.previousEmployee) {
        queryClient.setQueryData(employeeKeys.detail(id), context.previousEmployee);
      }
    },
    onSettled: (_, _error, { id }) => {
      // Always refetch after mutation settles
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}

// Delete employee mutation
export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => employeeService.deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}

// Prefetch employee (for hover prefetching)
export function usePrefetchEmployee() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: employeeKeys.detail(id),
      queryFn: () => employeeService.getEmployee(id),
      staleTime: 5 * 60 * 1000,
    });
  };
}
