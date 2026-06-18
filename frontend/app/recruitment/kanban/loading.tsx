'use client';

import {Skeleton} from '@mantine/core';

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton height={24} width="40%"/>
          <Skeleton height={16} width="30%"/>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton height={36} width={100}/>
          <Skeleton height={36} width={120}/>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({length: 5}).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton height={36} radius="sm"/>
            <div className="space-y-2">
              {Array.from({length: 3}).map((_, j) => (
                <Skeleton key={j} height={80} radius="sm"/>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
