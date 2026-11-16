'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function BlogsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="fluence/blogs"/>;
}
