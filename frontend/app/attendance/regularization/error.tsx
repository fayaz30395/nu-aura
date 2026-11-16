'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function RegularizationError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="attendance/regularization"/>;
}
