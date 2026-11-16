'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function AuthError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="auth"/>;
}
