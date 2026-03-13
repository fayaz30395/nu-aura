'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { notifications } from '@mantine/notifications';
import { logger } from '../utils/logger';

/**
 * Session Timeout Hook
 *
 * Implements inactivity-based session timeout with warnings.
 *
 * Behavior:
 * - Tracks user activity (mouse, keyboard, scroll, touch)
 * - Warns user at TIMEOUT_WARNING_MS (5 min before expiry)
 * - Logs out user at INACTIVITY_TIMEOUT_MS (30 minutes)
 * - Resets timer on any user interaction
 * - Skips timeout checks on login/auth pages
 *
 * Security:
 * - Separate from token refresh (defense in depth)
 * - User can dismiss warning and continue if they're still active
 * - Auto-logout prevents unattended sessions from staying alive
 *
 * Config:
 * - INACTIVITY_TIMEOUT_MS: 30 minutes (when to force logout)
 * - TIMEOUT_WARNING_MS: 5 minutes (when to show warning)
 * - DEBOUNCE_ACTIVITY_MS: 60 seconds (debounce activity tracking)
 */

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const TIMEOUT_WARNING_MS = 5 * 60 * 1000;     // 5 minutes before timeout (so warning at 25 min)
const DEBOUNCE_ACTIVITY_MS = 60 * 1000;       // Debounce activity tracking to 60 seconds

interface SessionTimeoutState {
  lastActivityTime: number;
  warningShownAt: number | null;
  timeoutId: ReturnType<typeof setTimeout> | null;
  warningId: ReturnType<typeof setTimeout> | null;
}

export function useSessionTimeout(enabled: boolean = true) {
  const { logout, isAuthenticated } = useAuth();
  const stateRef = useRef<SessionTimeoutState>({
    lastActivityTime: Date.now(),
    warningShownAt: null,
    timeoutId: null,
    warningId: null,
  });

  /**
   * Check if we're on an auth page (where we shouldn't track activity).
   */
  const isAuthPage = useCallback(() => {
    if (typeof window === 'undefined') return true;
    const pathname = window.location.pathname;
    return pathname.includes('/auth/') || pathname === '/';
  }, []);

  /**
   * Reset all timers and clear warning state.
   */
  const resetTimers = useCallback(() => {
    const state = stateRef.current;

    if (state.timeoutId) {
      clearTimeout(state.timeoutId);
      state.timeoutId = null;
    }

    if (state.warningId) {
      clearTimeout(state.warningId);
      state.warningId = null;
    }

    state.lastActivityTime = Date.now();
    state.warningShownAt = null;

    // Restart warning timer
    scheduleWarning();
  }, []);

  /**
   * Schedule the inactivity timeout (force logout).
   */
  const scheduleTimeout = useCallback(() => {
    const state = stateRef.current;

    if (state.timeoutId) clearTimeout(state.timeoutId);

    state.timeoutId = setTimeout(async () => {
      logger.warn('[SessionTimeout] Inactivity timeout reached. Logging out user.');
      notifications.clean();
      notifications.show({
        id: 'session-expired',
        title: 'Session Expired',
        message: 'Your session has expired due to inactivity. Please log in again.',
        color: 'red',
        autoClose: false,
        withCloseButton: false,
      });

      try {
        await logout();
      } catch (error) {
        logger.error('[SessionTimeout] Logout failed:', error);
      }

      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login?reason=timeout';
      }
    }, INACTIVITY_TIMEOUT_MS);
  }, [logout]);

  /**
   * Schedule the inactivity warning (show toast at 25 min mark).
   */
  const scheduleWarning = useCallback(() => {
    const state = stateRef.current;

    // Don't reschedule if warning already shown
    if (state.warningShownAt !== null) {
      scheduleTimeout();
      return;
    }

    if (state.warningId) clearTimeout(state.warningId);

    state.warningId = setTimeout(() => {
      if (isAuthPage()) return;

      state.warningShownAt = Date.now();
      logger.info('[SessionTimeout] Showing inactivity warning');

      notifications.show({
        id: 'session-timeout-warning',
        title: 'Session Timeout Warning',
        message: 'You will be logged out in 5 minutes due to inactivity. Move your mouse or press a key to stay connected.',
        color: 'yellow',
        autoClose: 5000,
        withCloseButton: true,
        onClose: () => {
          // Warning dismissed - don't reset timer yet, let user continue
        },
      });

      // Schedule the actual timeout after warning
      scheduleTimeout();
    }, INACTIVITY_TIMEOUT_MS - TIMEOUT_WARNING_MS);
  }, [isAuthPage, scheduleTimeout]);

  /**
   * Track user activity (debounced).
   */
  const handleActivity = useCallback(() => {
    if (!isAuthenticated || !enabled || isAuthPage()) return;

    const now = Date.now();
    const state = stateRef.current;

    // Debounce: only process activity if last activity was more than 60 seconds ago
    if (now - state.lastActivityTime < DEBOUNCE_ACTIVITY_MS) {
      return;
    }

    logger.debug('[SessionTimeout] User activity detected. Resetting inactivity timer.');
    resetTimers();
  }, [isAuthenticated, enabled, isAuthPage, resetTimers]);

  /**
   * Set up activity listeners and initial timers.
   */
  useEffect(() => {
    if (!isAuthenticated || !enabled) {
      // Clean up if not authenticated or disabled
      if (stateRef.current.timeoutId) clearTimeout(stateRef.current.timeoutId);
      if (stateRef.current.warningId) clearTimeout(stateRef.current.warningId);
      return;
    }

    if (isAuthPage()) {
      return;
    }

    // Initialize state
    resetTimers();

    // Activity event listeners
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, true); // true = capture phase
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity, true);
      });

      if (stateRef.current.timeoutId) clearTimeout(stateRef.current.timeoutId);
      if (stateRef.current.warningId) clearTimeout(stateRef.current.warningId);
    };
  }, [isAuthenticated, enabled, isAuthPage, resetTimers, handleActivity]);

  return {
    /** Current inactivity duration in milliseconds */
    inactivityDurationMs: Date.now() - stateRef.current.lastActivityTime,
    /** Time remaining until warning in milliseconds */
    timeUntilWarningMs: Math.max(
      0,
      INACTIVITY_TIMEOUT_MS - TIMEOUT_WARNING_MS - (Date.now() - stateRef.current.lastActivityTime)
    ),
    /** Time remaining until logout in milliseconds */
    timeUntilLogoutMs: Math.max(
      0,
      INACTIVITY_TIMEOUT_MS - (Date.now() - stateRef.current.lastActivityTime)
    ),
  };
}
