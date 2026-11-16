'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function BiometricDevicesError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="biometric-devices"/>;
}
