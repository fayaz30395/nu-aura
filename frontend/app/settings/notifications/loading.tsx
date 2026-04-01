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

      {/* Notification settings skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center justify-between p-4 bg-[var(--bg-card)] rounded-lg">
            <div className="flex-1 space-y-2">
              <Skeleton height={16} width="30%" />
              <Skeleton height={12} width="50%" />
            </div>
            <Skeleton height={24} width={50} />
          </div>
        ))}
      </div>
    </div>
  );
}
