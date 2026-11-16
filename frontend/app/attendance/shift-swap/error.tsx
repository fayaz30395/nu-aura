'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function ShiftSwapError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="attendance/shift-swap"/>;
}
