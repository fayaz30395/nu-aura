'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function PoolError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="resources/pool"/>;
}
