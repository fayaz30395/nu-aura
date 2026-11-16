'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function WellnessAdminError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="wellness/admin"/>;
}
