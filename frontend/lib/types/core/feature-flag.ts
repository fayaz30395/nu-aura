export interface FeatureFlag {
  id: string;
  tenantId: string;
  featureKey: string;
  featureName: string;
  description: string | null;
  enabled: boolean;
  percentageRollout: number | null;
  metadata: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface FeatureFlagRequest {
  featureKey: string;
  enabled: boolean;
  name?: string;
  description?: string;
  category?: string;
}

export interface FeatureFlagMap {
  [key: string]: boolean;
}
