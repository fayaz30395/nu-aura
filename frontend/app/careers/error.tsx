'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function CareersError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="careers"/>;
}
