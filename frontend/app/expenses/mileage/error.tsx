'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function MileageError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="expenses/mileage"/>;
}
