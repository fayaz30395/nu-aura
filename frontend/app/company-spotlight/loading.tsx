'use client';

import {Skeleton} from '@mantine/core';

export default function Loading() {
  return (
    <div className="page-shell-centered fade-slide-up">
    <div className="page-shell-card w-full max-w-[1600px] p-4 md:p-6 lg:p-6 space-y-4 fade-slide-up auth-delay-20 float-subtle">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton height={32} width={32} radius="xl"/>
            <Skeleton height={22} width={180}/>
          </div>
          <Skeleton height={14} width={240}/>
        </div>
        <Skeleton height={40} width={140}/>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({length: 6}).map((_, i) => (
          <Skeleton key={i} height={220} className="rounded-xl"/>
        ))}
      </div>
    </div>
    </div>
  );
}
