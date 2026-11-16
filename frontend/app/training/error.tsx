'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function TrainingError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="training"/>;
}
