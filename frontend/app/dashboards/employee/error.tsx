'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function EmployeeError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="dashboards/employee"/>;
}
