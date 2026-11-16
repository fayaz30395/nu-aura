'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function OneOnOneError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="one-on-one"/>;
}
