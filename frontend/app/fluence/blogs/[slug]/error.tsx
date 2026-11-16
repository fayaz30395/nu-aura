'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function SlugError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="fluence/blogs/[slug]"/>;
}
