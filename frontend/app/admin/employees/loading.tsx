'use client';

import {SkeletonTable} from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-surface-200 dark:bg-surface-800 rounded animate-pulse"/>
          <div className="h-4 w-64 bg-surface-200 dark:bg-surface-800 rounded animate-pulse"/>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-32 bg-surface-200 dark:bg-surface-800 rounded animate-pulse"/>
          <div className="h-9 w-24 bg-surface-200 dark:bg-surface-800 rounded animate-pulse"/>
        </div>
      </div>
      <SkeletonTable rows={6} columns={5}/>
    </div>
  );
}
