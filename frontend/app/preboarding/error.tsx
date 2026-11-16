'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function PreboardingError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="preboarding"/>;
}
