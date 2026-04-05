import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {featureFlagService} from '@/lib/services/core/feature-flag.service';
import type {FeatureFlagRequest} from '@/lib/types/core/feature-flag';

export const featureFlagKeys = {
  all: ['featureFlags'] as const,
  list: () => [...featureFlagKeys.all, 'list'] as const,
  map: () => [...featureFlagKeys.all, 'map'] as const,
  enabled: () => [...featureFlagKeys.all, 'enabled'] as const,
  check: (key: string) => [...featureFlagKeys.all, 'check', key] as const,
  category: (cat: string) => [...featureFlagKeys.all, 'category', cat] as const,
};

export function useFeatureFlags() {
  return useQuery({
    queryKey: featureFlagKeys.list(),
    queryFn: () => featureFlagService.getAll().then(r => r.data),
    staleTime: 15 * 60 * 1000, // 15 minutes — flags change rarely
  });
}

export function useFeatureFlagMap() {
  return useQuery({
    queryKey: featureFlagKeys.map(),
    queryFn: () => featureFlagService.getMap().then(r => r.data),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

export function useEnabledFeatures() {
  return useQuery({
    queryKey: featureFlagKeys.enabled(),
    queryFn: () => featureFlagService.getEnabled().then(r => r.data),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Hook to check if a specific feature is enabled.
 * Uses the map endpoint for efficiency (single request for all flags).
 */
export function useFeatureFlag(featureKey: string): { enabled: boolean; isLoading: boolean } {
  const {data: flagMap, isLoading} = useFeatureFlagMap();

  return {
    enabled: flagMap?.[featureKey] ?? false,
    isLoading,
  };
}

export function useFeatureFlagsByCategory(category: string) {
  return useQuery({
    queryKey: featureFlagKeys.category(category),
    queryFn: () => featureFlagService.getByCategory(category).then(r => r.data),
    staleTime: 15 * 60 * 1000, // 15 minutes
    enabled: !!category,
  });
}

export function useSetFeatureFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FeatureFlagRequest) => featureFlagService.set(data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: featureFlagKeys.all});
    },
  });
}

export function useToggleFeatureFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (featureKey: string) => featureFlagService.toggle(featureKey).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: featureFlagKeys.all});
    },
  });
}
