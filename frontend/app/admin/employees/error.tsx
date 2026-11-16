'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function ErrorBoundary(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="admin/employees"/>;
}
