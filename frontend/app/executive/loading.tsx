'use client';

import {Skeleton} from '@mantine/core';

export default function Loading() {
  return (
    <div className="page-shell fade-slide-up p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton height={28} width="35%"/>
          <Skeleton height={16} width="25%"/>
        </div>
        <div className="flex gap-2">
          <Skeleton height={36} width={120}/>
          <Skeleton height={36} width={100}/>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({length: 4}).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 space-y-2">
            <Skeleton height={14} width="50%"/>
            <Skeleton height={32} width="60%"/>
            <Skeleton height={12} width="40%"/>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 space-y-3">
          <Skeleton height={18} width="40%"/>
          <Skeleton height={200} width="100%"/>
        </div>
        <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 space-y-3">
          <Skeleton height={18} width="40%"/>
          <Skeleton height={200} width="100%"/>
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 space-y-3">
        <Skeleton height={18} width="30%"/>
        {Array.from({length: 5}).map((_, i) => (
          <Skeleton key={i} height={36} width="100%"/>
        ))}
      </div>
    </div>
  );
}
