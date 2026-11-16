'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function TermsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="terms"/>;
}
