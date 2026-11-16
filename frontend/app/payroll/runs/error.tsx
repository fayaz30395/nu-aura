'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function PayrollRunsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="payroll/runs"/>;
}
