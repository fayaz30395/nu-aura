'use client';

import { Skeleton } from '@mantine/core';

export default function HelpdeskLoading() {
  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="space-y-2">
          <Skeleton height={24} width="50%" />
          <Skeleton height={16} width="40%" />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Skeleton height={36} width={130} />
          <Skeleton height={36} width={90} />
        </div>
      </div>

      {/* Search and filters skeleton */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        <div className="flex-1 flex gap-2">
          <Skeleton height={40} className="flex-1" />
          <Skeleton height={40} width={90} />
        </div>
        <Skeleton height={40} width={160} />
      </div>

      {/* Status tabs skeleton */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} height={36} width={100} />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 overflow-hidden">
        <div className="border-b border-surface-200 dark:border-surface-800">
          <Skeleton height={44} />
        </div>
        <div className="space-y-2 p-3 sm:p-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} height={52} />
          ))}
        </div>
      </div>
    </div>
  );
}
