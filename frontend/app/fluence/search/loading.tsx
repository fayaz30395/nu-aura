'use client';

import { Skeleton } from '@mantine/core';

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <Skeleton height={40} width={40} radius="lg" />
          <Skeleton height={28} width={200} />
        </div>
        <Skeleton height={16} width="40%" />
      </div>

      {/* Search input skeleton */}
      <Skeleton height={48} />

      {/* Filter pills skeleton */}
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={36} width={100} radius="xl" />
        ))}
      </div>

      {/* Results skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={96} radius="lg" />
        ))}
      </div>
    </div>
  );
}
