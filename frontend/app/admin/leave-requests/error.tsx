'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function LeaveRequestsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="admin/leave-requests"/>;
}
