'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function StatutoryFilingsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="statutory/filings"/>;
}
