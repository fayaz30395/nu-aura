'use client';

import {ReactNode, useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import {useAuth} from '@/lib/hooks/useAuth';
import {usePermissions} from '@/lib/hooks/usePermissions';
import {findRouteConfig, isPublicRoute, RouteConfig,} from '@/lib/config/routes';
import {ShellSkeleton} from '@/components/layout/ShellSkeleton';
import {isShellRoute} from '@/components/layout/shell/shellRoutes';
import {PageDeniedFallback} from '@/components/auth/PermissionGate';
import {logger} from '@/lib/utils/logger';

interface AuthGuardProps {
  children: ReactNode;
  /** Optional custom loading component */
  loadingComponent?: ReactNode;
  /** Optional custom access denied component */
  accessDeniedComponent?: ReactNode;
}

const subscribeNoop = () => () => {};

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

  // false during SSR and the hydration render, true afterwards (and on client-only mounts).
  // The auth store rehydrates synchronously from sessionStorage on the client, so without
  // this the hydration render would diverge from the server's loading markup.
  const isMounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

  // Set once session restoration has definitively failed (user is being sent to login).
  // Route authorization itself is NOT stored in state: it is derived during render from the
  // current pathname (see deriveAuthorization), so a stale result from a previous route can
  // never let a forbidden route's children render, not even for one commit.
  const [sessionRestoreFailed, setSessionRestoreFailed] = useState(false);
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

    // Public routes are always accessible (no session work needed)
    if (isPublicRoute(pathname)) {
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
            setSessionRestoreFailed(true);
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
        setSessionRestoreFailed(true);
      }
      return;
    }

    // Reset restore flags on successful auth (for future navigations)
    restoreAttemptedRef.current = false;
    setSessionRestoreFailed(false);

    // Force password change: block ALL navigation until the user sets a new password.
    if (user?.mustChangePassword && pathname !== '/auth/change-password') {
      router.replace('/auth/change-password');
      return;
    }

    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
    // Intentional omissions: router is stable from useRouter; restoreSession is a stable Zustand
    // action; isRestoringSession is omitted to avoid an infinite loop (this effect sets it
    // indirectly via restoreSession().then()).
    // `user` is included so the effect re-runs after restoreSession populates the user object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isAuthenticated, hasHydrated, user]);

  // Authorization for the CURRENT pathname, computed synchronously on every render.
  // null = undecided (show loading), true = render children, false = deny.
  const isAuthorized = deriveAuthorization();
  const isRouteDenied = isAuthorized === false && isAuthenticated && !!user;

  useEffect(() => {
    if (!isRouteDenied) {
      return;
    }
    logger.warn(`[AuthGuard] Access denied to ${pathname}`);
    router.replace('/me/dashboard?denied=1');
  }, [isRouteDenied, pathname, router]);

  function deriveAuthorization(): boolean | null {
    if (!isMounted || !hasHydrated) {
      return null;
    }

    if (isPublicRoute(pathname)) {
      return true;
    }

    // Session missing or user not loaded yet: undecided while restoring, denied once
    // restoration has failed (the effect is already redirecting to login).
    if (!isAuthenticated || !user) {
      return sessionRestoreFailed ? false : null;
    }

    // The effect is redirecting to the change-password page.
    if (user.mustChangePassword && pathname !== '/auth/change-password') {
      return null;
    }

    if (!isReady) {
      return null;
    }

    const routeConfig = findRouteConfig(pathname);

    // No specific config - just requires auth
    if (!routeConfig) {
      return true;
    }

    // SuperAdmin bypasses all route-level checks
    if (isSuperAdmin) {
      return true;
    }

    return checkAuthorization(routeConfig);
  }

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
    if (pathname.startsWith('/me/') && isMounted && hasHydrated && (isAuthenticated || isRestoringSession)) {
      return children;
    }

    if (loadingComponent) {
      return loadingComponent;
    }

    return <ShellSkeleton chrome={isShellRoute(pathname)}/>;
  }

  if (!isAuthorized) {
    if (accessDeniedComponent) {
      return accessDeniedComponent;
    }
    return <PageDeniedFallback/>;
  }

  return children;
}

export default AuthGuard;
