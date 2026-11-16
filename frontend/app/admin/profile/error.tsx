'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function AdminProfileError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="admin/profile"/>;
}
