'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function HireError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="app/hire"/>;
}
