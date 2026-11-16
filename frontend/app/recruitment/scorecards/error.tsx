'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function ScorecardError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="recruitment/scorecards"/>;
}
