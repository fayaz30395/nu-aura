'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function ApiKeysError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="settings/security/api-keys"/>;
}
