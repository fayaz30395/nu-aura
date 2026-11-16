'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function AnnouncementsError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="announcements"/>;
}
