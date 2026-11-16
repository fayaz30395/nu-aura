'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function AnalyticsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="analytics"/>;
}
