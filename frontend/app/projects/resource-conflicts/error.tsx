'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function ResourceConflictsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="projects/resource-conflicts"/>;
}
