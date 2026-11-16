'use client';

import React, {useSyncExternalStore} from 'react';
import {cn} from '@/lib/utils';
import {useUiStore} from '@/lib/stores/useUiStore';

// Plain divs only: AuthGuard renders this during SSR and in tests without a
// MantineProvider. The server snapshot is always "expanded" so markup is
// deterministic; the persisted collapse state applies right after hydration.
const subscribe = (onChange: () => void) => useUiStore.subscribe(onChange);
const getCollapsed = () => useUiStore.getState().sidebarCollapsed;
const getServerCollapsed = () => false;

const bar = 'rounded-md animate-pulse motion-reduce:animate-none';

const status = (
  <div role="status" aria-live="polite" className="sr-only">
    <p>Session restoring</p>
    <p>Checking your workspace credentials...</p>
  </div>
);

/**
 * Full-viewport loading state with the same geometry as the app shell.
 * `chrome={false}` is for routes that render without the shell (auth, public,
 * admin console) so they don't flash a sidebar that never appears.
 */
export function ShellSkeleton({chrome = true}: {chrome?: boolean}) {
  const collapsed = useSyncExternalStore(subscribe, getCollapsed, getServerCollapsed);

  if (!chrome) {
    return (
      <div className="h-[100dvh] bg-main" aria-busy="true">
        {status}
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-main" aria-busy="true">
      {status}

      <div className="hidden md:flex" aria-hidden="true">
        <div className="flex w-[72px] flex-col items-center gap-3 bg-[var(--rail)] py-4">
          {Array.from({length: 5}, (_, i) => (
            <div key={i} className={cn(bar, 'h-10 w-10 rounded-xl bg-white/[0.08]')}/>
          ))}
        </div>
        {!collapsed && (
          <div className="flex w-[232px] flex-col gap-2 border-r border-white/[0.05] bg-[var(--nav)] px-3 py-4">
            <div className={cn(bar, 'mb-3 h-8 w-36 bg-white/[0.08]')}/>
            {Array.from({length: 9}, (_, i) => (
              <div key={i} className={cn(bar, 'h-9 bg-white/[0.05]')}/>
            ))}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col" aria-hidden="true">
        <div className="flex h-[60px] items-center gap-3 border-b border-[var(--border-main)] px-4 md:px-6">
          <div className={cn(bar, 'h-4 w-40 bg-[var(--border-subtle)]')}/>
          <div className={cn(bar, 'ml-auto h-8 w-48 bg-[var(--border-subtle)]')}/>
          <div className={cn(bar, 'h-8 w-8 rounded-full bg-[var(--border-subtle)]')}/>
        </div>
        <div className="page-shell flex flex-col gap-4 py-4 md:py-6">
          <div className={cn(bar, 'h-7 w-64 bg-[var(--border-subtle)]')}/>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({length: 4}, (_, i) => (
              <div key={i} className={cn(bar, 'h-24 rounded-xl bg-[var(--border-subtle)]')}/>
            ))}
          </div>
          <div className={cn(bar, 'h-72 rounded-xl bg-[var(--border-subtle)]')}/>
        </div>
      </div>
    </div>
  );
}
