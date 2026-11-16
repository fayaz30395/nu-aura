'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function DashboardsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="dashboards"/>;
}
