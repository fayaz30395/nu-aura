'use client';

import { Skeleton } from '@mantine/core';

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton height={32} width="50%" />
        <Skeleton height={16} width="70%" />
      </div>

      {/* Table skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} height={50} className="rounded-lg" />
        ))}
      </div>
    </div>
  );
}
