'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function GoalsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="performance/goals"/>;
}
