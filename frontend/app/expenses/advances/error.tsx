'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function AdvancesError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="expenses/advances"/>;
}
