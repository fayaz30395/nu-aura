'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function FnFError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="offboarding/[id]/fnf"/>;
}
