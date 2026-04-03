'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import {
  type AppCode,
  type NuApp,
  PLATFORM_APPS,
  getAppForRoute,
} from '@/lib/config/apps';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions, Roles } from '@/lib/hooks/usePermissions';

interface ActiveAppState {
  /** Current app code */
  appCode: AppCode;
  /** Full app configuration */
  app: NuApp;
  /** Whether the user has access to a given app */
  hasAppAccess: (code: AppCode) => boolean;
  /** Switch to a different app (returns the entry route) */
  getAppEntryRoute: (code: AppCode) => string;
}

/**
 * Hook that determines which sub-app the user is currently in
 * based on the current pathname, and provides RBAC app gating.
 */
export function useActiveApp(): ActiveAppState {
  const pathname = usePathname();
  const { user } = useAuth();
  const { permissions, roles } = usePermissions();

  const isSuperAdmin = useMemo(
    () => roles.includes(Roles.SUPER_ADMIN),
    [roles]
  );

  const appCode = useMemo(() => getAppForRoute(pathname), [pathname]);
  const app = useMemo(() => PLATFORM_APPS[appCode], [appCode]);

  // Pre-compute a Set of module-prefix strings extracted from permission strings.
  // Supports both dot-separated (legacy: recruitment.view) and colon-separated
  // (canonical: RECRUITMENT:VIEW) formats. Prefixes are lowercased for consistent
  // matching against app permissionPrefixes (which are lowercase).
  const permissionModules = useMemo(() => {
    const set = new Set<string>();
    for (const p of permissions) {
      // Try colon first (canonical format), then dot (legacy format)
      const sep = p.indexOf(':');
      const dot = p.indexOf('.');
      const idx = sep !== -1 ? sep : dot;
      if (idx !== -1) set.add(p.substring(0, idx).toLowerCase());
    }
    return set;
  }, [permissions]);

  const hasAppAccess = useMemo(() => {
    return (code: AppCode): boolean => {
      // SuperAdmin has access to everything
      if (isSuperAdmin) return true;

      // App not available yet (Phase 2)
      const targetApp = PLATFORM_APPS[code];
      if (!targetApp.available) return false;

      // DEF-41: When user is authenticated but permissions haven't loaded yet,
      // return false (locked) instead of true to prevent flash of unlocked apps.
      // Only return true as fallback when user object is null (pre-auth state).
      if (!user) return true; // Pre-auth: allow (auth guard will handle)
      if (permissions.length === 0) return false; // Permissions loading: locked

      return targetApp.permissionPrefixes.some((prefix) => permissionModules.has(prefix));
    };
  }, [isSuperAdmin, user, permissions.length, permissionModules]);

  const getAppEntryRoute = useMemo(() => {
    return (code: AppCode): string => {
      return PLATFORM_APPS[code].entryRoute;
    };
  }, []);

  return { appCode, app, hasAppAccess, getAppEntryRoute };
}
