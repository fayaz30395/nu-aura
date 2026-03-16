'use client';

import { Skeleton } from '@mantine/core';

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      <div className="space-y-2">
        <Skeleton height={24} width="40%" />
        <Skeleton height={16} width="60%" />
      </div>
      <div className="bg-[var(--bg-card)] rounded-2xl border border-surface-200 dark:border-surface-800 p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton height={14} width="30%" />
              <Skeleton height={40} />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Skeleton height={14} width="20%" />
          <Skeleton height={100} />
        </div>
        <div className="flex justify-end gap-4">
          <Skeleton height={40} width={100} />
          <Skeleton height={40} width={120} />
        </div>
      </div>
    </div>
  );
}
