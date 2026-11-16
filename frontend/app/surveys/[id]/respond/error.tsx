'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function SurveyRespondError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="surveys/[id]/respond"/>;
}
