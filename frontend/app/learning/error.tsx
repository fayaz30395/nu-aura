'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function LearningError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="learning"/>;
}
