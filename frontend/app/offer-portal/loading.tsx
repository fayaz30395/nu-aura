'use client';

import {DetailPageSkeleton} from '@/components/ui/skeletons';

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <DetailPageSkeleton showSidePanel={false}/>
    </div>
  );
}
