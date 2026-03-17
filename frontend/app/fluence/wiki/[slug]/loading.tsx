'use client';

import { Skeleton } from '@mantine/core';

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton height={32} width="60%" />
        <Skeleton height={16} width="40%" />
      </div>

      {/* Navigation skeleton */}
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} height={32} width={80} className="rounded-lg" />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="space-y-2">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} height={14} width={index === 3 ? "80%" : "100%"} />
        ))}
      </div>
    </div>
  );
}
