'use client';

import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { theme } from '@/lib/theme/mantine-theme';

interface MantineThemeProviderProps {
  children: React.ReactNode;
}

/**
 * Mantine Theme Provider - Light mode only.
 */
export function MantineThemeProvider({ children }: MantineThemeProviderProps) {
  return (
    <MantineProvider
      theme={theme}
      defaultColorScheme="light"
      forceColorScheme="light"
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
