'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function KnowledgeError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="knowledge"/>;
}
