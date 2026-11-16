'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function EditError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="employees/[id]/edit"/>;
}
