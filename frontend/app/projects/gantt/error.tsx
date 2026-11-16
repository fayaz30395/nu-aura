'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function GanttError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="projects/gantt"/>;
}
