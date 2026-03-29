'use client';

import { Skeleton } from '@mantine/core';

export default function WorkflowDetailLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton height={32} width={32} circle />
        <div className="space-y-2">
          <Skeleton height={24} width={300} />
          <Skeleton height={14} width={200} />
        </div>
      </div>

      {/* Info cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={72} radius="xl" />
        ))}
      </div>

      {/* Pipeline skeleton */}
      <Skeleton height={120} radius="xl" />

      {/* Steps skeleton */}
      <Skeleton height={200} radius="xl" />

      {/* Settings skeleton */}
      <Skeleton height={160} radius="xl" />
    </div>
  );
}
