'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function ForgotPasswordError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="auth/forgot-password"/>;
}
