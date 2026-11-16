'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function CareerPageError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="recruitment/career-page"/>;
}
