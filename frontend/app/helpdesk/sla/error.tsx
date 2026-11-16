'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function SlaError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="helpdesk/sla"/>;
}
