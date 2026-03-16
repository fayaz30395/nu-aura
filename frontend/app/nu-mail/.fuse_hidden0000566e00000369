'use client';

import { Skeleton } from '@mantine/core';

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-4">
        <div className="space-y-2">
          <Skeleton height={24} width="40%" />
          <Skeleton height={16} width="30%" />
        </div>
        <div className="flex gap-2">
          <Skeleton height={36} width={100} />
          <Skeleton height={36} width={100} />
        </div>
      </div>

      {/* Split pane skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left list pane */}
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="rounded-xl border border-surface-200 dark:border-surface-800 p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <Skeleton height={16} width="60%" />
                <Skeleton height={20} width={50} />
              </div>
              <Skeleton height={14} width="40%" />
              <Skeleton height={12} width="30%" />
            </div>
          ))}
        </div>
        {/* Right detail pane */}
        <div className="lg:col-span-2 rounded-2xl border border-surface-200 dark:border-surface-800 p-4 sm:p-6 space-y-4">
          <Skeleton height={24} width="50%" />
          <Skeleton height={16} width="30%" />
          <Skeleton height={1} />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex justify-between">
                <Skeleton height={16} width="25%" />
                <Skeleton height={16} width="35%" />
              </div>
            ))}
          </div>
          <div className="flex gap-4 pt-4">
            <Skeleton height={40} width={120} />
            <Skeleton height={40} width={120} />
          </div>
        </div>
      </div>
    </div>
  );
}
