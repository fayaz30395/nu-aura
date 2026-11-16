'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function SeparationDetailError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="offboarding/[id]"/>;
}
