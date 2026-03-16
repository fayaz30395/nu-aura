'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetService } from '@/lib/services/asset.service';
import { CreateAssetRequest, AssetStatus, UpdateAssetRequest } from '@/lib/types/asset';

// Query keys for cache management
export const assetKeys = {
  all: ['assets'] as const,
  // All assets (paginated)
  list: () => [...assetKeys.all, 'list'] as const,
  listPaginated: (page: number, size: number) => [...assetKeys.list(), { page, size }] as const,
  // Assets by employee
  byEmployee: () => [...assetKeys.all, 'by-employee'] as const,
  employeeAssets: (employeeId: string) => [...assetKeys.byEmployee(), employeeId] as const,
  // Assets by status
  byStatus: () => [...assetKeys.all, 'by-status'] as const,
  statusAssets: (status: AssetStatus) => [...assetKeys.byStatus(), status] as const,
  // Asset detail
  detail: () => [...assetKeys.all, 'detail'] as const,
  assetDetail: (id: string) => [...assetKeys.detail(), id] as const,
};

// ========== QUERIES ==========

// Get all assets (paginated)
export function useAllAssets(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: assetKeys.listPaginated(page, size),
    queryFn: () => assetService.getAllAssets(page, size),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get assets assigned to an employee
export function useAssetsByEmployee(employeeId: string) {
  return useQuery({
    queryKey: assetKeys.employeeAssets(employeeId),
    queryFn: () => assetService.getAssetsByEmployee(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
}

// Get assets by status
export function useAssetsByStatus(status: AssetStatus) {
  return useQuery({
    queryKey: assetKeys.statusAssets(status),
    queryFn: () => assetService.getAssetsByStatus(status),
    enabled: !!status,
    staleTime: 5 * 60 * 1000,
  });
}

// Get single asset
export function useAsset(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: assetKeys.assetDetail(id),
    queryFn: () => assetService.getAsset(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// ========== MUTATIONS ==========

// Create asset
export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAssetRequest) => assetService.createAsset(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.list() });
    },
  });
}

// Update asset
export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAssetRequest }) =>
      assetService.updateAsset(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: assetKeys.assetDetail(data.id) });
      queryClient.invalidateQueries({ queryKey: assetKeys.list() });
      if (data.assignedTo) {
        queryClient.invalidateQueries({ queryKey: assetKeys.employeeAssets(data.assignedTo) });
      }
    },
  });
}

// Delete asset
export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => assetService.deleteAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.list() });
    },
  });
}

// Assign asset to employee
export function useAssignAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assetId, employeeId }: { assetId: string; employeeId: string }) =>
      assetService.assignAsset(assetId, employeeId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: assetKeys.assetDetail(data.id) });
      queryClient.invalidateQueries({ queryKey: assetKeys.list() });
      if (data.assignedTo) {
        queryClient.invalidateQueries({ queryKey: assetKeys.employeeAssets(data.assignedTo) });
      }
      queryClient.invalidateQueries({ queryKey: assetKeys.statusAssets('ASSIGNED' as AssetStatus) });
    },
  });
}

// Return asset (from employee)
export function useReturnAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assetId: string) => assetService.returnAsset(assetId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: assetKeys.assetDetail(data.id) });
      queryClient.invalidateQueries({ queryKey: assetKeys.list() });
      if (data.assignedTo) {
        queryClient.invalidateQueries({ queryKey: assetKeys.employeeAssets(data.assignedTo) });
      }
      queryClient.invalidateQueries({ queryKey: assetKeys.statusAssets('AVAILABLE' as AssetStatus) });
    },
  });
}
