'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function PayrollError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="payroll"/>;
}
