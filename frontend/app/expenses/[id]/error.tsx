'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function ExpenseDetailError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="expenses/[id]"/>;
}
