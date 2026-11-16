'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function TemplatesError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="fluence/templates"/>;
}
