'use client';

import { useEffect, useState, useRef, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  findRouteConfig,
  isPublicRoute,
  RouteConfig,
} from '@/lib/config/routes';
import { NuAuraLoader } from '@/components/ui/Loading';
import { logger } from '@/lib/utils/logger';

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
  const { isAuthenticated, hasHydrated, restoreSession } = useAuth();
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
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

  // Optimistic initialization: if the user is already authenticated and stores are
  // hydrated, start as `true` instead of `null`. This prevents the full-screen
  // loader from flashing on every navigation (AppLayout remounts per page).
  // The useEffect below still runs asynchronously and will set `false` if the
  // route requires permissions the user doesn't hold.
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(() => {
    if (hasHydrated && isReady && isAuthenticated) return true;
    return null;
  });
  const [isRestoringSession, setIsRestoringSession] = useState(false);
  const restoreAttemptedRef = useRef(false);

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

    // Not authenticated — try restoring session from httpOnly cookie first.
    // This prevents redirect loops when Zustand state is cleared but cookies
    // are still valid (e.g. after a page refresh).
    if (!isAuthenticated) {
      if (!restoreAttemptedRef.current && !isRestoringSession) {
        restoreAttemptedRef.current = true;
        setIsRestoringSession(true);
        restoreSession().then((restored) => {
          setIsRestoringSession(false);
          if (!restored) {
            // Cookie is truly expired/invalid — redirect to login.
            // Use window.location.href to avoid infinite RSC fetch loops
            // when the backend is down and router.replace hangs.
            // NOTE: The login page will NOT clear valid sessions — if the user
            // still has a valid access_token cookie, the middleware will redirect
            // them back here, and Zustand will have rehydrated by then.
            const returnUrl = encodeURIComponent(pathname);
            const loginUrl = `/auth/login?returnUrl=${returnUrl}`;
            try {
              router.replace(loginUrl);
              setTimeout(() => {
                if (window.location.pathname !== '/auth/login') {
                  window.location.href = loginUrl;
                }
              }, 3000);
            } catch {
              window.location.href = loginUrl;
            }
            setIsAuthorized(false);
          }
          // If restored, the isAuthenticated state change will re-trigger this effect
        });
      } else if (restoreAttemptedRef.current && !isRestoringSession) {
        // Restore was already attempted and failed — redirect to login
        const returnUrl = encodeURIComponent(pathname);
        const loginUrl = `/auth/login?returnUrl=${returnUrl}`;
        try {
          router.replace(loginUrl);
          setTimeout(() => {
            if (window.location.pathname !== '/auth/login') {
              window.location.href = loginUrl;
            }
          }, 3000);
        } catch {
          window.location.href = loginUrl;
        }
        setIsAuthorized(false);
      }
      return;
    }

    // Reset restore flag on successful auth (for future navigations)
    restoreAttemptedRef.current = false;

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
      logger.warn(`[AuthGuard] Access denied to ${pathname}`);
    }
    // Intentional omissions: checkAuthorization is a stable hoisted function; router is stable
    // from useRouter; restoreSession is a stable Zustand action; isRestoringSession is omitted
    // to avoid an infinite loop (this effect sets it indirectly via restoreSession().then()).
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  if (!hasHydrated || !isReady || isAuthorized === null || isRestoringSession) {
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
