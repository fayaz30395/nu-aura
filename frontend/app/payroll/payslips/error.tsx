'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function PayslipsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="payroll/payslips"/>;
}
