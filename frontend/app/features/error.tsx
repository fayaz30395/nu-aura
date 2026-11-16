'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function FeaturesError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="features"/>;
}
