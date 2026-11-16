'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function CompanySpotlightError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="company-spotlight"/>;
}
