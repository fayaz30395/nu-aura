'use client';

import {Skeleton} from '@mantine/core';

export default function Loading() {
  return (
    <div className="p-4 md:p-6 lg:p-6 max-w-[1600px] mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton height={32} width={32} radius="xl"/>
            <Skeleton height={22} width={160}/>
          </div>
          <Skeleton height={14} width={220}/>
        </div>
        <div className="flex items-center gap-4">
          <Skeleton height={40} width={140}/>
          <Skeleton height={40} width={120}/>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({length: 4}).map((_, i) => (
          <Skeleton key={i} height={90} className="rounded-xl"/>
        ))}
      </div>

      <Skeleton height={400} className="rounded-lg"/>
    </div>
  );
}
