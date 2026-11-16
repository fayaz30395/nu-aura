'use client';

import React, {useCallback, useMemo, useRef, useState} from 'react';
import {usePathname} from 'next/navigation';
import {ShellFrame} from './shell/ShellFrame';
import {EMPTY_PAGE_CONFIG, pageConfigKey, ShellContext, type ShellPageConfig, type ShellRegistry} from './shell/ShellContext';
import {isShellRoute} from './shell/shellRoutes';

/**
 * Mounted once from the root layout so the rail, nav panel and top bar survive
 * client navigation. Pages keep rendering `<AppLayout>`, which only registers
 * its breadcrumbs / active item here and passes children through.
 */
export function PersistentShell({children}: {children: React.ReactNode}) {
  const pathname = usePathname();
  const [config, setConfig] = useState<ShellPageConfig>(EMPTY_PAGE_CONFIG);
  const ownerRef = useRef<string | null>(null);
  const keyRef = useRef(pageConfigKey(EMPTY_PAGE_CONFIG));

  const apply = useCallback((next: ShellPageConfig) => {
    const key = pageConfigKey(next);
    if (key === keyRef.current) return;
    keyRef.current = key;
    setConfig(next);
  }, []);

  const register = useCallback((ownerId: string, next: ShellPageConfig) => {
    ownerRef.current = ownerId;
    apply(next);
  }, [apply]);

  const unregister = useCallback((ownerId: string) => {
    if (ownerRef.current !== ownerId) return;
    ownerRef.current = null;
    apply(EMPTY_PAGE_CONFIG);
  }, [apply]);

  const registry: ShellRegistry = useMemo(() => ({register, unregister}), [register, unregister]);

  if (!isShellRoute(pathname)) return <>{children}</>;

  return (
    <ShellContext.Provider value={registry}>
      <ShellFrame config={config}>{children}</ShellFrame>
    </ShellContext.Provider>
  );
}
