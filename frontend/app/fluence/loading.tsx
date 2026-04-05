'use client';

import {Skeleton} from '@mantine/core';

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <Skeleton height={48} width={48} radius="lg"/>
            <Skeleton height={28} width="40%"/>
          </div>
          <Skeleton height={16} width="50%"/>
        </div>
        <Skeleton height={36} width={120}/>
      </div>

      {/* Content grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar skeleton */}
        <div className="lg:col-span-1">
          <div
            className="bg-[var(--bg-card)] rounded-lg border border-surface-200 dark:border-surface-800 p-6 space-y-4">
            <Skeleton height={20} width="60%"/>
            {Array.from({length: 4}).map((_, i) => (
              <Skeleton key={i} height={36}/>
            ))}
          </div>
        </div>

        {/* Main content skeleton */}
        <div className="lg:col-span-3 space-y-4">
          <Skeleton height={44}/>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {Array.from({length: 4}).map((_, i) => (
              <Skeleton key={i} height={180} radius="lg"/>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
