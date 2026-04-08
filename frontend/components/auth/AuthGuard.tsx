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
import { SkeletonDashboard } from '@/components/ui/Skeleton';
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
  const { user, isAuthenticated, hasHydrated, restoreSession } = useAuth();
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

  // Always start as null (matches SSR render → skeleton loader) to prevent hydration mismatch.
  // Both server and client render skeleton loader initially; the useEffect below sets the
  // correct authorization state after React has hydrated, avoiding any SSR mismatch.
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(false);
  const restoreAttemptedRef = useRef(false);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear any pending redirect timeout from a previous run of this effect
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }

    // Wait for Zustand to rehydrate from sessionStorage
    if (!hasHydrated) {
      return;
    }

    // Public routes are always accessible
    if (isPublicRoute(pathname)) {
      setIsAuthorized(true);
      return;
    }

    // Not authenticated OR authenticated but user object is missing (Zustand only
    // persists isAuthenticated, not the full user) — try restoring session from
    // httpOnly cookie first. This prevents redirect loops when Zustand state is
    // cleared but cookies are still valid (e.g. after a page refresh), and also
    // prevents permission checks from failing when user/roles haven't loaded yet.
    // NOTE: This check must happen BEFORE the isReady guard below, because isReady
    // is false when isAuthenticated=true but user=null (see usePermissions), which
    // would deadlock — isReady waits for user, but restoreSession (which sets user)
    // would never be called.
    if (!isAuthenticated || (isAuthenticated && !user)) {
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
              redirectTimeoutRef.current = setTimeout(() => {
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
          redirectTimeoutRef.current = setTimeout(() => {
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

    // Wait for permissions to be ready before running authorization checks.
    // At this point we know the user object is loaded (the !user branch above
    // would have returned), so isReady should be true. This guard is a safety
    // net for the brief window between user being set and permissions being derived.
    if (!isReady) {
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
      logger.warn(`[AuthGuard] Access denied to ${pathname}`);
    }

    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
    // Intentional omissions: checkAuthorization is a stable hoisted function; router is stable
    // from useRouter; restoreSession is a stable Zustand action; isRestoringSession is omitted
    // to avoid an infinite loop (this effect sets it indirectly via restoreSession().then()).
    // `user` is included so the effect re-runs after restoreSession populates the user object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isAuthenticated, hasHydrated, isReady, isSuperAdmin, user]);

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

    return (
      <div className="p-6">
        <SkeletonDashboard />
      </div>
    );
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
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Access Denied</h1>
          <p className="text-[var(--text-secondary)] mb-6">
            You don&apos;t have permission to access this page.
          </p>
          <button
            onClick={() => router.push('/me/dashboard')}
            className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
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
