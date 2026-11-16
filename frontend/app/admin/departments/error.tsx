'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function AdminDepartmentsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="admin/departments"/>;
}
