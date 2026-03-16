'use client';

import { Skeleton } from '@mantine/core';

export default function Loading() {
  return (
    <div className="p-4 md:p-5 lg:p-6 max-w-[1600px] mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton height={32} width={32} radius="xl" />
            <Skeleton height={22} width={200} />
          </div>
          <Skeleton height={14} width={260} />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton height={40} width={100} />
          <Skeleton height={40} width={120} />
        </div>
      </div>

      <Skeleton height={48} className="rounded-xl" />
      <Skeleton height={500} className="rounded-2xl" />
    </div>
  );
}
