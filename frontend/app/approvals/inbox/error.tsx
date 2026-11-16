'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function InboxError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="approvals/inbox"/>;
}
