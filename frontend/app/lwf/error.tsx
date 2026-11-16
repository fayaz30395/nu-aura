'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function LWFError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="lwf"/>;
}
