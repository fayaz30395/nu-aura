'use client';

import {Skeleton} from '@mantine/core';

export default function Loading() {
  return (
    <div className="auth-shell fade-slide-up">
      <div className="auth-shell-grid auth-shell-narrow fade-slide-up stagger-children">
        <div className="auth-loading-card w-full space-y-6 fade-slide-up auth-delay-20 float-subtle page-reveal">
        {/* Logo skeleton */}
        <div className="flex justify-center">
          <Skeleton height={48} width={48} radius="xl"/>
        </div>
        <div className="text-center space-y-2">
          <Skeleton height={24} width="60%" className="mx-auto"/>
          <Skeleton height={16} width="80%" className="mx-auto"/>
        </div>

        {/* Form card skeleton */}
        <div className="space-y-4">
          {Array.from({length: 3}).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton height={14} width="25%"/>
              <Skeleton height={40}/>
            </div>
          ))}
          <Skeleton height={44}/>
          <Skeleton height={16} width="50%" className="mx-auto"/>
        </div>
        </div>
      </div>
    </div>
  );
}
