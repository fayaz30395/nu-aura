'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function AdminUsersError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="admin/users"/>;
}
