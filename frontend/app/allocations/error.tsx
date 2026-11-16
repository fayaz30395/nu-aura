'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function AllocationsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="allocations"/>;
}
