'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function SearchError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="fluence/search"/>;
}
