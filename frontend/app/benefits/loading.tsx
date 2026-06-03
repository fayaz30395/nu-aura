'use client';

import {Skeleton} from '@mantine/core';

export default function Loading() {
  return (
    <div className="page-shell-centered fade-slide-up auth-delay-20 p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-4">
        <div className="space-y-2">
          <Skeleton height={24} width="50%"/>
          <Skeleton height={16} width="40%"/>
        </div>
        <Skeleton height={36} width={130}/>
      </div>
      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({length: 5}).map((_, index) => (
          <div
            key={index}
            className="rounded-aura-lg border border-[var(--border)] bg-[var(--surface)] p-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <Skeleton height={38} width={38} radius={12}/>
              <Skeleton height={18} width={48} radius="sm"/>
            </div>
            <Skeleton height={12} width="55%"/>
            <Skeleton height={26} width="70%"/>
            <Skeleton height={12} width="45%"/>
          </div>
        ))}
      </div>
      {/* Tab strip */}
      <Skeleton height={36} width={320} radius="sm"/>
      {/* Plans grid — matches plan-card anatomy */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({length: 6}).map((_, index) => (
          <div
            key={index}
            className="rounded-aura-lg border border-[var(--border)] bg-[var(--surface)] p-4 space-y-4"
          >
            <div className="flex items-center gap-3">
              <Skeleton height={44} width={44} radius={12}/>
              <div className="flex-1 space-y-2">
                <Skeleton height={15} width="60%"/>
                <Skeleton height={12} width="40%"/>
              </div>
            </div>
            <div className="space-y-1.5">
              <Skeleton height={12} width="50%"/>
              <Skeleton height={6} radius="xl"/>
            </div>
            <div className="flex items-end justify-between border-t border-[var(--border-soft)] pt-3.5">
              <div className="space-y-1.5">
                <Skeleton height={9} width={32}/>
                <Skeleton height={13} width={70}/>
              </div>
              <div className="flex flex-col items-end space-y-1.5">
                <Skeleton height={9} width={32}/>
                <Skeleton height={13} width={56}/>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
