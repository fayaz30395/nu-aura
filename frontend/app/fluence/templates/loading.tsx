'use client';

import {Skeleton} from '@mantine/core';

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <Skeleton height={40} width={40} radius="lg"/>
            <Skeleton height={28} width={140}/>
          </div>
          <Skeleton height={16} width="50%"/>
        </div>
        <Skeleton height={36} width={150}/>
      </div>

      {/* Search skeleton */}
      <Skeleton height={48}/>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {Array.from({length: 6}).map((_, i) => (
          <Skeleton key={i} height={240} radius="lg"/>
        ))}
      </div>
    </div>
  );
}
