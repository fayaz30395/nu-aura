'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function ProfileError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="settings/profile"/>;
}
