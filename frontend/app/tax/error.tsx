'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function TaxError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="tax"/>;
}
