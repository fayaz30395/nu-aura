import * as React from 'react';
import {cn} from '@/lib/utils';

/**
 * SkeletonV2 — matches the existing Skeleton API but applies the v2
 * shimmer style. The `.skeleton-aura` class already upgrades to shimmer
 * under `html.theme-v2` via globals.v2.css, so this file's main job is
 * to provide v2-shaped compositions (hero, page header, table) not yet
 * present in the v1 Skeleton module.
 */
function Base({
  className,
  width,
  height,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {width?: string | number; height?: string | number}) {
  const toPx = (v?: string | number) => (typeof v === 'number' ? `${v}px` : v);
  return (
    <div
      className={cn('skeleton-aura rounded-md', className)}
      style={{...style, width: toPx(width), height: toPx(height)}}
      {...props}
    />
  );
}

export function SkeletonDashboardHero({className}: {className?: string}) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-[var(--bg-card)] border-[var(--border-main)] p-5 sm:p-6',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Base height={18} width={220}/>
          <Base height={14} width={320}/>
        </div>
        <Base height={36} width={112} className="rounded-md"/>
      </div>
      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({length: 4}).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Base height={10} width={64}/>
            <Base height={20} width={80}/>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonPageHeader({className}: {className?: string}) {
  return (
    <div className={cn('flex items-center justify-between py-5', className)}>
      <div className="space-y-2">
        <Base height={12} width={140}/>
        <Base height={22} width={220}/>
      </div>
      <div className="flex items-center gap-2">
        <Base height={32} width={96} className="rounded-md"/>
        <Base height={32} width={120} className="rounded-md"/>
      </div>
    </div>
  );
}

export function SkeletonDataTable({
  rows = 8,
  columns = 5,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border bg-[var(--bg-card)] border-[var(--border-main)]',
        className
      )}
    >
      <div className="flex items-center gap-4 bg-[var(--bg-surface)] px-4 h-9 border-b border-[var(--border-main)]">
        {Array.from({length: columns}).map((_, i) => (
          <Base key={i} height={12} width={i === 0 ? 100 : 80}/>
        ))}
      </div>
      {Array.from({length: rows}).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 px-4 h-9 border-b border-[var(--border-subtle)] last:border-0"
        >
          {Array.from({length: columns}).map((_, c) => (
            <Base key={c} height={12} width={c === 0 ? 140 : c === columns - 1 ? 48 : 100}/>
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonSidebar({className}: {className?: string}) {
  return (
    <div
      className={cn(
        'flex flex-col py-4 px-3 gap-1 border-r border-[var(--border-main)] bg-[var(--bg-surface)]',
        className
      )}
      style={{width: 'var(--v2-sidebar-width, 224px)', height: '100%'}}
    >
      <Base height={28} width={160} className="mb-4"/>
      {Array.from({length: 8}).map((_, i) => (
        <div key={i} className="flex items-center gap-2 py-1.5">
          <Base height={16} width={16}/>
          <Base height={12} width={120}/>
        </div>
      ))}
    </div>
  );
}

export const SkeletonV2 = {
  Base,
  DashboardHero: SkeletonDashboardHero,
  PageHeader: SkeletonPageHeader,
  DataTable: SkeletonDataTable,
  Sidebar: SkeletonSidebar,
};
