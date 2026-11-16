'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function SecurityError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="security"/>;
}
