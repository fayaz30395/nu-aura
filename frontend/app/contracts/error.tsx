'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function ContractsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="contracts"/>;
}
