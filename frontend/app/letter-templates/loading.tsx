'use client';

import { Skeleton } from '@mantine/core';

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-4">
        <div className="space-y-2">
          <Skeleton height={24} width="50%" />
          <Skeleton height={16} width="40%" />
        </div>
        <Skeleton height={36} width={130} />
      </div>

      {/* Search and filters skeleton */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        <Skeleton height={40} className="flex-1" />
        <Skeleton height={40} width={160} />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="bg-[var(--bg-card)] rounded-2xl border border-surface-200 dark:border-surface-800 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton height={40} width={40} radius="md" />
              <div className="flex-1 space-y-1">
                <Skeleton height={16} width="70%" />
                <Skeleton height={12} width="40%" />
              </div>
            </div>
            <Skeleton height={20} width={100} radius="xl" />
            <Skeleton height={14} width="90%" />
            <Skeleton height={60} />
            <div className="flex gap-2">
              <Skeleton height={32} className="flex-1" />
              <Skeleton height={32} width={32} />
              <Skeleton height={32} width={32} />
              <Skeleton height={32} width={32} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
