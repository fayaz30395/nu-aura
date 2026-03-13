'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

interface DarkModeContextType {
  isDark: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (isDark: boolean) => void;
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

const STORAGE_KEY = 'nu-aura-theme';

export const DarkModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDarkState] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize from localStorage or system preference
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check localStorage first
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    let initialDarkMode = false;

    if (savedTheme !== null) {
      initialDarkMode = savedTheme === 'dark';
    } else {
      // Fall back to system preference
      initialDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    setIsDarkState(initialDarkMode);
    applyTheme(initialDarkMode);
    setMounted(true);
  }, []);

  // Apply theme to DOM
  const applyTheme = (isDarkMode: boolean) => {
    if (typeof window === 'undefined') return;

    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  };

  // Set dark mode directly (useCallback to prevent recreating on every render)
  const setDarkMode = useCallback((isDarkMode: boolean) => {
    setIsDarkState(isDarkMode);
    applyTheme(isDarkMode);

    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, isDarkMode ? 'dark' : 'light');
    }
  }, []);

  // Toggle dark mode (useCallback with isDark dependency)
  const toggleDarkMode = useCallback(() => {
    setDarkMode(!isDark);
  }, [isDark, setDarkMode]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      isDark,
      toggleDarkMode,
      setDarkMode,
    }),
    [isDark, toggleDarkMode, setDarkMode]
  );

  return (
    <DarkModeContext.Provider value={contextValue}>
      {children}
    </DarkModeContext.Provider>
  );
};

export const useDarkMode = (): DarkModeContextType => {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error('useDarkMode must be used within DarkModeProvider');
  }
  return context;
};
