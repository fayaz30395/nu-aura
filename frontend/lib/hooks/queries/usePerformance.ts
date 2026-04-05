/**
 * Barrel re-export for performance hooks (PERF-03).
 *
 * This file was split from a 1,012-line monolith into domain-specific modules.
 * All existing imports from '@/lib/hooks/queries/usePerformance' continue to work
 * because this barrel re-exports every public symbol.
 *
 * Domain-specific imports are preferred for new code:
 *   import { useAllGoals } from '@/lib/hooks/queries/useGoals';
 */

export {performanceKeys} from './performanceKeys';
export * from './useGoals';
export * from './useReviewCycles';
export * from './useReviews';
export * from './useFeedback';
export * from './useFeedback360';
export * from './useOkr';
export * from './usePip';
