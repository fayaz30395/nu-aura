'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function MyContentError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="fluence/my-content"/>;
}
