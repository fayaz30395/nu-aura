'use client';

import {Skeleton} from '@mantine/core';

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton height={24} width="40%"/>
        <Skeleton height={16} width="60%"/>
      </div>
      {/* Form card skeleton */}
      <div
        className='bg-[var(--bg-card)] rounded-lg border border-subtle p-4 sm:p-6 space-y-6'>
        {/* Form fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({length: 6}).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton height={14} width="30%"/>
              <Skeleton height={40}/>
            </div>
          ))}
        </div>

        {/* Textarea field */}
        <div className="space-y-2">
          <Skeleton height={14} width="20%"/>
          <Skeleton height={100}/>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-4">
          <Skeleton height={40} width={100}/>
          <Skeleton height={40} width={120}/>
        </div>
      </div>
    </div>
  );
}
