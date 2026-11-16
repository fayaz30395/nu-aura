'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function RolesError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="admin/roles"/>;
}
