'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function WellnessError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="wellness"/>;
}
