'use client';

import {Skeleton} from '@mantine/core';

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-4">
        <div className="space-y-2">
          <Skeleton height={24} width="45%"/>
          <Skeleton height={16} width="35%"/>
        </div>
        <Skeleton height={36} width={140}/>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-4">
        {Array.from({length: 4}).map((_, index) => (
          <div key={index}
               className="rounded-lg border border-surface-200 dark:border-surface-800 p-4 sm:p-6 space-y-4">
            <Skeleton height={16} width="50%"/>
            <Skeleton height={28} width="40%"/>
            <Skeleton height={16} width="60%"/>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {Array.from({length: 2}).map((_, index) => (
          <div key={index}
               className="bg-[var(--bg-card)] rounded-lg border border-surface-200 dark:border-surface-800 p-4 space-y-4">
            <Skeleton height={20} width="40%"/>
            {Array.from({length: 3}).map((_, i) => (
              <Skeleton key={i} height={48}/>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
