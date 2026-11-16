'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function PaymentsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="payments"/>;
}
