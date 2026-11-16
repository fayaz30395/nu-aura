'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function OfficeLocationsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="admin/office-locations"/>;
}
