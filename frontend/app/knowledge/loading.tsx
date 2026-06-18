'use client';

import {Skeleton} from '@mantine/core';

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="space-y-2">
        <Skeleton height={28} width="40%"/>
        <Skeleton height={16} width="55%"/>
      </div>
      <div className="flex gap-2">
        <Skeleton height={40} className="flex-1"/>
        <Skeleton height={40} width={120}/>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({length: 6}).map((_, i) => (
          <div key={i} className="rounded-lg border border-surface-200 dark:border-surface-800 p-4 space-y-3">
            <Skeleton height={20} width="70%"/>
            <Skeleton height={14} width="90%"/>
            <Skeleton height={14} width="80%"/>
            <Skeleton height={14} width="60%"/>
          </div>
        ))}
      </div>
    </div>
  );
}
