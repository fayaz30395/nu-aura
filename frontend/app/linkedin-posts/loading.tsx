'use client';

import { Skeleton } from '@mantine/core';

export default function Loading() {
  return (
    <div className="p-4 md:p-5 lg:p-6 max-w-[1600px] mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton height={32} width={32} radius="xl" />
            <Skeleton height={22} width={160} />
          </div>
          <Skeleton height={14} width={220} />
        </div>
        <Skeleton height={40} width={140} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={180} className="rounded-xl" />
        ))}
      </div>
    </div>
  );
}
