'use client';

import {Skeleton} from '@mantine/core';

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton height={32} width="50%"/>
        <Skeleton height={16} width="70%"/>
      </div>

      {/* Form skeleton */}
      <div className="space-y-4">
        {Array.from({length: 5}).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton height={16} width="25%"/>
            <Skeleton height={36} width="100%" className="rounded-lg"/>
          </div>
        ))}
      </div>

      {/* Editor skeleton */}
      <div className="space-y-2">
        <Skeleton height={16} width="15%"/>
        <Skeleton height={300} width="100%" className="rounded-lg"/>
      </div>

      {/* Button skeleton */}
      <Skeleton height={40} width="150px" className="rounded-lg"/>
    </div>
  );
}
