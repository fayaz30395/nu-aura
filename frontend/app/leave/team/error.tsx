'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function LeaveTeamError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="leave/team"/>;
}
