'use client';

import {Skeleton} from '@mantine/core';

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton height={28} width={160}/>
          <Skeleton height={16} width="50%"/>
        </div>
        <div className="flex gap-2">
          <Skeleton height={36} width={110}/>
          <Skeleton height={36} width={110}/>
        </div>
      </div>
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {Array.from({length: 3}).map((_, i) => (
          <div
            key={i}
            className='bg-[var(--bg-card)] rounded-lg border border-subtle p-4'
          >
            <div className="flex items-start gap-4">
              <Skeleton height={48} width={48} radius="md"/>
              <div className="space-y-2 flex-1">
                <Skeleton height={14} width="40%"/>
                <Skeleton height={32} width="30%"/>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Tab bar skeleton */}
      <div className='flex gap-4 border-b border-subtle'>
        {Array.from({length: 3}).map((_, i) => (
          <Skeleton key={i} height={40} width={100}/>
        ))}
      </div>
      {/* Content list skeleton */}
      <div className="space-y-2">
        {Array.from({length: 5}).map((_, i) => (
          <Skeleton key={i} height={72} radius="lg"/>
        ))}
      </div>
    </div>
  );
}
