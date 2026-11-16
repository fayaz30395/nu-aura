'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function EmployeesError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="employees"/>;
}
