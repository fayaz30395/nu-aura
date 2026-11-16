'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function CompOffError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="attendance/comp-off"/>;
}
