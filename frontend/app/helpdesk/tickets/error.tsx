'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function TicketsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="helpdesk/tickets"/>;
}
