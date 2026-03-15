'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

// ── Types ────────────────────────────────────────────────────────────
export type ThemeMode = 'light' | 'dark' | 'system';
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

const STORAGE_KEY = 'nu-aura-theme';

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
}

function getSavedTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
  return 'system'; // default to system if nothing saved
}

// ── Provider ─────────────────────────────────────────────────────────

export const DarkModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

  // Initialize on mount — read from localStorage
  useEffect(() => {
    const saved = getSavedTheme();
    const resolved = resolveTheme(saved);

    setThemeState(saved);
    setResolvedTheme(resolved);
    applyToDOM(resolved);
  }, []);

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
    const resolved = resolveTheme(mode);

    setThemeState(mode);
    setResolvedTheme(resolved);
    applyToDOM(resolved);

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, mode);
    }
  }, []);

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
