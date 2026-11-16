'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function NuMailError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="nu-mail"/>;
}
