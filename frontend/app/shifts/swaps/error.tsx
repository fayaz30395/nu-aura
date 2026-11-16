'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function ShiftError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="shifts/swaps"/>;
}
