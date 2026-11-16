'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function CompensationError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="compensation"/>;
}
