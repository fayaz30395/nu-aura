'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taxService } from '@/lib/services/tax.service';
import { TaxDeclarationRequest, TaxDeclarationResponse } from '@/lib/types/tax';
import { notifications } from '@mantine/notifications';

// Query keys for cache management
export const taxKeys = {
  all: ['tax'] as const,
  declarations: () => [...taxKeys.all, 'declarations'] as const,
  list: (page: number, size: number) =>
    [...taxKeys.declarations(), { page, size }] as const,
  detail: (id: string) => [...taxKeys.all, 'detail', id] as const,
};

// Get paginated list of tax declarations
export function useTaxDeclarations(
  page: number = 0,
  size: number = 20
) {
  return useQuery({
    queryKey: taxKeys.list(page, size),
    queryFn: async () => {
      const result = await taxService.getAll({ page, size });
      // Defensive: ensure we always return an array regardless of backend response shape
      if (Array.isArray(result)) return result;
      if (result && typeof result === 'object' && 'content' in result && Array.isArray((result as Record<string, unknown>).content)) {
        return (result as Record<string, unknown>).content as TaxDeclarationResponse[];
      }
      return [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: [] as TaxDeclarationResponse[],
  });
}

// Get single tax declaration
export function useTaxDeclaration(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: taxKeys.detail(id),
    queryFn: () => taxService.getById(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Create tax declaration mutation
export function useCreateTaxDeclaration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TaxDeclarationRequest) => taxService.create(data),
    onSuccess: () => {
      // Invalidate all declarations lists to refresh
      queryClient.invalidateQueries({ queryKey: taxKeys.declarations() });
      notifications.show({
        title: 'Success',
        message: 'Tax declaration created successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create tax declaration',
        color: 'red',
      });
    },
  });
}

// Approve tax declaration mutation
export function useApproveTaxDeclaration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, approverId }: { id: string; approverId: string }) =>
      taxService.approve(id, approverId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taxKeys.declarations() });
      queryClient.setQueryData(taxKeys.detail(data.id), data);
      notifications.show({
        title: 'Success',
        message: 'Tax declaration approved',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to approve tax declaration',
        color: 'red',
      });
    },
  });
}

// Reject tax declaration mutation
export function useRejectTaxDeclaration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, rejectedBy, reason }: { id: string; rejectedBy: string; reason: string }) =>
      taxService.reject(id, rejectedBy, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taxKeys.declarations() });
      queryClient.setQueryData(taxKeys.detail(data.id), data);
      notifications.show({
        title: 'Success',
        message: 'Tax declaration rejected',
        color: 'orange',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to reject tax declaration',
        color: 'red',
      });
    },
  });
}

// Submit tax declaration mutation
export function useSubmitTaxDeclaration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taxService.submit(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taxKeys.declarations() });
      queryClient.setQueryData(taxKeys.detail(data.id), data);
      notifications.show({
        title: 'Success',
        message: 'Tax declaration submitted',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to submit tax declaration',
        color: 'red',
      });
    },
  });
}
