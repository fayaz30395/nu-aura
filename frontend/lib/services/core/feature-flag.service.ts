import { apiClient } from '@/lib/api/client';
import type { FeatureFlag, FeatureFlagRequest, FeatureFlagMap } from '@/lib/types/core/feature-flag';

export const featureFlagService = {
  getAll: () =>
    apiClient.get<FeatureFlag[]>('/admin/feature-flags'),

  getMap: () =>
    apiClient.get<FeatureFlagMap>('/admin/feature-flags/map'),

  getEnabled: () =>
    apiClient.get<string[]>('/admin/feature-flags/enabled'),

  check: (featureKey: string) =>
    apiClient.get<{ featureKey: string; enabled: boolean }>(`/admin/feature-flags/check/${featureKey}`),

  getByCategory: (category: string) =>
    apiClient.get<FeatureFlag[]>(`/admin/feature-flags/category/${category}`),

  set: (data: FeatureFlagRequest) =>
    apiClient.post<FeatureFlag>('/admin/feature-flags', data),

  toggle: (featureKey: string) =>
    apiClient.post<FeatureFlag>(`/admin/feature-flags/${featureKey}/toggle`),
};
