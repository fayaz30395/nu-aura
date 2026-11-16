'use client';

import {createContext} from 'react';
import type {BreadcrumbItem} from '../Breadcrumbs';
import type {HeaderProps} from '../Header';

/** Per-page chrome settings a page declares through `<AppLayout>`. */
export interface ShellPageConfig {
  breadcrumbs: BreadcrumbItem[];
  showBreadcrumbs: boolean;
  activeMenuItem?: string;
  altitude?: 'elevated';
  className?: string;
  headerProps: Partial<HeaderProps>;
}

export const EMPTY_PAGE_CONFIG: ShellPageConfig = {
  breadcrumbs: [],
  showBreadcrumbs: true,
  headerProps: {},
};

export interface ShellRegistry {
  register: (ownerId: string, config: ShellPageConfig) => void;
  unregister: (ownerId: string) => void;
}

/** /admin keeps its own console shell (AdminClientShell) for now. */
export function isAdminConsolePath(pathname: string | null): boolean {
  return pathname === '/admin' || (pathname?.startsWith('/admin/') ?? false);
}

/** Present only below a mounted PersistentShell. */
export const ShellContext = createContext<ShellRegistry | null>(null);

/** Stable identity for a config so re-renders with equal props don't re-render the shell. */
export function pageConfigKey(c: ShellPageConfig): string {
  return JSON.stringify([
    c.breadcrumbs.map((b) => [b.label, b.href ?? '']),
    c.showBreadcrumbs,
    c.activeMenuItem ?? '',
    c.altitude ?? '',
    c.className ?? '',
    c.headerProps.userName ?? '',
    c.headerProps.userRole ?? '',
    c.headerProps.userAvatar ?? '',
  ]);
}
