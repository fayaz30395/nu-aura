'use client';

import {SkeletonDashboard} from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="page-shell-centered fade-slide-up auth-delay-20">
      <SkeletonDashboard/>
    </div>
  );
}
