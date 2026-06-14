'use client';

import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {type ThemeMode, useThemeStore} from '@/lib/stores/useThemeStore';

// ── Types ────────────────────────────────────────────────────────────
export type {ThemeMode};
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  /** User's chosen preference: light, dark, or system */
  theme: ThemeMode;
  /** The actual resolved theme applied to the DOM */
  resolvedTheme: ResolvedTheme;
  /** Convenience boolean — true when resolvedTheme === 'dark' */
  isDark: boolean;
  /** Set theme to light, dark, or system */
  setTheme: (mode: ThemeMode) => void;
  /** Legacy toggle: cycles light → dark → light */
  toggleDarkMode: () => void;
  /** Legacy setter — kept for backward compatibility */
  setDarkMode: (isDark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ── Helpers ──────────────────────────────────────────────────────────

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return getSystemTheme();
  return mode;
}

function applyToDOM(resolved: ResolvedTheme): void {
  if (typeof window === 'undefined') return;
  const html = document.documentElement;
  if (resolved === 'dark') {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }

  html.setAttribute('data-mantine-color-scheme', resolved);
  html.style.colorScheme = resolved;

  try {
    localStorage.setItem('mantine-color-scheme', resolved);
  } catch {
    // ignore persistence failures in restricted environments
  }
}

// ── Provider ─────────────────────────────────────────────────────────

/**
 * Theme preference state lives in `useThemeStore` (Zustand + persist).
 * This provider remains because:
 *   1. It owns the DOM side-effect — applying `.dark` to <html>.
 *   2. It owns the `prefers-color-scheme` media-query subscription when
 *      `mode === 'system'`.
 *   3. It exposes the legacy `useDarkMode` / `useTheme` context API used
 *      across the app (settings page, ThemeToggle, MantineThemeProvider).
 *
 * The persisted value still lives under the raw key `nu-aura-theme` (see
 * `useThemeStore.ts`) so the pre-hydration FOUC script in
 * `lib/theme/theme-script.ts` keeps working.
 */
export const DarkModeProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
  const theme = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(theme));

  // Apply DOM class whenever the chosen theme changes (and on mount, when
  // the persist middleware finishes rehydrating from localStorage).
  useEffect(() => {
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    applyToDOM(resolved);
  }, [theme]);

  // Listen for system theme changes when mode is 'system'
  useEffect(() => {
    if (theme !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const handler = (e: MediaQueryListEvent) => {
      const newResolved: ResolvedTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(newResolved);
      applyToDOM(newResolved);
    };

    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  // ── Public API ───────────────────────────────────────────────────

  const setTheme = useCallback((mode: ThemeMode) => {
    setMode(mode);
    // Apply immediately so callers see the DOM change synchronously
    // without waiting for the useEffect tick.
    const resolved = resolveTheme(mode);
    setResolvedTheme(resolved);
    applyToDOM(resolved);
  }, [setMode]);

  // Legacy: binary toggle (light ↔ dark). If currently 'system', resolve then toggle.
  const toggleDarkMode = useCallback(() => {
    const next: ThemeMode = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  // Legacy: direct boolean setter
  const setDarkMode = useCallback((isDark: boolean) => {
    setTheme(isDark ? 'dark' : 'light');
  }, [setTheme]);

  const isDark = resolvedTheme === 'dark';

  const contextValue = useMemo(
    () => ({
      theme,
      resolvedTheme,
      isDark,
      setTheme,
      toggleDarkMode,
      setDarkMode,
    }),
    [theme, resolvedTheme, isDark, setTheme, toggleDarkMode, setDarkMode]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// ── Hooks ────────────────────────────────────────────────────────────

/** Full theme hook — new API */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within DarkModeProvider');
  }
  return context;
};

/** Legacy hook — backward compatible. Same context, same provider. */
export const useDarkMode = (): ThemeContextType => {
  return useTheme();
};
