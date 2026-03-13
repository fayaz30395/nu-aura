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

  const hasAppAccess = useMemo(() => {
    return (code: AppCode): boolean => {
      // SuperAdmin has access to everything
      if (isSuperAdmin) return true;

      // App not available yet (Phase 2)
      const targetApp = PLATFORM_APPS[code];
      if (!targetApp.available) return false;

      // Check if user has at least one permission matching the app's prefixes
      if (!user || permissions.length === 0) return true; // Fallback: allow if no permissions loaded

      return targetApp.permissionPrefixes.some((prefix) =>
        permissions.some((p) => p.startsWith(prefix + '.'))
      );
    };
  }, [isSuperAdmin, user, permissions]);

  const getAppEntryRoute = useMemo(() => {
    return (code: AppCode): string => {
      return PLATFORM_APPS[code].entryRoute;
    };
  }, []);

  return { appCode, app, hasAppAccess, getAppEntryRoute };
}
