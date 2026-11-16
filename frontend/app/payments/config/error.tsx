'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function ConfigError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="payments/config"/>;
}
