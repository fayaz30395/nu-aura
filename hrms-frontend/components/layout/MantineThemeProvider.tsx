'use client';

import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { useEffect, useState } from 'react';
import { theme } from '@/lib/theme/mantine-theme';
import { useDarkMode } from './DarkModeProvider';

interface MantineThemeProviderProps {
  children: React.ReactNode;
}

/**
 * Mantine Theme Provider that syncs with the existing DarkModeProvider.
 * This ensures both Tailwind's dark mode and Mantine's color scheme stay in sync.
 */
export function MantineThemeProvider({ children }: MantineThemeProviderProps) {
  const { isDark } = useDarkMode();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Return a loading state or the children without Mantine wrapper during SSR
  // to avoid hydration mismatch
  if (!mounted) {
    return (
      <MantineProvider theme={theme} defaultColorScheme="light">
        {children}
      </MantineProvider>
    );
  }

  return (
    <MantineProvider
      theme={theme}
      defaultColorScheme={isDark ? 'dark' : 'light'}
      forceColorScheme={isDark ? 'dark' : 'light'}
    >
      {children}
    </MantineProvider>
  );
}

/**
 * Color scheme script component to prevent flash of wrong theme.
 * Add this to your root layout's <head>.
 */
export function MantineColorSchemeScript() {
  return <ColorSchemeScript defaultColorScheme="auto" />;
}
