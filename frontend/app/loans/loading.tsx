'use client';

import {Skeleton} from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 space-y-8">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton height={28} width="35%"/>
        <Skeleton height={14} width="50%"/>
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({length: 4}).map((_, index) => (
          <Skeleton key={index} height={120} className="rounded-lg"/>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border border-[var(--border)] overflow-hidden">
        <div className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_50%,transparent)]">
          <Skeleton height={48} className="rounded-none"/>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {Array.from({length: 5}).map((_, index) => (
            <Skeleton key={index} height={48} className="rounded-none bg-transparent"/>
          ))}
        </div>
      </div>
    </div>
  );
}
