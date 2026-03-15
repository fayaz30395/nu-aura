'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  findRouteConfig,
  isPublicRoute,
  RouteConfig,
} from '@/lib/config/routes';
import { NuAuraLoader } from '@/components/ui/Loading';

interface AuthGuardProps {
  children: ReactNode;
  /** Optional custom loading component */
  loadingComponent?: ReactNode;
  /** Optional custom access denied component */
  accessDeniedComponent?: ReactNode;
}

/**
 * AuthGuard component that protects routes based on authentication and permissions
 *
 * @example
 * // In your layout.tsx
 * export default function ProtectedLayout({ children }) {
 *   return (
 *     <AuthGuard>
 *       {children}
 *     </AuthGuard>
 *   );
 * }
 */
export function AuthGuard({
  children,
  loadingComponent,
  accessDeniedComponent,
}: AuthGuardProps): ReactNode {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, hasHydrated } = useAuth();
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    isAdmin,
    isHR,
    isManager,
    isReady,
    roles,
  } = usePermissions();

  // SuperAdmin bypasses ALL route-level permission checks
  // Note: Middleware handles the primary 401 → login redirect via cookie inspection
  const isSuperAdmin = roles.includes('SUPER_ADMIN');

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // Wait for auth to hydrate
    if (!hasHydrated || !isReady) {
      return;
    }

    // Public routes are always accessible
    if (isPublicRoute(pathname)) {
      setIsAuthorized(true);
      return;
    }

    // Not authenticated - redirect to login
    if (!isAuthenticated) {
      const returnUrl = encodeURIComponent(pathname);
      router.replace(`/auth/login?returnUrl=${returnUrl}`);
      setIsAuthorized(false);
      return;
    }

    // Find route config
    const routeConfig = findRouteConfig(pathname);

    // No specific config - just requires auth
    if (!routeConfig) {
      setIsAuthorized(true);
      return;
    }

    // SuperAdmin bypasses all route-level checks
    if (isSuperAdmin) {
      setIsAuthorized(true);
      return;
    }

    // Check authorization
    const authorized = checkAuthorization(routeConfig);
    setIsAuthorized(authorized);

    if (!authorized) {
      console.warn(`[AuthGuard] Access denied to ${pathname}`);
    }
  }, [pathname, isAuthenticated, hasHydrated, isReady, isSuperAdmin]);

  function checkAuthorization(config: RouteConfig): boolean {
    // Auth only check
    if (config.requiresAuth && !config.permission && !config.anyPermission && !config.allPermissions) {
      return isAuthenticated;
    }

    // Role-based shortcuts
    if (config.adminOnly && !isAdmin) {
      return false;
    }

    if (config.hrOnly && !isHR) {
      return false;
    }

    if (config.managerOnly && !isManager) {
      return false;
    }

    // Permission checks
    if (config.permission && !hasPermission(config.permission)) {
      return false;
    }

    if (config.anyPermission && config.anyPermission.length > 0) {
      if (!hasAnyPermission(...config.anyPermission)) {
        return false;
      }
    }

    if (config.allPermissions && config.allPermissions.length > 0) {
      if (!hasAllPermissions(...config.allPermissions)) {
        return false;
      }
    }

    // Role checks
    if (config.anyRole && config.anyRole.length > 0) {
      if (!hasAnyRole(...config.anyRole)) {
        return false;
      }
    }

    if (config.allRoles && config.allRoles.length > 0) {
      if (!hasAllRoles(...config.allRoles)) {
        return false;
      }
    }

    return true;
  }

  // Loading state
  if (!hasHydrated || !isReady || isAuthorized === null) {
    if (loadingComponent) {
      return loadingComponent;
    }

    return <NuAuraLoader message="Preparing your workspace..." />;
  }

  // Access denied
  if (!isAuthorized) {
    if (accessDeniedComponent) {
      return accessDeniedComponent;
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-surface-50">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-[var(--text-secondary)] mb-6">
            You don&apos;t have permission to access this page.
          </p>
          <button
            onClick={() => router.push('/me/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return children;
}

export default AuthGuard;
