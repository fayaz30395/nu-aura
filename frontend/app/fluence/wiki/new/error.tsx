'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function NewError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="fluence/wiki/new"/>;
}
