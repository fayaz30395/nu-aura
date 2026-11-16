'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function ProbationError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="probation"/>;
}
