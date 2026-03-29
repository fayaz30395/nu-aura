'use client';

import { Skeleton } from '@mantine/core';

export default function Loading() {
  return (
    <div className="p-4 md:p-6 lg:p-6 max-w-[1600px] mx-auto space-y-4">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton height={32} width={32} radius="xl" />
            <Skeleton height={22} width={160} />
          </div>
          <Skeleton height={14} width={220} />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton height={40} width={180} />
        </div>
      </div>

      {/* Main card + side stats skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Skeleton height={220} className="rounded-2xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} height={80} className="rounded-xl" />
          ))}
        </div>
      </div>

      {/* Chart + quick actions skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton height={300} className="lg:col-span-2 rounded-2xl" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} height={90} className="rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

