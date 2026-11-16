'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function ChangePasswordError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="auth/change-password"/>;
}
