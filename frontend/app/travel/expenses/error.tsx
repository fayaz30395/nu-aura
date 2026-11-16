'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function TravelExpensesError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="travel/expenses"/>;
}
