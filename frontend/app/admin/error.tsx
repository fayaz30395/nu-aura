'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function AdminError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="admin"/>;
}
