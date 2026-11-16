'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function NineBoxError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="performance/9box"/>;
}
