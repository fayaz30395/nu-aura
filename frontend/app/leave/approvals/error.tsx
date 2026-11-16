'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function ApprovalsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="leave/approvals"/>;
}
