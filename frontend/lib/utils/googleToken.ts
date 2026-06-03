// Unified Google Token Storage for SSO
// This allows login to authenticate Drive and Mail simultaneously
//
// Wave-1 flagged this file as a security risk because sensitive OAuth
// tokens live in sessionStorage (accessible to any same-origin script).
// Converting to safeSessionStorage does NOT change the storage choice —
// that requires a backend cookie-based session swap — but it does add
// graceful error handling for private mode, sandboxed iframes, and
// quota-exceeded scenarios so the SSO flow degrades cleanly rather than
// throwing uncaught DOMExceptions.
//
// SECURITY TODO (audit M-11, docs/audit/release-2026-06-04/security-audit-2026-06-04.md):
// The unified Google token carries broad scopes (gmail.send/modify, drive.file,
// calendar.events — see GOOGLE_SSO_SCOPES below) yet lives in JS-accessible
// sessionStorage. The token is read synchronously by many surfaces
// (nu-mail / nu-drive / nu-calendar / dashboard / recruitment interviews /
// notifications) for the life of the session, so it cannot be cleared after a
// single use without breaking those features. The correct fix is to migrate to a
// backend-proxied httpOnly cookie session (Google API calls proxied server-side)
// and to request gmail.* scopes lazily only when the Mail module opens rather than
// at login. Until then, exposure is minimized by: (1) clearing on logout
// (lib/hooks/useAuth.ts), and (2) clearing on tab close / page hide via
// registerGoogleTokenCleanup() below. Pair with the CSP nonce fix (audit M-13).

import {safeSessionStorage} from './safeStorage';

const GOOGLE_TOKEN_KEY = 'nu_google_token';
const GOOGLE_TOKEN_EXPIRY_KEY = 'nu_google_token_expiry';

// Legacy keys for backward compatibility
const DRIVE_TOKEN_KEY = 'nu_drive_token';
const DRIVE_TOKEN_EXPIRY_KEY = 'nu_drive_token_expiry';
const MAIL_TOKEN_KEY = 'nu_mail_token';
const MAIL_TOKEN_EXPIRY_KEY = 'nu_mail_token_expiry';

export interface GoogleTokenInfo {
  token: string;
  expiry: number;
}

// Save unified Google token (called during SSO login)
export const saveGoogleToken = (token: string, expiresIn: number = 3600): void => {
  if (typeof window === 'undefined') return;

  const expiryTime = Date.now() + expiresIn * 1000;
  safeSessionStorage.set(GOOGLE_TOKEN_KEY, token);
  safeSessionStorage.set(GOOGLE_TOKEN_EXPIRY_KEY, expiryTime.toString());

  // Also save to Drive and Mail keys for compatibility
  safeSessionStorage.set(DRIVE_TOKEN_KEY, token);
  safeSessionStorage.set(DRIVE_TOKEN_EXPIRY_KEY, expiryTime.toString());
  safeSessionStorage.set(MAIL_TOKEN_KEY, token);
  safeSessionStorage.set(MAIL_TOKEN_EXPIRY_KEY, expiryTime.toString());
};

// Get stored Google token (checks validity with 5 min buffer)
export const getGoogleToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  const token = safeSessionStorage.get(GOOGLE_TOKEN_KEY);
  const expiry = safeSessionStorage.get(GOOGLE_TOKEN_EXPIRY_KEY);

  if (!token || !expiry) return null;

  // Check if token is expired (with 5 min buffer)
  if (Date.now() > parseInt(expiry) - 300000) {
    clearGoogleToken();
    return null;
  }

  return token;
};

// Clear all Google tokens
export const clearGoogleToken = (): void => {
  if (typeof window === 'undefined') return;

  // Clear unified token
  safeSessionStorage.remove(GOOGLE_TOKEN_KEY);
  safeSessionStorage.remove(GOOGLE_TOKEN_EXPIRY_KEY);

  // Clear Drive and Mail tokens
  safeSessionStorage.remove(DRIVE_TOKEN_KEY);
  safeSessionStorage.remove(DRIVE_TOKEN_EXPIRY_KEY);
  safeSessionStorage.remove(MAIL_TOKEN_KEY);
  safeSessionStorage.remove(MAIL_TOKEN_EXPIRY_KEY);
};

// Check if Google token exists and is valid
export const hasValidGoogleToken = (): boolean => {
  return getGoogleToken() !== null;
};

// Minimize exposure window (audit M-11): proactively wipe the broad-scope Google
// token from sessionStorage when the tab is closed or hidden, so it does not
// linger in JS-accessible storage beyond the active page. Idempotent — safe to
// call from multiple mount points; returns an unsubscribe function.
export const registerGoogleTokenCleanup = (): (() => void) => {
  if (typeof window === 'undefined') return () => {};

  const handler = (): void => clearGoogleToken();
  // `pagehide` covers tab close, navigation away, and bfcache; `beforeunload`
  // is the broader-support fallback for full unloads.
  window.addEventListener('pagehide', handler);
  window.addEventListener('beforeunload', handler);

  return () => {
    window.removeEventListener('pagehide', handler);
    window.removeEventListener('beforeunload', handler);
  };
};

// Get token expiry time in milliseconds
export const getGoogleTokenExpiry = (): number | null => {
  if (typeof window === 'undefined') return null;

  const expiry = safeSessionStorage.get(GOOGLE_TOKEN_EXPIRY_KEY);
  if (!expiry) return null;

  return parseInt(expiry);
};

// Combined scopes for SSO login
export const GOOGLE_SSO_SCOPES = [
  // Drive scopes
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  // Gmail scopes
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.modify',
  // Calendar scopes
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');
