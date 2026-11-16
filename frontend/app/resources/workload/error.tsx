'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function WorkloadError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="resources/workload"/>;
}
