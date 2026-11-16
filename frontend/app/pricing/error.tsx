'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function PricingError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="pricing"/>;
}
