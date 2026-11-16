'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function OrgHealthError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="analytics/org-health"/>;
}
