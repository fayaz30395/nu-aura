'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function DriveError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="fluence/drive"/>;
}
