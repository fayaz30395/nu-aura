'use client';

import {Skeleton} from '@mantine/core';

export default function Loading() {
  return (
    <div className="page-shell-centered fade-slide-up auth-delay-20 p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton height={24} width="50%"/>
          <Skeleton height={16} width="40%"/>
        </div>
        <Skeleton height={36} width={130}/>
      </div>
      <div className="bg-[var(--bg-card)] rounded-lg border border-surface-200 dark:border-surface-800 overflow-hidden">
        <div className="space-y-4 p-6">
          {Array.from({length: 6}).map((_, i) => (
            <Skeleton key={i} height={40}/>
          ))}
        </div>
      </div>
    </div>
  );
}
