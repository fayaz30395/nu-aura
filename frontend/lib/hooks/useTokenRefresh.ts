'use client';

import { useEffect, useRef, useCallback } from 'react';
import { authApi } from '../api/auth';
import { logger } from '../utils/logger';

/**
 * Proactive token refresh hook.
 *
 * Problem: The access token cookie has a 1-hour maxAge. When it expires,
 * Next.js middleware (server-side) sees no cookie and redirects to /auth/login
 * BEFORE the client-side Axios interceptor can trigger a refresh.
 *
 * Solution: Proactively refresh the token while the user is actively using
 * the app, well before the token expires. This keeps the httpOnly cookie fresh.
 *
 * Refresh strategy:
 * - Refresh every 50 minutes (access token expires at 60 min)
 * - Also refresh on window focus (user returns from another tab)
 * - Also refresh on visibility change (user returns from minimized)
 * - Skip refresh if user is on the login page
 */

const REFRESH_INTERVAL_MS = 50 * 60 * 1000; // 50 minutes
const MIN_REFRESH_GAP_MS = 5 * 60 * 1000;   // 5 minutes minimum between refreshes

export function useTokenRefresh(isAuthenticated: boolean) {
  const lastRefreshRef = useRef<number>(Date.now());
  const refreshingRef = useRef<boolean>(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const doRefresh = useCallback(async () => {
    if (!isAuthenticated) return;
    if (typeof window !== 'undefined' && window.location.pathname.includes('/auth/login')) return;

    // Synchronous guard: prevent concurrent refreshes and enforce gap
    const now = Date.now();
    if (refreshingRef.current || now - lastRefreshRef.current < MIN_REFRESH_GAP_MS) return;
    refreshingRef.current = true;

    try {
      await authApi.refresh();
      lastRefreshRef.current = Date.now();
      logger.debug('[TokenRefresh] Proactive token refresh succeeded');
    } catch (error) {
      logger.warn('[TokenRefresh] Proactive token refresh failed:', error);
    } finally {
      refreshingRef.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Periodic refresh
    intervalRef.current = setInterval(doRefresh, REFRESH_INTERVAL_MS);

    // Single visibility listener covers tab switches — no 'focus' listener needed
    // ('focus' + 'visibilitychange' both fire on tab switch, causing double calls)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        doRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, doRefresh]);
}
