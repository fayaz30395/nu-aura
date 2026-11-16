'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function KnowledgeBaseError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="helpdesk/knowledge-base"/>;
}
