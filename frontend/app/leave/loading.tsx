'use client';

import {Skeleton} from '@mantine/core';

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton height={24} width="45%"/>
          <Skeleton height={16} width="35%"/>
        </div>
        <Skeleton height={40} width={180}/>
      </div>

      {/* Leave balance cards skeleton */}
      <div className="space-y-4">
        <Skeleton height={18} width="30%"/>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({length: 4}).map((_, index) => (
            <div
              key={index}
              className="rounded-lg border border-surface-200 dark:border-surface-800 p-4 space-y-4"
            >
              <Skeleton height={32} width={32} radius="xl"/>
              <Skeleton height={18} width="60%"/>
              <Skeleton height={28} width="50%"/>
              <Skeleton height={10} width="100%"/>
            </div>
          ))}
        </div>
      </div>

      {/* Recent leave requests table skeleton */}
      <div className="bg-[var(--bg-card)] rounded-lg border border-surface-200 dark:border-surface-800 overflow-hidden">
        <div className="row-between p-4 border-b border-surface-200 dark:border-surface-800">
          <Skeleton height={20} width="25%"/>
          <Skeleton height={16} width={80}/>
        </div>
        <div className="space-y-2 p-4 sm:p-4">
          <Skeleton height={40}/>
          {Array.from({length: 4}).map((_, index) => (
            <Skeleton key={index} height={44}/>
          ))}
        </div>
      </div>
    </div>
  );
}

