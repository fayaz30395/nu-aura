'use client';

import {ColorSchemeScript, MantineProvider} from '@mantine/core';
import {theme} from '@/lib/theme/mantine-theme';
import {useDarkMode} from './DarkModeProvider';

interface MantineThemeProviderProps {
  children: React.ReactNode;
}

/**
 * Mantine Theme Provider - Synced with DarkModeProvider.
 * Uses forceColorScheme to keep Mantine in sync with the resolved theme.
 */
export function MantineThemeProvider({children}: MantineThemeProviderProps) {
  const {resolvedTheme} = useDarkMode();

  return (
    // suppressHydrationWarning isolates Mantine's CSS-variable <style> injection from
    // React's hydration diff. MantineProvider renders a <style dangerouslySetInnerHTML>
    // whose content depends on the resolved colour scheme; on the very first render the
    // server and client may disagree by one frame (DarkModeProvider reads localStorage
    // only in useEffect), so we suppress the warning here rather than force a full
    // rehydration. The visual result is always correct because DarkModeProvider defaults
    // to 'dark' matching ColorSchemeScript defaultColorScheme="dark" in layout.tsx.
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
  return <ColorSchemeScript defaultColorScheme="dark"/>;
}
