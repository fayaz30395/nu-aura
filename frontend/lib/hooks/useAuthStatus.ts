'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { is401Error } from '../utils/type-guards';

/**
 * Hook to verify authentication status via the backend.
 *
 * Since tokens are stored in httpOnly cookies (not accessible via JavaScript),
 * this hook verifies auth status by making a lightweight API call to the backend.
 *
 * Use this for:
 * - Verifying if the user's session is still valid
 * - Detecting token expiration before making critical operations
 * - Server-side validation of auth state
 */
export function useAuthStatus() {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  /**
   * Verify if the current session is valid by calling the backend.
   * This works because httpOnly cookies are sent automatically.
   */
  const verifySession = useCallback(async () => {
    setIsChecking(true);
    try {
      // Make a lightweight call to verify auth
      // The backend will return 401 if the cookie/token is invalid
      const response = await apiClient.get<{ valid: boolean }>('/auth/verify');
      setIsValid(response.data?.valid ?? true);
      setLastChecked(new Date());
      return true;
    } catch (error: unknown) {
      if (is401Error(error)) {
        // 401 means auth is invalid
        setIsValid(false);
        return false;
      }

      // Network error or other error - can't determine status
      setIsValid(null);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, []);

  /**
   * Check if session needs refresh based on last check time.
   * @param maxAgeMs Maximum age of last check before re-verification (default: 5 minutes)
   */
  const needsRefresh = useCallback((maxAgeMs: number = 5 * 60 * 1000) => {
    if (!lastChecked) return true;
    return Date.now() - lastChecked.getTime() > maxAgeMs;
  }, [lastChecked]);

  /**
   * Conditionally verify session if it hasn't been checked recently.
   */
  const verifyIfNeeded = useCallback(async (maxAgeMs?: number) => {
    if (needsRefresh(maxAgeMs)) {
      return verifySession();
    }
    return isValid;
  }, [needsRefresh, verifySession, isValid]);

  return {
    /** Whether the current session is valid (null = not yet checked or error) */
    isValid,
    /** Whether a verification check is in progress */
    isChecking,
    /** When the session was last verified */
    lastChecked,
    /** Manually verify the session */
    verifySession,
    /** Check if verification is needed based on age */
    needsRefresh,
    /** Verify session only if not recently checked */
    verifyIfNeeded,
  };
}

/**
 * Hook to automatically verify session on mount and optionally on interval.
 * @param intervalMs Optional interval to re-verify (0 = disabled)
 */
export function useAutoVerifySession(intervalMs: number = 0) {
  const authStatus = useAuthStatus();

  useEffect(() => {
    // Verify on mount
    authStatus.verifySession();

    // Set up interval if requested
    if (intervalMs > 0) {
      const interval = setInterval(() => {
        authStatus.verifySession();
      }, intervalMs);

      return () => clearInterval(interval);
    }
  }, [intervalMs]); // Intentionally not including authStatus to avoid re-running

  return authStatus;
}
