'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function NuCalendarError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="nu-calendar"/>;
}
