'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function MyLearningError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="training/my-learning"/>;
}
