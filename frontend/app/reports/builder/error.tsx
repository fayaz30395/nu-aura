'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function BuilderError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="reports/builder"/>;
}
