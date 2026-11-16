'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function LeaveCarryForwardError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="leave/admin/carry-forward"/>;
}
