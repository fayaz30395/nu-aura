'use client';

import {ReactNode, useEffect, useRef, useState} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import {useAuth} from '@/lib/hooks/useAuth';
import {usePermissions} from '@/lib/hooks/usePermissions';
import {findRouteConfig, isPublicRoute, RouteConfig,} from '@/lib/config/routes';
import {SkeletonDashboard} from '@/components/ui/Skeleton';
import {PageDeniedFallback} from '@/components/auth/PermissionGate';
import {logger} from '@/lib/utils/logger';
import {RefreshCw} from 'lucide-react';

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
  const {user, isAuthenticated, hasHydrated, restoreSession} = useAuth();
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
  // Mirror of isRestoringSession in a ref so the effect can read it
  // synchronously between StrictMode-driven double-fires in dev. Without
  // this, the second effect run sees `restoreAttemptedRef.current === true`
  // (refs persist) but `isRestoringSession === false` (state batch hasn't
  // applied yet) and falls into the redirect-to-login branch BEFORE the
  // in-flight restoreSession() resolves, even when the auth cookies and
  // /auth/me are perfectly valid.
  const isRestoringRef = useRef(false);
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
      // Use the ref mirror (isRestoringRef) for the in-flight check rather than
      // the useState value, because React 18 StrictMode dev re-fires effects
      // synchronously and useState updates land on the next render — so the
      // second effect run would see `isRestoringSession === false` even though
      // the restore promise is still in flight, and fall into the redirect
      // branch below.
      if (!restoreAttemptedRef.current && !isRestoringRef.current) {
        restoreAttemptedRef.current = true;
        isRestoringRef.current = true;
        setIsRestoringSession(true);
        void restoreSession().then((restored) => {
          isRestoringRef.current = false;
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
        }).catch(() => {
          isRestoringRef.current = false;
          setIsRestoringSession(false);
          window.location.href = `/auth/login?returnUrl=${encodeURIComponent(pathname)}`;
        });
      } else if (restoreAttemptedRef.current && !isRestoringRef.current) {
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

    // Force password change: block ALL navigation until the user sets a new password.
    if (user?.mustChangePassword && pathname !== '/auth/change-password') {
      router.replace('/auth/change-password');
      return;
    }

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
    if (pathname.startsWith('/me/') && hasHydrated && (isAuthenticated || isRestoringSession)) {
      return children;
    }

    if (loadingComponent) {
      return loadingComponent;
    }

    return (
      <div className="page-shell-centered fade-slide-up">
        <div
          className="page-shell-card border-[var(--border-main)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] p-6"
        >
          <div
            className="mb-5 flex items-center justify-between rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Session restoring</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Checking your workspace credentials...</p>
            </div>
            <RefreshCw className="w-4 h-4 text-accent-600 dark:text-accent-400"/>
          </div>
          <SkeletonDashboard/>
        </div>
      </div>
    );
  }

  // Access denied
  if (!isAuthorized) {
    if (accessDeniedComponent) {
      return accessDeniedComponent;
    }
    return <PageDeniedFallback/>;
  }

  return children;
}

export default AuthGuard;
