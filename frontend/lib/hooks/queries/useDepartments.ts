'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentService } from '@/lib/services/department.service';
import { Department, DepartmentRequest } from '@/lib/types/employee';

// Query keys for cache management
export const departmentKeys = {
  all: ['departments'] as const,
  lists: () => [...departmentKeys.all, 'list'] as const,
  list: (page: number, size: number) =>
    [...departmentKeys.lists(), { page, size }] as const,
  active: () => [...departmentKeys.all, 'active'] as const,
  hierarchy: () => [...departmentKeys.all, 'hierarchy'] as const,
  search: (query: string, page: number, size: number) =>
    [...departmentKeys.all, 'search', { query, page, size }] as const,
  details: () => [...departmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...departmentKeys.details(), id] as const,
};

// Get all departments (paginated)
export function useAllDepartments(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: departmentKeys.list(page, size),
    queryFn: () => departmentService.getAllDepartments(page, size),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Get active departments only
export function useActiveDepartments() {
  return useQuery({
    queryKey: departmentKeys.active(),
    queryFn: () => departmentService.getActiveDepartments(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get department hierarchy (tree structure)
export function useDepartmentHierarchy() {
  return useQuery({
    queryKey: departmentKeys.hierarchy(),
    queryFn: () => departmentService.getDepartmentHierarchy(),
    staleTime: 5 * 60 * 1000,
  });
}

// Get single department by ID
export function useDepartment(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: departmentKeys.detail(id),
    queryFn: () => departmentService.getDepartment(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// Search departments (enabled only when query.length > 1)
export function useSearchDepartments(query: string, page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: departmentKeys.search(query, page, size),
    queryFn: () => departmentService.searchDepartments(query, page, size),
    enabled: query.length > 1,
    staleTime: 30 * 1000, // 30 seconds for search
  });
}

// Create department mutation
export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DepartmentRequest) => departmentService.createDepartment(data),
    onSuccess: () => {
      // Invalidate all department lists and hierarchies
      queryClient.invalidateQueries({ queryKey: departmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: departmentKeys.active() });
      queryClient.invalidateQueries({ queryKey: departmentKeys.hierarchy() });
    },
  });
}

// Update department mutation
export function useUpdateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DepartmentRequest }) =>
      departmentService.updateDepartment(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: departmentKeys.detail(id) });

      // Snapshot the previous value
      const previousDepartment = queryClient.getQueryData<Department>(departmentKeys.detail(id));

      // Optimistically update the cache
      if (previousDepartment) {
        queryClient.setQueryData(departmentKeys.detail(id), {
          ...previousDepartment,
          ...data,
        });
      }

      return { previousDepartment };
    },
    onError: (_err, { id }, context) => {
      // Rollback on error
      if (context?.previousDepartment) {
        queryClient.setQueryData(departmentKeys.detail(id), context.previousDepartment);
      }
    },
    onSettled: (_, _error, { id }) => {
      // Always refetch after mutation settles
      queryClient.invalidateQueries({ queryKey: departmentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: departmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: departmentKeys.active() });
      queryClient.invalidateQueries({ queryKey: departmentKeys.hierarchy() });
    },
  });
}

// Activate department mutation
export function useActivateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => departmentService.activateDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: departmentKeys.active() });
      queryClient.invalidateQueries({ queryKey: departmentKeys.hierarchy() });
    },
  });
}

// Deactivate department mutation
export function useDeactivateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => departmentService.deactivateDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: departmentKeys.active() });
      queryClient.invalidateQueries({ queryKey: departmentKeys.hierarchy() });
    },
  });
}

// Delete department mutation
export function useDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => departmentService.deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: departmentKeys.active() });
      queryClient.invalidateQueries({ queryKey: departmentKeys.hierarchy() });
    },
  });
}
