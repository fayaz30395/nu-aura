'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function PlayError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="learning/courses/[id]/play"/>;
}
