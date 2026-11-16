'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function AssetsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="assets"/>;
}
