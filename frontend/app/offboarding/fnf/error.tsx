'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function FnFManagementError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="offboarding/fnf"/>;
}
