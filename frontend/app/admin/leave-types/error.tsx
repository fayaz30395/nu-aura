'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function LeaveTypesError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="admin/leave-types"/>;
}
