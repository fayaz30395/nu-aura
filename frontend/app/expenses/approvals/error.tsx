'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function ExpenseApprovalsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="expenses/approvals"/>;
}
