'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function HelpdeskError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="helpdesk"/>;
}
