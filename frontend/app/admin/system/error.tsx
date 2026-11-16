'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function SystemError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="admin/system"/>;
}
