'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function AdminPayrollError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="admin/payroll"/>;
}
