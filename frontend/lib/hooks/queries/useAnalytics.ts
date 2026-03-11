'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/lib/services/analytics.service';
import type { AnalyticsSummary } from '@/lib/types/analytics';

// Query keys for cache management
export const analyticsKeys = {
  all: ['analytics'] as const,
  summary: () => [...analyticsKeys.all, 'summary'] as const,
  dashboard: () => [...analyticsKeys.all, 'dashboard'] as const,
  orgHealth: () => [...analyticsKeys.all, 'orgHealth'] as const,
};

/**
 * Hook to fetch the lightweight analytics summary for the main dashboard KPI widget.
 * Returns: totalEmployees, presentToday, onLeaveToday, pendingApprovals,
 *          payrollProcessedThisMonth, openPositions.
 *
 * staleTime: 5 minutes — KPI numbers don't need real-time refresh.
 */
export function useAnalyticsSummary(enabled: boolean = true) {
  return useQuery<AnalyticsSummary>({
    queryKey: analyticsKeys.summary(),
    queryFn: () => analyticsService.getAnalyticsSummary(),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch role-based dashboard analytics.
 */
export function useDashboardAnalytics(enabled: boolean = true) {
  return useQuery({
    queryKey: analyticsKeys.dashboard(),
    queryFn: () => analyticsService.getDashboardAnalytics(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
