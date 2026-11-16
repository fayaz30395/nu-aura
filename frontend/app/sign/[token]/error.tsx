'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function TokenError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="sign/[token]"/>;
}
