'use client';

import { Skeleton } from '@mantine/core';

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton height={64} width={64} radius="xl" />
        <div className="space-y-2">
          <Skeleton height={28} width={200} />
          <Skeleton height={16} width={280} />
        </div>
      </div>

      {/* Quick actions skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height={96} radius="lg" />
        ))}
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-4 border-b border-surface-200 dark:border-surface-800">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height={40} width={130} />
        ))}
      </div>

      {/* Content skeleton */}
      <Skeleton height={240} radius="lg" />
    </div>
  );
}
