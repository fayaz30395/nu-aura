'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function FeedbackThreeSixtyError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="performance/360-feedback"/>;
}
