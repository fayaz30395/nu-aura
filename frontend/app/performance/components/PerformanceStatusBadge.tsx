import {StatusBadge} from '@/components/ui/StatusBadge';
import {CYCLE_STATUS, FEEDBACK_360_STATUS, GOAL_STATUS, REVIEW_STATUS} from '@/lib/status/vocabulary';

const DOMAIN_MAP = {
  goal: GOAL_STATUS,
  review: REVIEW_STATUS,
  cycle: CYCLE_STATUS,
  feedback: FEEDBACK_360_STATUS,
};

interface PerformanceStatusBadgeProps {
  status: string;
  domain?: keyof typeof DOMAIN_MAP;
  /** @deprecated use `domain` */
  type?: keyof typeof DOMAIN_MAP;
}

/**
 * Performance-module status badge. Thin wrapper that resolves the appropriate
 * vocabulary map (goal/review/cycle/feedback) and delegates rendering to the
 * canonical `<StatusBadge>` primitive.
 */
export default function PerformanceStatusBadge({
                                                 status,
                                                 domain,
                                                 type,
                                               }: PerformanceStatusBadgeProps) {
  const key = domain ?? type ?? 'goal';
  return <StatusBadge status={status} domain={DOMAIN_MAP[key]}/>;
}
