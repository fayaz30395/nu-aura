'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function DashboardError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="fluence/dashboard"/>;
}
