'use client';

import {Skeleton} from '@mantine/core';

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 space-y-8">
      {/* Header skeleton */}
      <div className="space-y-3">
        <Skeleton height={28} width="35%" style={{backgroundColor: 'var(--surface)'}}/>
        <Skeleton height={14} width="50%" style={{backgroundColor: 'var(--surface)'}}/>
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({length: 4}).map((_, index) => (
          <Skeleton key={index} height={120} style={{backgroundColor: 'var(--surface)', borderRadius: '0.5rem'}}/>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border border-[var(--border)] overflow-hidden">
        <div className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_50%,transparent)]">
          <Skeleton height={48} style={{backgroundColor: 'var(--surface)', borderRadius: 0}}/>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {Array.from({length: 5}).map((_, index) => (
            <Skeleton key={index} height={48} style={{backgroundColor: 'transparent', borderRadius: 0}}/>
          ))}
        </div>
      </div>
    </div>
  );
}
