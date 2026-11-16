'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function ApplyError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="leave/apply"/>;
}
