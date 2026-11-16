'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function PerformanceError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="reports/performance"/>;
}
