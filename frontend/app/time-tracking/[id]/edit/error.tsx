'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function TimeTrackingEditError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="time-tracking/[id]/edit"/>;
}
