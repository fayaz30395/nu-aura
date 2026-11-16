'use client';

import {ListPageSkeleton} from '@/components/ui/skeletons';

export default function Loading() {
  return <ListPageSkeleton rows={5} columns={4} showFilters={false}/>;
}
