'use client';

import React from 'react';
import {useFeatureFlag} from '@/lib/hooks/useFeatureFlag';

interface FeatureGateProps {
  /** The feature key to check (e.g., "enable_projects") */
  feature: string;
  /** Content to show when feature is enabled */
  children: React.ReactNode;
  /** Optional fallback when feature is disabled */
  fallback?: React.ReactNode;
}

/**
 * Conditionally renders children based on whether a feature flag is enabled
 * for the current tenant.
 *
 * Usage:
 *   <FeatureGate feature="enable_projects">
 *     <ProjectsModule />
 *   </FeatureGate>
 *
 *   <FeatureGate feature="enable_ai_recruitment" fallback={<UpgradeBanner />}>
 *     <AIRecruitmentPanel />
 *   </FeatureGate>
 */
export function FeatureGate({feature, children, fallback = null}: FeatureGateProps) {
  const {enabled, isLoading} = useFeatureFlag(feature);

  if (isLoading) return null;
  if (!enabled) return <>{fallback}</>;
  return <>{children}</>;
}
