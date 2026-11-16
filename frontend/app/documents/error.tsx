'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function DocumentsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="documents"/>;
}
