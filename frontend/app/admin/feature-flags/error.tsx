'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function AdminFeatureFlagsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="admin/feature-flags"/>;
}
