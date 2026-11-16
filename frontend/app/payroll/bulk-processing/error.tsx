'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function BulkProcessingError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="payroll/bulk-processing"/>;
}
