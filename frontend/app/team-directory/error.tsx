'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function TeamDirectoryError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="team-directory"/>;
}
