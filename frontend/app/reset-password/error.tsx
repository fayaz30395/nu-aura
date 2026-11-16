'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function ResetPasswordError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="reset-password"/>;
}
