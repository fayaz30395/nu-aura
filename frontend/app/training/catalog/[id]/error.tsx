'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function TrainingCourseError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="training/catalog/[id]"/>;
}
