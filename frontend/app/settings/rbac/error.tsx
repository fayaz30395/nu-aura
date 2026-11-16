'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function RbacError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="settings/rbac"/>;
}
