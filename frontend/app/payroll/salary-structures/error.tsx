'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function SalaryStructuresError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="payroll/salary-structures"/>;
}
