'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function CalendarError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="calendar"/>;
}
