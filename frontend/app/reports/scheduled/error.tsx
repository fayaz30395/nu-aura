'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function ScheduledError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="reports/scheduled"/>;
}
