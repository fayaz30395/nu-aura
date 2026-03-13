'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { systemAdminApi } from '@/lib/api/admin-system';
import {
  SystemOverview,
  TenantListItem,
  TenantMetrics,
  ImpersonationToken,
  PaginatedTenantList,
  GrowthMetrics,
} from '@/lib/types/admin-system';

/**
 * React Query key factory for system admin queries
 */
export const systemAdminKeys = {
  all: ['systemAdmin'] as const,
  overview: () => [...systemAdminKeys.all, 'overview'] as const,
  growthMetrics: (months: number) => [...systemAdminKeys.all, 'growth', months] as const,
  tenants: () => [...systemAdminKeys.all, 'tenants'] as const,
  tenantList: (page: number, size: number) =>
    [...systemAdminKeys.tenants(), { page, size }] as const,
  tenantMetrics: (tenantId: string) =>
    [...systemAdminKeys.tenants(), 'metrics', tenantId] as const,
};

/**
 * Query hook for system overview
 */
export function useSystemOverview() {
  return useQuery<SystemOverview, Error>({
    queryKey: systemAdminKeys.overview(),
    queryFn: () => systemAdminApi.getSystemOverview(),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

/**
 * Query hook for platform growth metrics
 */
export function useGrowthMetrics(months: number = 6) {
  return useQuery<GrowthMetrics, Error>({
    queryKey: systemAdminKeys.growthMetrics(months),
    queryFn: () => systemAdminApi.getGrowthMetrics(months),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });
}

/**
 * Query hook for paginated tenant list
 */
export function useTenantList(page: number = 0, size: number = 20) {
  return useQuery<PaginatedTenantList, Error>({
    queryKey: systemAdminKeys.tenantList(page, size),
    queryFn: () => systemAdminApi.getTenantList(page, size),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Query hook for specific tenant metrics
 */
export function useTenantMetrics(tenantId: string) {
  return useQuery<TenantMetrics, Error>({
    queryKey: systemAdminKeys.tenantMetrics(tenantId),
    queryFn: () => systemAdminApi.getTenantMetrics(tenantId),
    staleTime: 45 * 1000, // 45 seconds
    enabled: !!tenantId, // Only run query if tenantId is provided
  });
}

/**
 * Mutation hook for generating impersonation token
 */
export function useImpersonationToken() {
  const queryClient = useQueryClient();

  return useMutation<ImpersonationToken, Error, string>({
    mutationFn: (tenantId: string) =>
      systemAdminApi.generateImpersonationToken(tenantId),
    onSuccess: () => {
      // Invalidate relevant caches after impersonation
      queryClient.invalidateQueries({ queryKey: systemAdminKeys.overview() });
    },
  });
}
