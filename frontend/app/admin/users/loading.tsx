'use client';

import {Skeleton} from '@mantine/core';

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton height={24} width="40%"/>
          <Skeleton height={16} width="30%"/>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton height={36} width={120}/>
          <Skeleton height={36} width={100}/>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        <Skeleton height={40} className="flex-1"/>
        <Skeleton height={40} width={160}/>
      </div>
      <div className="rounded-lg border border-surface-200 dark:border-surface-800 overflow-hidden">
        <div className="border-b border-surface-200 dark:border-surface-800">
          <Skeleton height={44}/>
        </div>
        <div className="space-y-2 p-4">
          {Array.from({length: 8}).map((_, i) => (
            <Skeleton key={i} height={52}/>
          ))}
        </div>
      </div>
    </div>
  );
}
