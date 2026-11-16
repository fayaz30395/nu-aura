'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function AttendanceError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="me/attendance"/>;
}
