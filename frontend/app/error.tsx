'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function AppError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="root"/>;
}
