'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function DeclarationsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="tax/declarations"/>;
}
