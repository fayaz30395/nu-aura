'use client';

import { Skeleton } from '@mantine/core';

export default function WorkflowsLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton height={24} width="50%" />
          <Skeleton height={16} width="40%" />
        </div>
        <Skeleton height={36} width={150} />
      </div>

      {/* Filters skeleton */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        <div className="flex-1 flex gap-2">
          <Skeleton height={36} width={200} />
          <Skeleton height={36} width={140} />
        </div>
        <Skeleton height={36} width={200} />
      </div>

      {/* Table skeleton */}
      <div className="bg-[var(--bg-card)] rounded-lg border border-surface-200 dark:border-surface-800 overflow-hidden">
        <div className="border-b border-surface-200 dark:border-surface-800">
          <Skeleton height={44} />
        </div>
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} height={52} />
          ))}
        </div>
      </div>
    </div>
  );
}
