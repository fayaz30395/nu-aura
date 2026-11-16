'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function LinkedinPostsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="linkedin-posts"/>;
}
