'use client';

import {ListPageSkeleton} from '@/components/ui/skeletons';

export default function Loading() {
  return <ListPageSkeleton rows={4} columns={4} showFilters={false}/>;
}
