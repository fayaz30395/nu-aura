'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function ChangeRequestsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="employees/change-requests"/>;
}
