'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function CalibrationError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="performance/cycles/[id]/calibration"/>;
}
