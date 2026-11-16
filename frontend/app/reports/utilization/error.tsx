'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function UtilizationError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="reports/utilization"/>;
}
