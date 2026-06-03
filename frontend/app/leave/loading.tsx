'use client';

import {Skeleton} from '@mantine/core';

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 space-y-8">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-3">
          <Skeleton height={28} width="45%" style={{backgroundColor: 'var(--surface)'}}/>
          <Skeleton height={14} width="35%" style={{backgroundColor: 'var(--surface)'}}/>
        </div>
        <Skeleton height={40} width={180} style={{backgroundColor: 'var(--surface)'}}/>
      </div>

      {/* Leave balance cards skeleton */}
      <div className="space-y-4">
        <Skeleton height={20} width="30%" style={{backgroundColor: 'var(--surface)'}}/>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({length: 4}).map((_, index) => (
            <div
              key={index}
              className="rounded-lg border border-[var(--border)] p-5 space-y-4"
            >
              <Skeleton height={40} width={40} style={{backgroundColor: 'var(--surface)', borderRadius: '0.375rem'}}/>
              <Skeleton height={16} width="60%" style={{backgroundColor: 'var(--surface)'}}/>
              <Skeleton height={24} width="50%" style={{backgroundColor: 'var(--surface)'}}/>
              <Skeleton height={8} width="100%" style={{backgroundColor: 'var(--surface)'}}/>
            </div>
          ))}
        </div>
      </div>

      {/* Recent leave requests table skeleton */}
      <div className="rounded-lg border border-[var(--border)] overflow-hidden">
        <div className="row-between p-6 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_50%,transparent)]">
          <Skeleton height={20} width="25%" style={{backgroundColor: 'var(--surface)'}}/>
          <Skeleton height={16} width={80} style={{backgroundColor: 'var(--surface)'}}/>
        </div>
        <div className="divide-y divide-[var(--border)]">
          <Skeleton height={48} style={{backgroundColor: 'transparent', borderRadius: 0}}/>
          {Array.from({length: 4}).map((_, index) => (
            <Skeleton key={index} height={48} style={{backgroundColor: 'transparent', borderRadius: 0}}/>
          ))}
        </div>
      </div>
    </div>
  );
}

