'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function CompetencyFrameworkError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="performance/competency-framework"/>;
}
