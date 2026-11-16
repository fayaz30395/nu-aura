'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function LeavesError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="me/leaves"/>;
}
