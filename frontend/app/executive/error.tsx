'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function ExecutiveError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="executive"/>;
}
