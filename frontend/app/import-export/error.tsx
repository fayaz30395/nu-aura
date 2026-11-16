'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function ImportExportError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="import-export"/>;
}
