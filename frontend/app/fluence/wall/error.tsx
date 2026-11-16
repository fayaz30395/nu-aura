'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function WallError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="fluence/wall"/>;
}
