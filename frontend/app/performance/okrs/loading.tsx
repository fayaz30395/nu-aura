'use client';

import {Skeleton} from '@mantine/core';

export default function Loading() {
  return (
    <div className="page-shell fade-slide-up p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton height={28} width="40%"/>
          <Skeleton height={16} width="30%"/>
        </div>
        <div className="flex gap-2">
          <Skeleton height={36} width={140}/>
          <Skeleton height={36} width={110}/>
        </div>
      </div>

      {/* Cycle selector */}
      <div className="flex gap-3">
        {Array.from({length: 3}).map((_, i) => (
          <Skeleton key={i} height={32} width={100}/>
        ))}
      </div>

      {/* OKR cards */}
      {Array.from({length: 3}).map((_, i) => (
        <div key={i} className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton height={20} width="50%"/>
            <Skeleton height={24} width={64}/>
          </div>
          <Skeleton height={8} width="100%"/>
          <div className="space-y-2">
            {Array.from({length: 2}).map((_, j) => (
              <div key={j} className="flex items-center gap-3 pl-4">
                <Skeleton height={14} width="60%"/>
                <Skeleton height={8} width={80}/>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
