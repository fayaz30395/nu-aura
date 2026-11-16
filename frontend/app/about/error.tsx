'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function AboutError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="about"/>;
}
