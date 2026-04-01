'use client';

import { Skeleton } from '@mantine/core';

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton height={36} width={36} circle />
        <div className="space-y-2 flex-1">
          <Skeleton height={24} width="40%" />
          <Skeleton height={16} width="30%" />
        </div>
        <Skeleton height={28} width={100} />
      </div>

      {/* Timeline skeleton */}
      <Skeleton height={80} radius="md" />

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={80} radius="md" />
        ))}
      </div>

      {/* Tabs skeleton */}
      <Skeleton height={40} width="60%" />

      {/* Content skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton height={250} radius="md" />
        <Skeleton height={250} radius="md" />
      </div>
    </div>
  );
}
