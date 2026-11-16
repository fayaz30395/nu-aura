'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function CompetencyMatrixError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="performance/competency-matrix"/>;
}
