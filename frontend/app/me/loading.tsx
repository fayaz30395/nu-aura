'use client';

import {Skeleton} from '@mantine/core';

export default function MeLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 space-y-8">
      {/* Profile header skeleton */}
      <div className="rounded-lg border border-[var(--border)] p-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Avatar skeleton */}
          <div className="flex justify-center sm:justify-start">
            <Skeleton height={100} width={100} circle style={{backgroundColor: 'var(--surface)'}}/>
          </div>

          {/* Profile info skeleton */}
          <div className="flex-1 space-y-3">
            <Skeleton height={28} width="50%" style={{backgroundColor: 'var(--surface)'}}/>
            <Skeleton height={14} width="40%" style={{backgroundColor: 'var(--surface)'}}/>
            <Skeleton height={14} width="60%" style={{backgroundColor: 'var(--surface)'}}/>
            <div className="flex gap-2 pt-2">
              <Skeleton height={36} width={100} style={{backgroundColor: 'var(--surface)'}}/>
              <Skeleton height={36} width={100} style={{backgroundColor: 'var(--surface)'}}/>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-3 border-b border-[var(--border)]">
        {Array.from({length: 4}).map((_, index) => (
          <Skeleton key={index} height={36} width={120} style={{backgroundColor: 'var(--surface)'}}/>
        ))}
      </div>

      {/* Content sections skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1 */}
          <div className="rounded-lg border border-[var(--border)] p-6">
            <Skeleton height={20} width="40%" style={{backgroundColor: 'var(--surface)', marginBottom: '1rem'}}/>
            <div className="space-y-4">
              {Array.from({length: 3}).map((_, index) => (
                <div key={index}>
                  <Skeleton height={14} width="30%" style={{backgroundColor: 'var(--surface)', marginBottom: '0.5rem'}}/>
                  <Skeleton height={40} style={{backgroundColor: 'var(--surface)'}}/>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2 */}
          <div className="rounded-lg border border-[var(--border)] p-6">
            <Skeleton height={20} width="40%" style={{backgroundColor: 'var(--surface)', marginBottom: '1rem'}}/>
            <div className="space-y-4">
              {Array.from({length: 4}).map((_, index) => (
                <Skeleton key={index} height={40} style={{backgroundColor: 'var(--surface)'}}/>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Card 1 */}
          <div className="rounded-lg border border-[var(--border)] p-4">
            <Skeleton height={16} width="70%" style={{backgroundColor: 'var(--surface)', marginBottom: '1rem'}}/>
            <Skeleton height={28} width="80%" style={{backgroundColor: 'var(--surface)'}}/>
          </div>

          {/* Card 2 */}
          <div className="rounded-lg border border-[var(--border)] p-4">
            <Skeleton height={16} width="70%" style={{backgroundColor: 'var(--surface)', marginBottom: '1rem'}}/>
            <Skeleton height={28} width="80%" style={{backgroundColor: 'var(--surface)'}}/>
          </div>

          {/* Card 3 */}
          <div className="rounded-lg border border-[var(--border)] p-4">
            <Skeleton height={16} width="70%" style={{backgroundColor: 'var(--surface)', marginBottom: '1rem'}}/>
            <Skeleton height={28} width="80%" style={{backgroundColor: 'var(--surface)'}}/>
          </div>
        </div>
      </div>
    </div>
  );
}
