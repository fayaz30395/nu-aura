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

      {/* Content skeleton */}
      <div className="space-y-4">
        {Array.from({length: 4}).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton height={16} width="25%"/>
            <Skeleton height={14} width="100%"/>
            <Skeleton height={14} width="95%"/>
          </div>
        ))}
      </div>
    </div>
  );
}
