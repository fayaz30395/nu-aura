'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function CustomFieldsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="admin/custom-fields"/>;
}
