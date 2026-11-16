'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function OrgHierarchyError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="admin/org-hierarchy"/>;
}
