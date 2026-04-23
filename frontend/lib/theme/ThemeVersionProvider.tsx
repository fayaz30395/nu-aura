'use client';

import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';

export type ThemeVersion = 'v1' | 'v2';

interface ThemeVersionContextType {
  version: ThemeVersion;
  setVersion: (v: ThemeVersion) => void;
  toggleVersion: () => void;
}

const ThemeVersionContext = createContext<ThemeVersionContextType | undefined>(undefined);

const STORAGE_KEY = 'nu-aura-theme-version';
const HTML_CLASS = 'theme-v2';

function applyToDOM(version: ThemeVersion): void {
  if (typeof window === 'undefined') return;
  const html = document.documentElement;
  if (version === 'v2') html.classList.add(HTML_CLASS);
  else html.classList.remove(HTML_CLASS);
}

function readInitialVersion(): ThemeVersion {
  if (typeof window === 'undefined') return 'v1';
  try {
    const url = new URL(window.location.href);
    const q = url.searchParams.get('v2');
    if (q === '1') return 'v2';
    if (q === '0') return 'v1';
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'v2' || saved === 'v1') return saved;
  } catch {
    /* noop */
  }
  return 'v1';
}

export const ThemeVersionProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
  const [version, setVersionState] = useState<ThemeVersion>('v1');

  useEffect(() => {
    const initial = readInitialVersion();
    setVersionState(initial);
    applyToDOM(initial);
    try {
      localStorage.setItem(STORAGE_KEY, initial);
    } catch {
      /* noop */
    }
  }, []);

  const setVersion = useCallback((v: ThemeVersion) => {
    setVersionState(v);
    applyToDOM(v);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, v);
      } catch {
        /* noop */
      }
    }
  }, []);

  const toggleVersion = useCallback(() => {
    setVersion(version === 'v2' ? 'v1' : 'v2');
  }, [version, setVersion]);

  const value = useMemo(
    () => ({version, setVersion, toggleVersion}),
    [version, setVersion, toggleVersion]
  );

  return (
    <ThemeVersionContext.Provider value={value}>
      {children}
    </ThemeVersionContext.Provider>
  );
};

export function useThemeVersion(): ThemeVersion {
  const ctx = useContext(ThemeVersionContext);
  return ctx?.version ?? 'v1';
}

export function useThemeVersionControls(): ThemeVersionContextType {
  const ctx = useContext(ThemeVersionContext);
  if (!ctx) {
    throw new Error('useThemeVersionControls must be used within ThemeVersionProvider');
  }
  return ctx;
}
