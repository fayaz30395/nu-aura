'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function MyAttendanceError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="attendance/my-attendance"/>;
}
