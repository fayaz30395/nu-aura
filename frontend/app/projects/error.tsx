'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function ProjectsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="projects"/>;
}
