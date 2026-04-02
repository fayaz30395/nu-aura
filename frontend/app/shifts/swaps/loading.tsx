'use client';

import { Skeleton } from '@mantine/core';

export default function Loading() {
  return (
    <div className="p-6 space-y-6">
      <div className="row-between">
        <div className="space-y-2">
          <Skeleton height={24} width="40%" />
          <Skeleton height={16} width="30%" />
        </div>
        <Skeleton height={40} width={140} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height={160} radius="xl" />
        ))}
      </div>
    </div>
  );
}
