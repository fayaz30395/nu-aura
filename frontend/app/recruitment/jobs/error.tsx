'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function JobsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="recruitment/jobs"/>;
}
