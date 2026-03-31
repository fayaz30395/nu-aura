import { apiClient } from '@/lib/api/client';
import type { FeatureFlag, FeatureFlagRequest, FeatureFlagMap } from '@/lib/types/core/feature-flag';

export const featureFlagService = {
  getAll: () =>
    apiClient.get<FeatureFlag[]>('/feature-flags'),

  getMap: () =>
    apiClient.get<FeatureFlagMap>('/feature-flags/map'),

  getEnabled: () =>
    apiClient.get<string[]>('/feature-flags/enabled'),

  check: (featureKey: string) =>
    apiClient.get<{ featureKey: string; enabled: boolean }>(`/feature-flags/check/${featureKey}`),

  getByCategory: (category: string) =>
    apiClient.get<FeatureFlag[]>(`/feature-flags/category/${category}`),

  set: (data: FeatureFlagRequest) =>
    apiClient.post<FeatureFlag>('/feature-flags', data),

  toggle: (featureKey: string) =>
    apiClient.post<FeatureFlag>(`/feature-flags/${featureKey}/toggle`),
};
