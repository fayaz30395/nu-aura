'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function ComplianceError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="compliance"/>;
}
