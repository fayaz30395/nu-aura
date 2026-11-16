'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function ImportError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="employees/import"/>;
}
