'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function AdminAuditError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="admin/audit"/>;
}
