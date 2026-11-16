'use client';

import {DetailPageSkeleton} from '@/components/ui/skeletons';

export default function Loading() {
  return <DetailPageSkeleton sections={3} showSidePanel/>;
}
