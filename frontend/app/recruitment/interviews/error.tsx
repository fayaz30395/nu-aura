'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function InterviewsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="recruitment/interviews"/>;
}
