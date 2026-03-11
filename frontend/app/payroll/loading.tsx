'use client';

import { Skeleton } from '@mantine/core';

export default function Loading() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header skeleton */}
        <div className="space-y-2">
          <Skeleton height={28} width="40%" />
          <Skeleton height={16} width="35%" />
        </div>

        {/* Tabs skeleton */}
        <div className="flex gap-4 border-b border-surface-200 dark:border-surface-700 pb-2">
          <Skeleton height={32} width={110} />
          <Skeleton height={32} width={90} />
          <Skeleton height={32} width={130} />
        </div>

        {/* Table / cards skeleton */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton height={40} width={220} />
            <Skeleton height={36} width={150} />
          </div>
          <div className="bg-white dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-800 overflow-hidden">
            <Skeleton height={44} />
            <div className="space-y-2 p-3 sm:p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} height={48} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

