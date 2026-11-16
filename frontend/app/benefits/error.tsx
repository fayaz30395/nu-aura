'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function BenefitsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="benefits"/>;
}
