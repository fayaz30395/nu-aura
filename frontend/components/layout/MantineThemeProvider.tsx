'use client';

import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { theme } from '@/lib/theme/mantine-theme';
import { useDarkMode } from './DarkModeProvider';

interface MantineThemeProviderProps {
  children: React.ReactNode;
}

/**
 * Mantine Theme Provider - Synced with Tailwind's DarkModeProvider.
 */
export function MantineThemeProvider({ children }: MantineThemeProviderProps) {
  const { isDark } = useDarkMode();

  return (
    <MantineProvider
      theme={theme}
      forceColorScheme={isDark ? 'dark' : 'light'}
    >
      {children}
    </MantineProvider>
  );
}

/**
 * Color scheme script component - forces light mode.
 * Add this to your root layout's <head>.
 */
export function MantineColorSchemeScript() {
  return <ColorSchemeScript forceColorScheme="light" />;
}
