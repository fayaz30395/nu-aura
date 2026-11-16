'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function RevolutionError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="performance/revolution"/>;
}
