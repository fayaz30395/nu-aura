'use client';

import { Skeleton } from '@mantine/core';

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <Skeleton height={48} width={48} radius="xl" />
            <Skeleton height={28} width={180} />
          </div>
          <Skeleton height={16} width="40%" />
        </div>
        <Skeleton height={36} width={120} />
      </div>

      {/* Search skeleton */}
      <Skeleton height={44} />

      {/* Category pills skeleton */}
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={36} width={90} radius="xl" />
        ))}
      </div>

      {/* Featured post skeleton */}
      <Skeleton height={320} radius="lg" />

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height={340} radius="lg" />
        ))}
      </div>
    </div>
  );
}
