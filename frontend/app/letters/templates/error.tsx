'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function LetterTemplatesError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="letters/templates"/>;
}
