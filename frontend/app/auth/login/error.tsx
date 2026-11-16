'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function LoginError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="auth/login"/>;
}
