import { apiClient } from '@/lib/api/client';
import type { FeatureFlag, FeatureFlagRequest, FeatureFlagMap } from '@/lib/types/feature-flag';

export const featureFlagService = {
  getAll: () =>
    apiClient.get<FeatureFlag[]>('/api/v1/feature-flags'),

  getMap: () =>
    apiClient.get<FeatureFlagMap>('/api/v1/feature-flags/map'),

  getEnabled: () =>
    apiClient.get<string[]>('/api/v1/feature-flags/enabled'),

  check: (featureKey: string) =>
    apiClient.get<{ featureKey: string; enabled: boolean }>(`/api/v1/feature-flags/check/${featureKey}`),

  getByCategory: (category: string) =>
    apiClient.get<FeatureFlag[]>(`/api/v1/feature-flags/category/${category}`),

  set: (data: FeatureFlagRequest) =>
    apiClient.post<FeatureFlag>('/api/v1/feature-flags', data),

  toggle: (featureKey: string) =>
    apiClient.post<FeatureFlag>(`/api/v1/feature-flags/${featureKey}/toggle`),
};
