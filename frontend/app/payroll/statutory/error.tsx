'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function StatutoryError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="payroll/statutory"/>;
}
