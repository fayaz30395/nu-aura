'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function PipelineError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="recruitment/pipeline"/>;
}
