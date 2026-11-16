'use client';

import React, {lazy, Suspense, useContext, useId, useLayoutEffect, useMemo, useRef} from 'react';
import {usePathname} from 'next/navigation';
import type {SidebarItem} from '@/components/ui';
import type {HeaderProps} from './Header';
import type {BreadcrumbItem} from './Breadcrumbs';
import {isAdminConsolePath, pageConfigKey, ShellContext, type ShellPageConfig} from './shell/ShellContext';
import {ShellSkeleton} from './ShellSkeleton';

// Lazy so AppLayout's static import graph (pulled into every page and into
// PermissionGate) stays free of the route-config and nav modules.
const ShellFrame = lazy(() => import('./shell/ShellFrame').then((mod) => ({default: mod.ShellFrame})));

export interface AppLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  headerProps?: Partial<HeaderProps>;
  className?: string;
  showBreadcrumbs?: boolean;
  /** @deprecated Collapse state lives in useUiStore; ignored. */
  sidebarCollapsed?: boolean;
  /** @deprecated Collapse state lives in useUiStore; ignored. */
  onSidebarCollapsedChange?: (collapsed: boolean) => void;
  activeMenuItem?: string;
  /** @deprecated Nav items are plain links; ignored. */
  onMenuItemClick?: (item: SidebarItem) => void;
  /**
   * Opt into the Studio Slate Elevation Layer (employee-facing screens only).
   * Sets `data-altitude="elevated"` on <main>, scoping the `--elv-*` tokens.
   */
  altitude?: 'elevated';
}

/**
 * Declares a page's breadcrumbs and active nav item to the PersistentShell and
 * renders children in place. Outside a shell (e.g. AuthGuard's denied fallback,
 * which renders above it) it draws a standalone frame so the page keeps chrome;
 * inside the /admin console it is a plain pass-through.
 */
const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  breadcrumbs,
  headerProps,
  className,
  showBreadcrumbs = true,
  activeMenuItem,
  altitude,
}) => {
  const shell = useContext(ShellContext);
  const pathname = usePathname();
  const ownerId = useId();

  const config: ShellPageConfig = useMemo(
    () => ({
      breadcrumbs: breadcrumbs ?? [],
      showBreadcrumbs,
      activeMenuItem,
      altitude,
      className,
      headerProps: headerProps ?? {},
    }),
    [breadcrumbs, showBreadcrumbs, activeMenuItem, altitude, className, headerProps]
  );
  const configRef = useRef(config);
  configRef.current = config;
  const configKey = pageConfigKey(config);

  useLayoutEffect(() => {
    shell?.register(ownerId, configRef.current);
  }, [shell, ownerId, configKey]);

  useLayoutEffect(() => {
    if (!shell) return;
    return () => shell.unregister(ownerId);
  }, [shell, ownerId]);

  if (shell || isAdminConsolePath(pathname)) return <>{children}</>;

  return (
    <Suspense fallback={<ShellSkeleton/>}>
      <ShellFrame config={config}>{children}</ShellFrame>
    </Suspense>
  );
};

export {AppLayout};
