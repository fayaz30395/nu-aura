'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function OvertimeError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="overtime"/>;
}
