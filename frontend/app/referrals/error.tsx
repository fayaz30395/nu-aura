'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function ReferralsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="referrals"/>;
}
