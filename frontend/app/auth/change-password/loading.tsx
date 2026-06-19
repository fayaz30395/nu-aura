'use client';

import {Skeleton} from '@mantine/core';

export default function Loading() {
  return (
    <div className="page-shell-centered fade-slide-up p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <Skeleton height={32} width="60%" className="mx-auto"/>
          <Skeleton height={16} width="80%" className="mx-auto"/>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton height={16} width="30%"/>
            <Skeleton height={40} width="100%"/>
          </div>
          <div className="space-y-2">
            <Skeleton height={16} width="40%"/>
            <Skeleton height={40} width="100%"/>
          </div>
          <div className="space-y-2">
            <Skeleton height={16} width="40%"/>
            <Skeleton height={40} width="100%"/>
          </div>
          <Skeleton height={40} width="100%"/>
        </div>
      </div>
    </div>
  );
}
