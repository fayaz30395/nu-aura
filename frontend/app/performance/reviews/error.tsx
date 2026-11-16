'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function ReviewsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="performance/reviews"/>;
}
