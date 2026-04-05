/**
 * Convenience re-export for the useFeatureFlag hook.
 *
 * Usage:
 *   const { enabled, isLoading } = useFeatureFlag('enable_projects');
 *   if (!enabled) return <FeatureDisabled />;
 */
export {useFeatureFlag, useFeatureFlagMap, useEnabledFeatures} from './queries/useFeatureFlags';
