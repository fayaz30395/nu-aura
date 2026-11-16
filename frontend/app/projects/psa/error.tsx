'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function PsaProjectsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="projects/psa"/>;
}
