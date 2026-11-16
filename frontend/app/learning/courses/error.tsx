'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function LearningCoursesError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="learning/courses"/>;
}
