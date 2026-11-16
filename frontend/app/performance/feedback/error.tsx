'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function FeedbackError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="performance/feedback"/>;
}
