'use client';

import { Skeleton } from '@mantine/core';

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton height={20} width="60%" />
          <Skeleton height={16} width="40%" />
        </div>
        <Skeleton height={32} width={120} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-surface-200 dark:border-surface-800 p-4 sm:p-5 space-y-4">
            <Skeleton height={16} width="50%" />
            <Skeleton height={28} width="40%" />
            <Skeleton height={16} width="60%" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Skeleton height={280} className="rounded-2xl" />
        <Skeleton height={280} className="rounded-2xl" />
      </div>
    </div>
  );
}
