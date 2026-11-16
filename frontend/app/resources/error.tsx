'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function ResourcesError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="resources"/>;
}
