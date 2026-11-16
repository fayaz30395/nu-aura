'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function AgencyDetailError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="recruitment/agencies/[id]"/>;
}
