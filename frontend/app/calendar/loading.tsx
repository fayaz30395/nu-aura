'use client';

import {Skeleton} from '@mantine/core';
import {PageTransition} from '@/components/motion';

export default function Loading() {
  return (
    <PageTransition>
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton height={28} width="45%"/>
            <Skeleton height={16} width="35%"/>
          </div>
          <div className="flex items-center gap-4">
            <Skeleton height={40} width={40}/>
            <Skeleton height={36} width={120}/>
            <Skeleton height={40} width={40}/>
          </div>
        </div>

        {/* Calendar grid skeleton */}
        <div className="bg-[var(--surface)] rounded-[var(--r-lg)] border border-[var(--border)] overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-[var(--border)]">
            {Array.from({length: 7}).map((_, index) => (
              <div key={index} className="p-4 text-center">
                <Skeleton height={16} width="60%" className="mx-auto"/>
              </div>
            ))}
          </div>
          {/* Calendar cells */}
          {Array.from({length: 5}).map((_, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-7 border-b border-[var(--border)] last:border-b-0">
              {Array.from({length: 7}).map((_, colIndex) => (
                <div key={colIndex} className="p-2 min-h-[80px] border-r border-[var(--border)] last:border-r-0">
                  <Skeleton height={14} width={20} className="mb-2"/>
                  <Skeleton height={10} width="80%"/>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
