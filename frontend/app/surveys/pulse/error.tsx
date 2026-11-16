'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function SurveyPulseError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="surveys/pulse"/>;
}
