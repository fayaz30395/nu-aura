'use client';

import {Skeleton} from '@mantine/core';

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Back button + header skeleton */}
      <div className="space-y-4">
        <Skeleton height={20} width={100}/>
        <div className="flex items-center gap-4">
          <Skeleton height={64} width={64} radius="xl"/>
          <div className="space-y-2">
            <Skeleton height={24} width={200}/>
            <Skeleton height={16} width={160}/>
          </div>
        </div>
      </div>
      {/* Tabs skeleton */}
      <div className='flex gap-4 border-b border-subtle pb-2'>
        {Array.from({length: 4}).map((_, index) => (
          <Skeleton key={index} height={32} width={90}/>
        ))}
      </div>
      {/* Content skeleton */}
      <div
        className='bg-[var(--bg-card)] rounded-lg border border-subtle p-4 sm:p-6 space-y-4'>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({length: 8}).map((_, index) => (
            <div key={index} className="space-y-1">
              <Skeleton height={14} width="30%"/>
              <Skeleton height={18} width="60%"/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
