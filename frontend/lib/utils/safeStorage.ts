/**
 * Safe wrappers around Web Storage that degrade gracefully when storage is
 * unavailable (SSR, Safari private mode, Storage quota exceeded, sandboxed
 * iframes, disabled cookies/storage in the browser, etc.).
 *
 * Wave-4 W4-A #2: callers should migrate from raw `localStorage`/`sessionStorage`
 * to `safeStorage` / `safeSessionStorage` to prevent unhandled exceptions and
 * silent data loss. This migration is intentionally NOT done in this sprint —
 * tracked as a follow-up.
 *
 * Behavior:
 *  - `get`: returns the stored value, or the in-memory fallback, or null.
 *  - `set`: writes through to Web Storage and returns true on success.
 *           On failure, falls back to an in-memory map and returns false so
 *           callers can show "your changes won't persist" hints if needed.
 *  - `remove`: clears both Web Storage and the in-memory fallback.
 */

const localFallback = new Map<string, string>();
const sessionFallback = new Map<string, string>();

function hasLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function hasSessionStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
  } catch {
    return false;
  }
}

export const safeStorage = {
  get(key: string): string | null {
    try {
      if (hasLocalStorage()) {
        const v = window.localStorage.getItem(key);
        if (v !== null) return v;
      }
    } catch {
      // fall through to in-memory map
    }
    return localFallback.get(key) ?? null;
  },

  set(key: string, value: string): boolean {
    try {
      if (hasLocalStorage()) {
        window.localStorage.setItem(key, value);
        // Mirror to fallback so subsequent reads stay consistent if storage
        // is wiped between calls (Safari private-mode quirk).
        localFallback.set(key, value);
        return true;
      }
    } catch {
      // QuotaExceeded, SecurityError, etc. — fall through.
    }
    localFallback.set(key, value);
    return false;
  },

  remove(key: string): void {
    try {
      if (hasLocalStorage()) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // ignore — best-effort
    }
    localFallback.delete(key);
  },
};

export const safeSessionStorage = {
  get(key: string): string | null {
    try {
      if (hasSessionStorage()) {
        const v = window.sessionStorage.getItem(key);
        if (v !== null) return v;
      }
    } catch {
      // fall through to in-memory map
    }
    return sessionFallback.get(key) ?? null;
  },

  set(key: string, value: string): boolean {
    try {
      if (hasSessionStorage()) {
        window.sessionStorage.setItem(key, value);
        sessionFallback.set(key, value);
        return true;
      }
    } catch {
      // QuotaExceeded, SecurityError, etc. — fall through.
    }
    sessionFallback.set(key, value);
    return false;
  },

  remove(key: string): void {
    try {
      if (hasSessionStorage()) {
        window.sessionStorage.removeItem(key);
      }
    } catch {
      // ignore — best-effort
    }
    sessionFallback.delete(key);
  },
};
