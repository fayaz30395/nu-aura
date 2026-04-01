'use client';

import { Skeleton } from '@mantine/core';

export default function PageLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton height={24} width="50%" />
          <Skeleton height={16} width="40%" />
        </div>
        <Skeleton height={36} width={130} />
      </div>
      <div className="bg-[var(--bg-card)] rounded-lg border border-surface-200 dark:border-surface-800 overflow-hidden">
        <Skeleton height={44} />
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={48} />
          ))}
        </div>
      </div>
    </div>
  );
}
