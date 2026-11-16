'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function PrivacyError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="privacy"/>;
}
