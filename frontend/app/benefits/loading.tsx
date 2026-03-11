'use client';

import { Skeleton } from '@mantine/core';

export default function Loading() {
  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="space-y-2">
          <Skeleton height={24} width="50%" />
          <Skeleton height={16} width="40%" />
        </div>
        <Skeleton height={36} width={130} />
      </div>
      <Skeleton height={40} className="max-w-md" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-surface-200 dark:border-surface-800 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton height={48} width={48} radius="xl" />
              <div className="flex-1 space-y-2">
                <Skeleton height={16} width="70%" />
                <Skeleton height={14} width="50%" />
              </div>
            </div>
            <Skeleton height={14} width="60%" />
          </div>
        ))}
      </div>
    </div>
  );
}
