'use client';

import {ListPageSkeleton} from '@/components/ui/skeletons';

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <ListPageSkeleton rows={6} columns={4}/>
    </div>
  );
}
