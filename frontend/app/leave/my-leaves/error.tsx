'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function MyLeavesError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="leave/my-leaves"/>;
}
