'use client';

import {SkeletonDashboard} from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="p-6">
      <SkeletonDashboard />
    </div>
  );
}
