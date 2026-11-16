'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function AdminImplicitRolesError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="admin/implicit-roles"/>;
}
