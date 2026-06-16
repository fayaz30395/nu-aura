'use client';

import {Skeleton} from '@mantine/core';

export default function Loading() {
  return (
    <div className="page-shell-centered fade-slide-up auth-delay-20 p-4 sm:p-6 flex items-center justify-center min-h-screen">
      <div className="w-full max-w-sm space-y-4">
        <div className="space-y-2 text-center">
          <Skeleton height={32} width="60%" className="mx-auto"/>
          <Skeleton height={16} width="80%" className="mx-auto"/>
        </div>
        <div className="space-y-3">
          <Skeleton height={40}/>
          <Skeleton height={40}/>
          <Skeleton height={40}/>
        </div>
      </div>
    </div>
  );
}
