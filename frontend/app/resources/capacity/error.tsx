'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function CapacityError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="resources/capacity"/>;
}
