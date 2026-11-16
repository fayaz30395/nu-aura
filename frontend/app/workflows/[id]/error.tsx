'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function WorkflowDetailError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="workflows/[id]"/>;
}
