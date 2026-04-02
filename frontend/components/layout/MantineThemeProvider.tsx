'use client';

import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { theme } from '@/lib/theme/mantine-theme';
import { useDarkMode } from './DarkModeProvider';

interface MantineThemeProviderProps {
  children: React.ReactNode;
}

/**
 * Mantine Theme Provider - Synced with DarkModeProvider.
 * Uses forceColorScheme to keep Mantine in sync with the resolved theme.
 */
export function MantineThemeProvider({ children }: MantineThemeProviderProps) {
  const { resolvedTheme } = useDarkMode();

  return (
    <div suppressHydrationWarning>
      <MantineProvider
        theme={theme}
        forceColorScheme={resolvedTheme}
      >
        {children}
      </MantineProvider>
    </div>
  );
}

/**
 * Color scheme script component.
 * We no longer force a specific scheme — the FOUC prevention script
 * in layout.tsx handles the initial class before React hydrates.
 * This Mantine script is kept for Mantine's internal SSR hydration.
 */
export function MantineColorSchemeScript() {
  return <ColorSchemeScript defaultColorScheme="dark" />;
}
